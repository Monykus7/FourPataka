import { expect, it } from 'vitest';
import { mathematicalPreset } from '../../src/core/music';
import { harmonicShape, soundFromWaveform, waveformCoefficients } from '../../src/core/waveform';

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
