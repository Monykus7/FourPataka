import { expect, it } from 'vitest';
import { sampleLevels, levelWindow } from '../../src/audio/levels';
it('measures sine RMS and crest factor from a complete 100ms window at both rates', () => {
  for (const rate of [44100, 48000]) {
    const { windowSamples, fftSize } = levelWindow(rate);
    expect(windowSamples).toBe(rate / 10);
    expect(fftSize).toBeGreaterThanOrEqual(windowSamples);
    const sine = Float32Array.from(
      { length: windowSamples },
      (_, i) => 0.5 * Math.sin((2 * Math.PI * 100 * i) / rate),
    );
    const levels = sampleLevels([sine, sine]);
    expect(levels.rms).toBeCloseTo(0.5 / Math.SQRT2, 7);
    expect(levels.rmsDb).toBeCloseTo(-9.0309, 4);
    expect(levels.crestDb).toBeCloseTo(3.0103, 3);
  }
});
it('preserves opposite-polarity stereo power and handles unequal channels and clipping', () => {
  const l = new Float32Array(4800).fill(0.5),
    r = new Float32Array(4800).fill(-0.5);
  expect(sampleLevels([l, r])).toMatchObject({ peak: 0.5, rms: 0.5, crestDb: 0, valid: true });
  expect(sampleLevels([l, new Float32Array(4800)]).rms).toBeCloseTo(0.5 / Math.SQRT2);
  expect(sampleLevels([new Float32Array([2, -2])]).peakDb).toBeCloseTo(6.0206);
});
it('omits undefined silence descriptors and flags invalid samples rather than pretending they are silence', () => {
  expect(sampleLevels([new Float32Array(32)])).toMatchObject({
    peak: 0,
    rms: 0,
    peakDb: null,
    rmsDb: null,
    crestDb: null,
    valid: true,
  });
  for (const channels of [
    [],
    [new Float32Array([NaN])],
    [new Float32Array([Infinity])],
    [new Float32Array(2), new Float32Array(1)],
  ])
    expect(sampleLevels(channels).valid).toBe(false);
  expect(levelWindow(384000).fftSize).toBe(32768);
  expect(() => levelWindow(NaN)).toThrow();
});
