import { components, dbToGain, type Sound } from '../core/music';

export interface Voice {
  envelope: GainNode;
  oscillators: OscillatorNode[];
  readonly end: number;
  update: (sound: Sound, solo?: string) => void;
  dispose: () => void;
}
interface Source {
  oscillator: OscillatorNode;
  gain: GainNode;
  retired: boolean;
}
const TRANSITION = 0.02;
// Explicitly anchor ramps even when the parameter previously had only a
// constant value. Otherwise a new ramp can interpolate from a much older event.
export function holdParameter(parameter: AudioParam, time: number) {
  const value = parameter.value;
  parameter.cancelAndHoldAtTime(time);
  parameter.setValueAtTime(value, time);
}

// Ordinary harmonics remain one PeriodicWave oscillator. Replacing its wave
// crossfades phase-aligned sources instead of restarting the note envelope.
// Fourier phase convention: https://www.w3.org/TR/webaudio-1.0/#waveform-generation
export function createVoice(
  context: BaseAudioContext,
  destination: AudioNode,
  sound: Sound,
  frequency: number,
  start: number,
  duration: number,
  solo?: string,
): Voice {
  const envelope = context.createGain();
  const trim = context.createGain();
  trim.gain.value = dbToGain(sound.trim);
  envelope.connect(trim);
  trim.connect(destination);
  const noteOff = start + duration;
  let end = noteOff + sound.release;
  let current = structuredClone(sound);
  let disposed = false;
  const oscillators: OscillatorNode[] = [];
  const sources = new Set<Source>();
  const harmonicSources = new Set<Source>();
  const subs = new Map<number, Source>();
  let harmonic: Source | null = null;
  let harmonicKey = '';
  const reached = Math.min(1, duration / sound.attack);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(reached, start + Math.min(sound.attack, duration));
  envelope.gain.setValueAtTime(reached, noteOff);
  envelope.gain.linearRampToValueAtTime(0, end);

  const source = (base: number, coefficients: number[], at: number, level: number): Source => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const real = new Float32Array(coefficients.length);
    const imag = new Float32Array(coefficients.length);
    coefficients.forEach((value, h) => {
      const phase = 2 * Math.PI * h * base * (at - start);
      real[h] = value * Math.sin(phase);
      imag[h] = value * Math.cos(phase);
    });
    oscillator.setPeriodicWave(
      context.createPeriodicWave(real, imag, { disableNormalization: true }),
    );
    oscillator.frequency.value = base;
    gain.gain.setValueAtTime(level, at);
    oscillator.connect(gain);
    gain.connect(envelope);
    const item = { oscillator, gain, retired: false };
    sources.add(item);
    oscillators.push(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      sources.delete(item);
      harmonicSources.delete(item);
      const index = oscillators.indexOf(oscillator);
      if (index >= 0) oscillators.splice(index, 1);
    };
    oscillator.start(at);
    oscillator.stop(end + 0.005);
    return item;
  };
  const setSources = (next: Sound, selection: string | undefined, initial: boolean) => {
    const at = Math.max(start, context.currentTime);
    const effective = components(next, frequency, context.sampleRate).filter(
      (p) => p.available && (!selection || p.label === selection),
    );
    const coefficients = new Array<number>(17).fill(0);
    effective
      .filter((p) => p.kind === 'harmonic')
      .forEach((p) => (coefficients[p.index + 1] = p.magnitude * p.polarity));
    const key = coefficients.join(',');
    if (key !== harmonicKey) {
      // Retarget unfinished crossfades too, preserving the total gain of shared
      // components when another edit arrives before the previous fade finishes.
      harmonicSources.forEach((previous) => {
        previous.retired = true;
        holdParameter(previous.gain.gain, at);
        previous.gain.gain.linearRampToValueAtTime(0, at + TRANSITION);
        previous.oscillator.stop(Math.min(end + 0.005, at + TRANSITION + 0.005));
      });
      harmonic = coefficients.some((v) => v !== 0)
        ? source(frequency, coefficients, at, initial ? 1 : 0)
        : null;
      if (harmonic && !initial) harmonic.gain.gain.linearRampToValueAtTime(1, at + TRANSITION);
      if (harmonic) harmonicSources.add(harmonic);
      harmonicKey = key;
    }
    next.undertones.forEach((_m, index) => {
      const magnitude =
        effective.find((p) => p.kind === 'undertone' && p.index === index)?.magnitude ?? 0;
      if (magnitude > 0 && !subs.has(index))
        subs.set(index, source(frequency / (index + 2), [0, 1], at, initial ? magnitude : 0));
      const sub = subs.get(index);
      if (sub && !initial) {
        holdParameter(sub.gain.gain, at);
        sub.gain.gain.linearRampToValueAtTime(magnitude, at + TRANSITION);
      }
    });
  };
  setSources(sound, solo, true);
  return {
    envelope,
    oscillators,
    get end() {
      return end;
    },
    update(next, selection) {
      const now = Math.max(start, context.currentTime);
      if (disposed || now >= end) return;
      if (next.attack !== current.attack || next.release !== current.release) {
        end = Math.max(now + TRANSITION, noteOff + next.release);
        holdParameter(envelope.gain, now);
        if (now < noteOff) {
          const level = Math.min(1, duration / next.attack);
          envelope.gain.linearRampToValueAtTime(
            level,
            Math.min(noteOff, Math.max(now + TRANSITION, start + Math.min(next.attack, duration))),
          );
          envelope.gain.setValueAtTime(level, noteOff);
        }
        envelope.gain.linearRampToValueAtTime(0, end);
        sources.forEach((s) => {
          if (!s.retired) s.oscillator.stop(end + 0.005);
        });
      }
      trim.gain.setTargetAtTime(dbToGain(next.trim), now, 0.01);
      setSources(next, selection, false);
      current = structuredClone(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      sources.forEach((s) => {
        try {
          s.oscillator.stop();
        } catch {
          /* already ended */
        }
        s.oscillator.disconnect();
        s.gain.disconnect();
      });
      sources.clear();
      harmonicSources.clear();
      subs.clear();
      oscillators.length = 0;
      envelope.disconnect();
      trim.disconnect();
    },
  };
}
