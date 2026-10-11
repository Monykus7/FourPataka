import type { Sound } from '../core/music';

const buffers = new WeakMap<BaseAudioContext, AudioBuffer>();
/** One deterministic, bounded white-noise second per context; no asset or network dependency. */
function noiseBuffer(context: BaseAudioContext) {
  let buffer = buffers.get(context);
  if (buffer) return buffer;
  buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x6d2b79f5;
  for (let i = 0; i < data.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    data[i] = (seed >>> 0) / 2147483648 - 1;
  }
  buffers.set(context, buffer);
  return buffer;
}

/** A voice-local hit envelope multiplies both the Fourier body and filtered noise. */
export function createPercussionSource(
  context: BaseAudioContext,
  destination: AudioNode,
  start: number,
  onEnded: () => void,
) {
  const input = context.createGain();
  input.connect(destination);
  let noise: AudioBufferSourceNode | undefined;
  let highpass: BiquadFilterNode | undefined;
  let lowpass: BiquadFilterNode | undefined;
  let level: GainNode | undefined;
  let disposed = false;
  const update = (
    sound: Sound,
    solo: string | undefined,
    at: number,
    end: number,
    initial = false,
  ) => {
    const hit = sound.percussion;
    // Editing a hit changes its decay at the original note age, never retriggers
    // the attack or the score clock. Absence preserves the legacy sustained path.
    const settle = initial ? at : at + 0.02;
    const amplitude = hit ? Math.exp(-(settle - start) / hit.decay) : 1;
    if (initial) input.gain.setValueAtTime(amplitude, at);
    else {
      input.gain.cancelAndHoldAtTime(at);
      input.gain.linearRampToValueAtTime(amplitude, settle);
    }
    if (hit) input.gain.setTargetAtTime(0, settle, hit.decay);
    const amount = solo ? 0 : (hit?.noise ?? 0);
    if (amount > 0 && !noise) {
      noise = context.createBufferSource();
      noise.buffer = noiseBuffer(context);
      noise.loop = true;
      highpass = context.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.Q.value = 0.707;
      lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.Q.value = 0.707;
      lowpass.frequency.value = Math.min(14000, context.sampleRate * 0.45);
      level = context.createGain();
      level.gain.value = 0;
      noise.connect(highpass).connect(lowpass).connect(level).connect(input);
      // The deterministic noise cursor follows note age even if enabled mid-note.
      noise.start(at, (at - start) % noise.buffer.duration);
      noise.onended = () => {
        noise?.disconnect();
        highpass?.disconnect();
        lowpass?.disconnect();
        level?.disconnect();
        onEnded();
      };
    }
    if (noise && highpass && level) {
      const cutoff = Math.min(hit?.highpass ?? 6500, context.sampleRate * 0.45);
      if (initial) {
        highpass.frequency.setValueAtTime(cutoff, at);
        level.gain.setValueAtTime(amount, at);
      } else {
        highpass.frequency.setTargetAtTime(cutoff, at, 0.01);
        level.gain.cancelAndHoldAtTime(at);
        level.gain.linearRampToValueAtTime(amount, at + 0.02);
      }
      noise.stop(end + 0.005);
    }
  };
  return {
    input,
    update,
    stop: (end: number) => noise?.stop(end + 0.005),
    dispose() {
      if (disposed) return;
      disposed = true;
      noise?.stop();
      noise?.disconnect();
      highpass?.disconnect();
      lowpass?.disconnect();
      level?.disconnect();
      input.disconnect();
    },
  };
}
