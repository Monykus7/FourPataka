import { describe, expect, it } from 'vitest';
import { decodeWav, WAV_IMPORT_LIMITS } from '../../src/core/wavImport';
import { reviewWav } from '../../src/core/wavReview';
import { encodeWav } from '../../src/core/wav';
import type { WavAnalysisOptions } from '../../src/core/wavNote';
import { dbToGain } from '../../src/core/music';
import { validateFourierSound } from '../../src/modules/foundation/fourier';
import { matchedGains } from '../../src/audio/wavReview';
import { noteWav, recordedNote } from '../fixtures/wavNote';

const analyze = (buffer: ArrayBuffer, options: WavAnalysisOptions = { channel: 'mix' }) =>
  reviewWav({ file: new File([buffer], 'fixture.wav'), options }, () => {});

describe('bounded W1 WAV decoder', () => {
  it('reads PCM8/16/24/32 and float samples with odd chunk padding', () => {
    for (const [bits, encoding] of [
      [8, 1],
      [16, 1],
      [24, 1],
      [32, 1],
      [32, 3],
    ]) {
      const width = bits / 8;
      const template = noteWav();
      const buffer = new ArrayBuffer(54 + width + (width % 2));
      const bytes = new Uint8Array(buffer);
      bytes.set(new Uint8Array(template, 0, 36));
      bytes.set([74, 85, 78, 75, 1, 0, 0, 0, 255, 0], 36); // JUNK chunk and padding.
      bytes.set([100, 97, 116, 97, width, 0, 0, 0], 46);
      const view = new DataView(buffer);
      view.setUint32(4, buffer.byteLength - 8, true);
      view.setUint16(20, encoding, true);
      view.setUint16(32, width, true);
      view.setUint16(34, bits, true);
      if (encoding === 3) view.setFloat32(54, -0.5, true);
      else if (bits === 8) view.setUint8(54, 64);
      else view.setUint8(54 + width - 1, 192);
      expect(decodeWav(buffer).channels[0][0]).toBe(-0.5);
    }
  });

  it('rejects malformed containers, unsupported encodings and resource limits', async () => {
    const valid = noteWav();
    expect(() => decodeWav(valid.slice(0, -2))).toThrow('Truncated');
    const view = new DataView(valid);
    view.setUint16(20, 6, true);
    expect(() => decodeWav(valid)).toThrow('uncompressed');
    view.setUint16(20, 1, true);
    view.setUint16(22, 3, true);
    expect(() => decodeWav(valid)).toThrow('mono or stereo');
    expect(() => decodeWav(new ArrayBuffer(WAV_IMPORT_LIMITS.bytes + 1))).toThrow('32 MiB');
    expect(() => decodeWav(encodeWav([new Float32Array(44100 * 30 + 1)], 44100))).toThrow(
      '30 seconds',
    );
    await expect(
      analyze(noteWav(), { channel: 'left', crop: { start: -1, end: 0.5 } }),
    ).rejects.toThrow('crop');
  });
});

