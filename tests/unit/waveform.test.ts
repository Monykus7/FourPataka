import { expect, it } from 'vitest';
import { mathematicalPreset } from '../../src/core/music';
import {
  keepMatchingWavePoints,
  harmonicShape,
  soundFromWaveform,
  waveformCoefficients,
  waveformFromPoints,
  soundFromPoints,
  resetWaveform,
  insertWavePoint,
} from '../../src/core/waveform';

it('recovers signed sine coefficients from a sampled half cycle', () => {
  const sound = mathematicalPreset('triangle');
  const samples = Array.from({ length: 257 }, (_, i) => harmonicShape(sound, i / 512));
  const result = soundFromWaveform(sound, samples);
  sound.harmonics.forEach((value, i) => {
    expect(result.harmonics[i]).toBeCloseTo(value, 10);
    if (value) expect(result.polarity[i]).toBe(sound.polarity[i]);
  });
  expect(result.trim).toBe(sound.trim);
  expect(result.undertones).toEqual(sound.undertones);
});

it('inserts an independent anchor on the curve in the widest gap, preserving bounds', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 0.25, y: 1 },
    { x: 1, y: 0 },
  ];
  const inserted = insertWavePoint(points)!;
  expect(inserted.index).toBe(2);
  expect(inserted.points[2].x).toBe(0.625);
  expect(inserted.points[2].y).toBeCloseTo(waveformFromPoints(points, 9)[5], 12);
  expect(inserted.points[2].y).toBeGreaterThan(0);
  inserted.points[1].y = -1;
  expect(points[1].y).toBe(1);
  let next = points;
  while (next.length < 32) next = insertWavePoint(next)!.points;
  expect(insertWavePoint(next)).toBeNull();
  expect(() => waveformFromPoints(next)).not.toThrow();
  expect(next[0]).toEqual({ x: 0, y: 0 });
  expect(next.at(-1)).toEqual({ x: 1, y: 0 });
});
it('projects silence and bounds coefficients without normalizing the entire sound', () => {
  expect(waveformCoefficients([0, 0, 0])).toEqual(Array(32).fill(0));
  expect(
    waveformCoefficients(
      Array.from({ length: 257 }, (_, i) => 4 * Math.sin((Math.PI * i) / 256)),
    )[0],
  ).toBe(1);
  expect(() => waveformCoefficients([0, NaN, 0])).toThrow();
});

it('interpolates point anchors smoothly without overshoot and keeps fixed endpoints', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 0.25, y: 1 },
    { x: 0.5, y: -0.5 },
    { x: 1, y: 0 },
  ];
  const wave = waveformFromPoints(points);
  expect(wave[0]).toBe(0);
  expect(wave[64]).toBe(1);
  expect(wave[128]).toBe(-0.5);
  expect(wave[256]).toBe(0);
  expect(Math.max(...wave)).toBe(1);
  expect(Math.min(...wave)).toBe(-0.5);
  // Both sides of the peak have near-zero slope.
  expect(Math.abs(wave[63] - wave[64])).toBeLessThan(0.002);
  expect(Math.abs(wave[65] - wave[64])).toBeLessThan(0.002);
  expect(() =>
    waveformFromPoints([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ]),
  ).toThrow();
});
it('saves independent point geometry and resets only the harmonic bank', () => {
  const source = mathematicalPreset('saw');
  source.undertonesEnabled = true;
  source.undertones[0] = 0.3;
  const points = [
    { x: 0, y: 0 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0 },
  ];
  const edited = soundFromPoints(source, points);
  points[1].y = 0;
  expect(edited.waveformPoints![1].y).toBe(1);
  const reset = resetWaveform(edited);
  expect(reset.harmonics).toEqual([1, ...Array(31).fill(0)]);
  expect(reset.polarity).toEqual(Array(32).fill(1));
  expect(reset.undertones).toEqual(source.undertones);
  expect(reset.undertonesEnabled).toBe(true);
  expect(reset.trim).toBe(source.trim);
  expect(reset.attack).toBe(source.attack);
  expect(reset.waveformPoints).toBeUndefined();
});

it('harmonic edits discard stale geometry while level and envelope edits keep it', () => {
  const sound = soundFromPoints(mathematicalPreset('sine'), [
    { x: 0, y: 0 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0 },
  ]);
  expect(keepMatchingWavePoints({ ...sound, trim: -18 }).waveformPoints).toEqual(
    sound.waveformPoints,
  );
  const next = { ...sound, harmonics: sound.harmonics.map(() => 0) };
  expect(keepMatchingWavePoints(next).waveformPoints).toBeUndefined();
  const drawn = soundFromWaveform(sound, Array(257).fill(0));
  expect(drawn.waveformPoints).toBeUndefined();
});
