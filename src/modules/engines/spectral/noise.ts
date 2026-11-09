export function splitSpectralNoise(sampleRate: number) {
  const alpha = (hz: number) =>
    1 - Math.exp((-2 * Math.PI * Math.min(hz, sampleRate * 0.4)) / sampleRate);
  const a = alpha(750);
  const b = alpha(3500);
  let low = 0,
    upper = 0;
  // Reused scratch space keeps the worker's window loop allocation-free.
  const bands = [0, 0, 0];
  return (sample: number) => {
    low += a * (sample - low);
    upper += b * (sample - upper);
    bands[0] = low;
    bands[1] = upper - low;
    bands[2] = sample - upper;
    return bands;
  };
}

const cache = new WeakMap<BaseAudioContext, AudioBuffer>();

export function spectralNoiseBuffer(context: BaseAudioContext) {
  const existing = cache.get(context);
  if (existing) return existing;
  const length = Math.round(context.sampleRate);
  const buffer = context.createBuffer(3, length, context.sampleRate);
  for (let band = 0; band < 3; band++) {
    let seed = 0x736e6473 + band * 0x01232111;
    const split = splitSpectralNoise(context.sampleRate);
    const output = buffer.getChannelData(band);
    let power = 0;
    for (let i = -512; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const sample = split(seed / 2147483648 - 1)[band];
      if (i >= 0) {
        output[i] = sample;
        power += sample * sample;
      }
    }
    // Each lane's gain has RMS units. Independent deterministic streams avoid
    // phase cancellation where the broad residual bands overlap.
    const rms = Math.sqrt(power / length);
    for (let i = 0; i < length; i++) output[i] /= rms;
  }
  cache.set(context, buffer);
  return buffer;
}
