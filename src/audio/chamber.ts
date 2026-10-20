import {
  ACOUSTICS_DEFAULTS,
  ACOUSTICS_TAIL,
  validateAcoustics,
  type InstrumentAcoustics,
} from '../modules/foundation/acoustics';

export const CHAMBER_RESOURCES = { nodes: 25, memoryBytes: 393216 };
export const CHAMBER_RATIOS = [1, 1.31, 1.73, 2.11] as const;

/** One destination's polyphonic body, before pedals. No per-note/shared buffers. */
function createChamberProcessor(context: BaseAudioContext, initial?: InstrumentAcoustics) {
  const input = context.createGain(),
    dry = context.createGain(),
    output = context.createGain();
  input.connect(dry).connect(output);
  const owned: AudioNode[] = [input, dry, output];
  let wet: GainNode | undefined, gate: GainNode | undefined;
  const combs: {
    delay: DelayNode;
    filter: BiquadFilterNode;
    feedback: GainNode;
    feed: GainNode;
  }[] = [];
  let previous: InstrumentAcoustics | undefined;
  let disposed = false;
  let tail = 0;
  function update(settings: InstrumentAcoustics = { ...ACOUSTICS_DEFAULTS }) {
    validateAcoustics(settings);
    if (disposed || JSON.stringify(settings) === JSON.stringify(previous)) return;
    const now = context.currentTime;
    const first = !previous;
    const smooth = (parameter: AudioParam, value: number, immediate = first) => {
      if (immediate) parameter.value = value;
      else parameter.setTargetAtTime(value, now, 0.015);
    };
    let fresh = false;
    if (!wet && settings.enabled) {
      fresh = true;
      wet = context.createGain();
      gate = context.createGain();
      const sum = context.createGain();
      sum.gain.value = 0.25;
      input.connect(gate);
      sum.connect(wet).connect(output);
      owned.push(wet, gate, sum);
      for (const ratio of CHAMBER_RATIOS) {
        const delay = context.createDelay(0.05),
          filter = context.createBiquadFilter();
        const feedback = context.createGain(),
          feed = context.createGain();
        filter.type = 'lowpass';
        // Low-pass Q is in dB in Web Audio: -6.02dB gives linear Q=.5.
        filter.Q.value = 20 * Math.log10(0.5);
        gate.connect(feed).connect(delay).connect(filter);
        filter.connect(feedback).connect(delay);
        filter.connect(sum);
        // Initial targets are installed below before this graph processes audio.
        delay.delayTime.value = (settings.size * ratio) / 1000;
        combs.push({ delay, filter, feedback, feed });
        owned.push(delay, filter, feedback, feed);
      }
    }
    if (wet && gate) {
      for (let i = 0; i < combs.length; i++) {
        const c = combs[i],
          seconds = (settings.size * CHAMBER_RATIOS[i]) / 1000;
        // Feedback cycles add a render quantum in Chromium. This upper loop-time
        // allowance makes the requested -60dB decay conservative, including 3kHz.
        const cutoff = Math.min(settings.damping, context.sampleRate * 0.2);
        const gain = Math.pow(
          0.001,
          (seconds + 128 / context.sampleRate + 2 / (Math.PI * cutoff)) / (settings.decay / 1000),
        );
        smooth(c.delay.delayTime, seconds, first || fresh);
        // Below 0.2Fs, Q=.5 has nonnegative real poles and a unity-DC low-pass.
        smooth(c.filter.frequency, cutoff, first || fresh);
        smooth(c.feedback.gain, gain, first || fresh);
        smooth(c.feed.gain, 1 - gain, first || fresh);
      }
      smooth(wet.gain, settings.mix / 100, first || fresh);
      if (first || fresh) gate.gain.value = settings.enabled ? 1 : 0;
      else if (previous?.enabled !== settings.enabled) {
        gate.gain.cancelAndHoldAtTime(now);
        gate.gain.linearRampToValueAtTime(settings.enabled ? 1 : 0, now + 0.005);
      }
      // Never shorten cleanup after disabling or changing an already-warm body.
      if (settings.enabled && settings.mix > 0) tail = ACOUSTICS_TAIL;
    }
    smooth(dry.gain, settings.enabled ? 1 - settings.mix / 100 : 1);
    previous = { ...settings };
  }
  try {
    update(initial);
  } catch (error) {
    owned.forEach((n) => n.disconnect());
    throw error;
  }
  return {
    input,
    output,
    update,
    get tail() {
      return tail;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      owned.forEach((n) => n.disconnect());
    },
  };
}

/** Stable destination ports let score A/B replace body state without restarting voices. */
export function createChamber(context: BaseAudioContext, initial?: InstrumentAcoustics) {
  const input = context.createGain(),
    output = context.createGain();
  type Branch = {
    processor: ReturnType<typeof createChamberProcessor>;
    gain: GainNode;
    timer: ReturnType<typeof setTimeout> | null;
  };
  const branches = new Set<Branch>();
  let current: Branch,
    disposed = false,
    tail = 0;
  const retire = (branch: Branch) => {
    if (!branches.delete(branch)) return;
    if (branch.timer) clearTimeout(branch.timer);
    input.disconnect(branch.processor.input);
    branch.processor.dispose();
    branch.gain.disconnect();
  };
  const build = (settings?: InstrumentAcoustics, fade = false) => {
    const processor = createChamberProcessor(context, settings),
      gain = context.createGain();
    gain.gain.value = fade ? 0 : 1;
    input.connect(processor.input);
    processor.output.connect(gain).connect(output);
    const branch: Branch = { processor, gain, timer: null };
    if (fade) {
      const now = context.currentTime,
        at = now + 0.025;
      // Warm short reflections before crossfading; old and new buffers stay owned.
      for (const old of branches) {
        if (old.timer) clearTimeout(old.timer);
        old.gain.gain.cancelAndHoldAtTime(now);
        old.gain.gain.setValueAtTime(old.gain.gain.value, at);
        old.gain.gain.linearRampToValueAtTime(0, at + 0.02);
        const finish = () => {
          if (disposed || !branches.has(old)) return;
          // A suspended device clock must not retire an audible branch before
          // its scheduled crossfade. Stop still clears this timer immediately.
          if (context.currentTime >= at + 0.02) retire(old);
          else old.timer = setTimeout(finish, 25);
        };
        old.timer = setTimeout(finish, 65);
      }
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + 0.02);
    }
    branches.add(branch);
    current = branch;
    tail = Math.max(tail, processor.tail);
  };
  build(initial);
  return {
    input,
    output,
    update(settings?: InstrumentAcoustics) {
      if (disposed) return;
      current.processor.update(settings);
      tail = Math.max(tail, current.processor.tail);
    },
    replace(settings?: InstrumentAcoustics) {
      if (!disposed) build(settings, true);
    },
    get tail() {
      return tail;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const branch of [...branches]) retire(branch);
      input.disconnect();
      output.disconnect();
    },
  };
}
export type Chamber = ReturnType<typeof createChamber>;
