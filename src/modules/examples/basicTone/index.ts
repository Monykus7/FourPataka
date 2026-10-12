import { defineEngine, MODULE_API_VERSION, dbToGain } from '../../index';

export interface BasicToneSettings {
  attack: number;
  release: number;
  trim: number;
  detune: number;
}
export const basicTone = defineEngine<BasicToneSettings>({
  id: 'example:engine/basic-tone',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  label: 'Basic Tone',
  author: 'Monykus7',
  attribution: 'FourPataka engine extension tutorial',
  minimumSampleRate: 3000,
  maximumSampleRate: 384000,
  supportsLive: true,
  supportsOffline: true,
  randomness: 'none',
  capabilities: {
    fourier: false,
    dotEditor: false,
    partialSolo: false,
    update: 'phase-continuous',
  },
  resources: { estimatedNodesPerVoice: 3, estimatedBytesPerVoice: 0 },
  defaults: () => ({ attack: 0.015, release: 0.25, trim: -12, detune: 0 }),
  validateSettings(value) {
    if (!value || typeof value !== 'object') throw new Error('Invalid Basic Tone settings.');
    const settings = value as Record<string, unknown>;
    if (Object.keys(settings).sort().join(',') !== 'attack,detune,release,trim')
      throw new Error('Unknown or missing Basic Tone setting.');
    for (const [key, low, high] of [
      ['attack', 0.005, 2],
      ['release', 0.01, 3],
      ['trim', -36, 0],
      ['detune', -1200, 1200],
    ] as const) {
      const n = settings[key];
      if (typeof n !== 'number' || !Number.isFinite(n) || n < low || n > high)
        throw new Error(`Invalid Basic Tone ${key}.`);
    }
  },
  create(note) {
    const { context, settings, startSeconds: start, durationSeconds: duration } = note;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const trim = context.createGain();
    const oscillators = [oscillator];
    const noteOff = start + duration;
    let end = noteOff + Math.min(settings.release, note.releaseLimitSeconds ?? settings.release);
    let current = settings;
    let disposed = false;
    oscillator.type = 'sine';
    oscillator.frequency.value = note.frequencyHz;
    oscillator.detune.value = settings.detune;
    trim.gain.value = dbToGain(settings.trim);
    oscillator.connect(envelope);
    envelope.connect(trim);
    trim.connect(note.destination);
    const reached = Math.min(1, duration / settings.attack);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(reached, start + Math.min(settings.attack, duration));
    envelope.gain.setValueAtTime(reached, noteOff);
    envelope.gain.linearRampToValueAtTime(0, end);
    const disconnect = () => {
      oscillator.onended = null;
      oscillator.disconnect();
      envelope.disconnect();
      trim.disconnect();
      oscillators.length = 0;
      disposed = true;
    };
    oscillator.onended = disconnect;
    oscillator.start(start);
    oscillator.stop(end + 0.005);
    return {
      envelope,
      oscillators,
      get end() {
        return end;
      },
      update(next) {
        const at = Math.max(start, context.currentTime);
        if (disposed || at >= end) return;
        // Retune the running oscillator; keeping it alive preserves accumulated phase.
        oscillator.detune.setTargetAtTime(next.detune, at, 0.01);
        trim.gain.setTargetAtTime(dbToGain(next.trim), at, 0.01);
        if (next.attack !== current.attack || next.release !== current.release) {
          end = Math.max(
            at + 0.02,
            noteOff + Math.min(next.release, note.releaseLimitSeconds ?? next.release),
          );
          // Hold the scheduled envelope at this audio time, including offline suspension.
          envelope.gain.cancelAndHoldAtTime(at);
          if (at < noteOff) {
            const level = Math.min(1, duration / next.attack);
            envelope.gain.linearRampToValueAtTime(
              level,
              Math.min(noteOff, Math.max(at + 0.02, start + Math.min(next.attack, duration))),
            );
            envelope.gain.setValueAtTime(level, noteOff);
          }
          envelope.gain.linearRampToValueAtTime(0, end);
          oscillator.stop(end + 0.005);
        }
        current = next;
      },
      steal(at) {
        if (disposed) return;
        envelope.gain.cancelAndHoldAtTime(at);
        envelope.gain.linearRampToValueAtTime(0, at + 0.01);
        end = at + 0.01;
        oscillator.stop(at + 0.015);
      },
      dispose() {
        if (disposed) return;
        try {
          oscillator.stop();
        } catch {
          /* already ended */
        }
        disconnect();
      },
    };
  },
});
