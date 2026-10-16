export interface SampleLevels {
  peak: number;
  rms: number;
  peakDb: number | null;
  rmsDb: number | null;
  crestDb: number | null;
  valid: boolean;
}
export const silentLevels = (): SampleLevels => ({
  peak: 0,
  rms: 0,
  peakDb: null,
  rmsDb: null,
  crestDb: null,
  valid: true,
});

/** Channel energy is averaged, never downmixed: opposite polarities must not cancel. */
export function sampleLevels(channels: readonly Float32Array[]): SampleLevels {
  const count = channels[0]?.length ?? 0;
  const invalid = () => ({ ...silentLevels(), valid: false });
  if (!count || channels.some((channel) => channel.length !== count)) return invalid();
  let sum = 0,
    peak = 0;
  for (const channel of channels)
    for (const value of channel) {
      if (!Number.isFinite(value)) return invalid();
      sum += value * value;
      peak = Math.max(peak, Math.abs(value));
    }
  const rms = Math.sqrt(sum / (channels.length * count));
  return {
    peak,
    rms,
    valid: true,
    peakDb: peak ? 20 * Math.log10(peak) : null,
    rmsDb: rms ? 20 * Math.log10(rms) : null,
    crestDb: rms ? 20 * Math.log10(peak / rms) : null,
  };
}

export function levelWindow(sampleRate: number) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0)
    throw new Error('Invalid meter sample rate.');
  const windowSamples = Math.min(32768, Math.max(32, Math.round(sampleRate * 0.1)));
  return { windowSamples, fftSize: 2 ** Math.ceil(Math.log2(windowSamples)) };
}
