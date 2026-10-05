export const EXPORT_MEMORY_LIMIT = 256 * 1024 * 1024;
export interface WavOptions {
  sampleRate: 44100 | 48000;
  channels: 1 | 2;
  tailSeconds: number;
}
export const DEFAULT_WAV_OPTIONS: WavOptions = { sampleRate: 48000, channels: 2, tailSeconds: 5 };

export function exportSize(seconds: number, voices: number, options: WavOptions) {
  if (
    ![44100, 48000].includes(options.sampleRate) ||
    ![1, 2].includes(options.channels) ||
    !Number.isFinite(options.tailSeconds) ||
    options.tailSeconds < 0 ||
    options.tailSeconds > 30 ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    !Number.isInteger(voices) ||
    voices < 0
  )
    throw new Error('Invalid WAV duration or format.');
  const frames = Math.ceil(seconds * options.sampleRate);
  const wavBytes = 44 + frames * options.channels * 2;
  // Float render + PCM + download/IPC copies, with a conservative allowance
  // for scheduled voice nodes. This is a preflight estimate, not a RAM promise.
  const memoryBytes = 16 * 1024 * 1024 + frames * options.channels * 12 + voices * 65536;
  if (!Number.isSafeInteger(frames) || memoryBytes > EXPORT_MEMORY_LIMIT)
    throw new Error(
      'Export exceeds the 256 MiB estimated memory limit. Shorten the score, choose mono/44.1 kHz, or reduce the tail limit.',
    );
  return { frames, seconds: frames / options.sampleRate, wavBytes, memoryBytes };
}

export function inspectSamples(channels: Float32Array[]) {
  let peak = 0,
    clipped = 0;
  for (const channel of channels)
    for (const sample of channel) {
      if (!Number.isFinite(sample))
        throw new Error('The rendered audio contains non-finite samples.');
      peak = Math.max(peak, Math.abs(sample));
      if (Math.abs(sample) > 1) clipped++;
    }
  return { peak, clipped };
}
export function wavGain(peak: number, levelDb: number, normalize: boolean) {
  if (
    !Number.isFinite(peak) ||
    peak < 0 ||
    !Number.isFinite(levelDb) ||
    levelDb < -36 ||
    levelDb > 0
  )
    throw new Error('Invalid export level.');
  // Normalization is opt-in and targets -1 dBFS. Silence stays silent.
  return normalize && peak > 0 ? 10 ** (-1 / 20) / peak : 10 ** (levelDb / 20);
}
export function encodeWav(channels: Float32Array[], sampleRate: number, gain = 1) {
  if (
    ![44100, 48000].includes(sampleRate) ||
    ![1, 2].includes(channels.length) ||
    !Number.isFinite(gain) ||
    gain < 0 ||
    channels.some((c) => c.length !== channels[0].length)
  )
    throw new Error('Invalid PCM audio.');
  const frames = channels[0].length;
  const bytes = frames * channels.length * 2;
  if (bytes + 44 > EXPORT_MEMORY_LIMIT) throw new Error('WAV file is too large.');
  const buffer = new ArrayBuffer(44 + bytes);
  const view = new DataView(buffer);
  const text = (at: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, bytes + 36, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels.length * 2, true);
  view.setUint16(32, channels.length * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, bytes, true);
  let offset = 44;
  for (let i = 0; i < frames; i++)
    for (const channel of channels) {
      const sample = channel[i] * gain;
      if (!Number.isFinite(sample)) throw new Error('Cannot encode non-finite audio.');
      const bounded = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, Math.round(bounded * (bounded < 0 ? 32768 : 32767)), true);
      offset += 2;
    }
  return buffer;
}
