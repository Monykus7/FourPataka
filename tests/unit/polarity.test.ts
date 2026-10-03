import { expect, it } from 'vitest';
import { mathematicalPreset, setHarmonicPolarity, sourceSamples } from '../../src/core/music';
import { keepMatchingWavePoints, soundFromPoints } from '../../src/core/waveform';

it('changes only one signed coefficient without mutating the original sound or its magnitudes', () => {
  const original = mathematicalPreset('triangle');
  const next = setHarmonicPolarity(original, 2, 1);
  expect(original.polarity[2]).toBe(-1);
  expect(next.polarity[2]).toBe(1);
  expect(next.harmonics).toEqual(original.harmonics);
  expect(next.undertones).toEqual(original.undertones);
  expect(next.attack).toBe(original.attack);
  expect(next.trim).toBe(original.trim);
  const before = sourceSamples(original, 440);
  const after = sourceSamples(next, 440);
  after.values.forEach((value, i) => {
    const t = (before.seconds * i) / (before.values.length - 1);
    const delta =
      2 * original.harmonics[2] * Math.sin(2 * Math.PI * 1320 * t) * 10 ** (original.trim / 20);
    expect(value - before.values[i]).toBeCloseTo(delta, 10);
  });
});

it('keeps zero-magnitude partials silent while saving their chosen sign and rejects invalid selections', () => {
  const original = mathematicalPreset('sine');
  const next = setHarmonicPolarity(original, 1, -1);
  expect(next.harmonics[1]).toBe(0);
  expect(sourceSamples(next, 440)).toEqual(sourceSamples(original, 440));
  expect(setHarmonicPolarity(next, 1, -1)).toBe(next);
  expect(() => setHarmonicPolarity(original, 16, -1)).toThrow('existing');
  expect(() => setHarmonicPolarity(original, -1, -1)).toThrow('existing');
  expect(() => setHarmonicPolarity(original, 1, 0 as -1)).toThrow('Polarity');
});

it('a sign edit invalidates stale dot geometry through the normal source-edit reconciliation', () => {
  const source = soundFromPoints(mathematicalPreset('sine'), [
    { x: 0, y: 0 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0 },
  ]);
  const changed = keepMatchingWavePoints(setHarmonicPolarity(source, 0, -1));
  expect(changed.waveformPoints).toBeUndefined();
  expect(source.waveformPoints).toHaveLength(3);
});
