export const WAV_IMPORT_LIMITS = {
  bytes: 32 * 1024 * 1024,
  seconds: 30,
  cropSeconds: 8,
  minRate: 8000,
  maxRate: 96000,
} as const;

export interface ImportedWav {
  sampleRate: number;
  channels: Float32Array[];
}

export function decodeWav(bytes: ArrayBuffer): ImportedWav {
  if (bytes.byteLength > WAV_IMPORT_LIMITS.bytes)
    throw new Error('Choose a WAV file up to 32 MiB.');
  const view = new DataView(bytes);
  const tag = (at: number) => String.fromCharCode(...new Uint8Array(bytes, at, 4));
  if (view.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE')
    throw new Error('Expected a little-endian RIFF WAV file.');
  const end = 8 + view.getUint32(4, true);
  if (end < 12 || end > bytes.byteLength) throw new Error('Truncated WAV container.');
  let format: { offset: number; size: number } | undefined;
  let data: { offset: number; size: number } | undefined;
  let chunks = 0;
  for (let at = 12; at < end;) {
    if (at + 8 > end || ++chunks > 4096) throw new Error('Invalid WAV chunk table.');
    const size = view.getUint32(at + 4, true);
    const offset = at + 8;
    const next = offset + size + (size % 2);
    if (next > end) throw new Error('Truncated WAV chunk.');
    if (tag(at) === 'fmt ' && !format) format = { offset, size };
    if (tag(at) === 'data' && !data) data = { offset, size };
    at = next;
  }
  if (!format || format.size < 16 || !data?.size)
    throw new Error('WAV requires a format and non-empty audio data.');
  const at = format.offset;
  let encoding = view.getUint16(at, true);
  const channels = view.getUint16(at + 2, true);
  const sampleRate = view.getUint32(at + 4, true);
  const align = view.getUint16(at + 12, true);
  const bits = view.getUint16(at + 14, true);
  if (encoding === 0xfffe && format.size >= 40 && view.getUint16(at + 16, true) >= 22) {
    // Extensible PCM stores valid bits left-aligned in the declared container.
    const valid = view.getUint16(at + 18, true);
    const subtype = view.getUint32(at + 24, true);
    const guidSuffix = [0, 0, 16, 0, 128, 0, 0, 170, 0, 56, 155, 113];
    if (
      valid > 0 &&
      valid <= bits &&
      (subtype !== 3 || valid === 32) &&
      guidSuffix.every((byte, i) => view.getUint8(at + 28 + i) === byte)
    )
      encoding = subtype;
  }
  if (!((encoding === 1 && [8, 16, 24, 32].includes(bits)) || (encoding === 3 && bits === 32)))
    throw new Error('Use uncompressed 8/16/24/32-bit PCM or 32-bit float WAV.');
  if (channels !== 1 && channels !== 2) throw new Error('Use a mono or stereo WAV.');
  if (sampleRate < WAV_IMPORT_LIMITS.minRate || sampleRate > WAV_IMPORT_LIMITS.maxRate)
    throw new Error('Use a sample rate between 8 and 96 kHz.');
  const stride = bits / 8;
  if (align !== channels * stride || data.size % align !== 0)
    throw new Error('Invalid WAV frame alignment.');
  const frames = data.size / align;
  if (frames > sampleRate * WAV_IMPORT_LIMITS.seconds)
    throw new Error('Choose a WAV recording up to 30 seconds.');
  const read =
    encoding === 3
      ? (offset: number) => view.getFloat32(offset, true)
      : bits === 8
        ? (offset: number) => (view.getUint8(offset) - 128) / 128
        : bits === 16
          ? (offset: number) => view.getInt16(offset, true) / 32768
          : bits === 24
            ? (offset: number) =>
                ((view.getUint16(offset, true) << 8) | (view.getInt8(offset + 2) << 24)) /
                2147483648
            : (offset: number) => view.getInt32(offset, true) / 2147483648;
  return {
    sampleRate,
    channels: Array.from({ length: channels }, (_, channel) => {
      const samples = new Float32Array(frames);
      for (let i = 0, offset = data.offset + channel * stride; i < frames; i++, offset += align) {
        const sample = read(offset);
        if (!Number.isFinite(sample)) throw new Error('WAV contains non-finite samples.');
        // Keep the input's amplitude and count overloads during analysis.
        if (Math.abs(sample) > 32) throw new Error('WAV float samples exceed the supported level.');
        samples[i] = sample;
      }
      return samples;
    }),
  };
}

export type WavChannel = 'mix' | 'left' | 'right';

export function wavSample(wav: ImportedWav, channel: WavChannel, frame: number) {
  const [left, right] = wav.channels;
  if (!right || channel === 'left') return left[frame];
  return channel === 'right' ? right[frame] : (left[frame] + right[frame]) / 2;
}