describe('W1 single-note fit', () => {
  it.each([44100, 48000])(
    'fits reference frequency, relative signs and linear attack/release at %i Hz',
    async (rate) => {
      const result = await analyze(noteWav(rate), {
        channel: 'mix',
        onset: 0.08,
        noteOff: 0.45,
        body: { start: 0.16, end: 0.36 },
      });
      expect(result.error).toBeUndefined();
      const { fit, timing } = result;
      expect(fit!.frequency).toBeCloseTo(220, 0);
      expect(fit!.explainedEnergy).toBeGreaterThan(0.99);
      expect(timing!.onset).toBe(0.08);
      const { sound } = fit!;
      expect(sound.attack).toBeCloseTo(0.04, 1);
      expect(sound.release).toBeCloseTo(0.13, 1);
      expect(sound.polarity[0] * sound.polarity[2]).toBe(-1);
      expect(sound.polarity[1]).toBe(-1);
      const magnitude = (h: number) => sound.harmonics[h] * dbToGain(sound.trim);
      expect(magnitude(0)).toBeCloseTo(0.46, 2);
      expect(magnitude(1)).toBeCloseTo(0.19, 2);
      expect(magnitude(2)).toBeCloseTo(0.12, 2);
      expect(() => validateFourierSound(sound)).not.toThrow();
    },
  );

  it('keeps H32 and flags a weak fundamental without forcing an octave', async () => {
    const harmonics = Array<number>(32).fill(0);
    harmonics[1] = 0.35;
    harmonics[2] = 0.26;
    harmonics[31] = 0.18;
    const result = await analyze(encodeWav([recordedNote(48000, 193, harmonics)], 48000));
    expect(result.error).toBeUndefined();
    expect(result.fit!.frequency).toBeCloseTo(193, 0);
    expect(result.fit!.spectrum[31]).toBeCloseTo(0.18, 2);
    expect(result.fit!.warnings.join(' ')).toContain('octave');
    expect(result.fit!.explainedEnergy).toBeGreaterThan(0.95);
  });

  it('reports cancellation, permits channel and pitch overrides, and rejects silence or short bodies', async () => {
    const input = noteWav(48000, true);
    const silent = await analyze(input);
    expect(silent.error).toMatch(/silent/);
    expect(silent.warnings.join(' ')).toContain('cancellation');
    const left = await analyze(input, {
      channel: 'left',
      frequency: 220,
      crop: { start: 0.07, end: 0.6 },
      body: { start: 0.09, end: 0.24 },
      noteOff: 0.38,
    });
    expect(left.fit!.frequency).toBe(220);
    expect(left.offset).toBe(0.07);
    expect(left.timing!.noteOff).toBe(0.38);
    const short = await analyze(input, { channel: 'right', crop: { start: 0.1, end: 0.12 } });
    expect(short.error).toContain('body window');
  });

  it('recovers a simple pitched hit decay but refuses to invent pitch for a noise burst', async () => {
    const rate = 48000;
    let seed = 148;
    const samples = (sample: (i: number) => number) =>
      Float32Array.from({ length: rate }, (_, i) => {
        const time = i / rate - 0.04;
        return time < 0 ? 0 : Math.min(1, time / 0.015) * Math.exp(-time / 0.11) * sample(i);
      });
    const hit = await analyze(
      encodeWav([samples((i) => 0.6 * Math.sin((2 * Math.PI * i * 160) / rate))], rate),
    );
    expect(hit.error).toBeUndefined();
    expect(hit.fit!.sound.percussion?.decay).toBeCloseTo(0.11, 2);
    expect(hit.fit!.sound.percussion?.noise).toBe(0);
    const noise = await analyze(
      encodeWav(
        [
          samples(() => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 2147483648 - 1;
          }),
        ],
        rate,
      ),
    );
    expect(noise.fit).toBeUndefined();
    expect(noise.error).toContain('No reliable pitch');
  });

  it('reports discarded DC/inharmonic energy and clips, and bounds fitted level', async () => {
    const rate = 44100;
    const source = recordedNote(rate).map(
      (sample, i) => sample + 0.3 + 0.19 * Math.sin((2 * Math.PI * i * 377) / rate),
    );
    const result = await analyze(encodeWav([source], rate), {
      channel: 'mix',
      frequency: 220,
      body: { start: 0.14, end: 0.32 },
    });
    expect(result.fit!.explainedEnergy).toBeLessThan(0.75);
    expect(result.fit!.dc).toBeCloseTo(0.3, 2);
    expect(result.warnings.join(' ')).toContain('clipped');
    const sound = result.fit!.sound;
    expect(
      sound.harmonics.reduce((sum, n) => sum + n, 0) * dbToGain(sound.trim),
    ).toBeLessThanOrEqual(0.900001);
  });

  it('matches RMS with zero padding, preserves silent input and never boosts previews', () => {
    expect(matchedGains(new Float32Array([1, -1]), new Float32Array([0.2, -0.2, 0, 0]))).toEqual({
      original: expect.closeTo(0.2),
      reconstruction: 1,
    });
    expect(matchedGains(new Float32Array([0])).original).toBe(1);
  });
});
