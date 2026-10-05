import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WAV_OPTIONS,
  encodeWav,
  exportSize,
  inspectSamples,
  wavGain,
} from '../../src/core/wav';

describe('PCM WAV and preflight limits', () => {
  it('writes interleaved signed 16-bit PCM with a consistent RIFF header', () => {
    const buffer = encodeWav(
      [new Float32Array([-1, 0.5, 1]), new Float32Array([1, 0, -0.5])],
      44100,
    );
    const view = new DataView(buffer);
    expect(new TextDecoder().decode(buffer.slice(0, 4))).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(buffer.byteLength - 8);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(28, true)).toBe(176400);
    expect(view.getUint32(40, true)).toBe(12);
    expect([44, 46, 48, 50, 52, 54].map((at) => view.getInt16(at, true))).toEqual([
      -32768, 32767, 16384, 0, 32767, -16384,
    ]);
  });
  it('reports peaks without replacing gain and normalizes only explicitly', () => {
    expect(inspectSamples([new Float32Array([0, 2, -1.5])])).toEqual({ peak: 2, clipped: 2 });
    expect(wavGain(2, 0, false)).toBe(1);
    expect(wavGain(2, -6, false)).toBeCloseTo(10 ** (-6 / 20));
    expect(wavGain(2, 0, true) * 2).toBeCloseTo(10 ** (-1 / 20));
    expect(wavGain(0, 0, true)).toBe(1);
    expect(new DataView(encodeWav([new Float32Array([2])], 48000)).getInt16(44, true)).toBe(32767);
    expect(() => inspectSamples([new Float32Array([NaN])])).toThrow(/non-finite/);
  });
  it('rejects oversized renders and invalid formats before allocation', () => {
    expect(exportSize(1.234, 2, DEFAULT_WAV_OPTIONS).frames).toBe(59232);
    expect(() => exportSize(3600, 0, DEFAULT_WAV_OPTIONS)).toThrow(/256 MiB/);
    expect(() => exportSize(1, 10000, DEFAULT_WAV_OPTIONS)).toThrow(/256 MiB/);
    expect(() => exportSize(1, 1, { ...DEFAULT_WAV_OPTIONS, tailSeconds: 31 })).toThrow(/Invalid/);
    expect(() => encodeWav([new Float32Array(1), new Float32Array(2)], 48000)).toThrow(/Invalid/);
  });
});
