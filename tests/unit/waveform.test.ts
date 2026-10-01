import { expect, it } from 'vitest';
import { mathematicalPreset } from '../../src/core/music';
import {
  harmonicShape,
  soundFromWaveform,
  waveformCoefficients,
  waveformFromPoints,
  soundFromPoints,
  resetWaveform,
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
it('projects silence and bounds coefficients without normalizing the entire sound', () => {
  expect(waveformCoefficients([0, 0, 0])).toEqual(Array(16).fill(0));
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
  expect(reset.harmonics).toEqual([1, ...Array(15).fill(0)]);
  expect(reset.polarity).toEqual(Array(16).fill(1));
  expect(reset.undertones).toEqual(source.undertones);
  expect(reset.undertonesEnabled).toBe(true);
  expect(reset.trim).toBe(source.trim);
  expect(reset.attack).toBe(source.attack);
  expect(reset.waveformPoints).toBeUndefined();
});
