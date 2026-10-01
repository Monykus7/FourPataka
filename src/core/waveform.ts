import { clamp, type Sound } from './music';

// A half-cycle defines an odd periodic waveform, matching our signed sine bank.
export function waveformCoefficients(halfCycle: readonly number[], count = 16) {
  const intervals = halfCycle.length - 1;
  if (intervals < 2 || halfCycle.some((v) => !Number.isFinite(v)))
    throw new Error('A waveform needs at least three finite samples.');
  return Array.from({ length: count }, (_, index) => {
    const h = index + 1;
    let sum = 0;
    for (let i = 1; i < intervals; i++)
      sum += halfCycle[i] * Math.sin((Math.PI * h * i) / intervals);
    return clamp((2 * sum) / intervals, -1, 1);
  });
}

export function soundFromWaveform(sound: Sound, halfCycle: readonly number[]): Sound {
  const coefficients = waveformCoefficients(halfCycle, sound.harmonics.length);
  return {
    ...sound,
    harmonics: coefficients.map(Math.abs),
    polarity: coefficients.map((value) => (value < 0 ? -1 : 1)),
  };
}

export function harmonicShape(sound: Sound, phase: number) {
  return sound.harmonics.reduce(
    (sum, value, i) => sum + value * sound.polarity[i] * Math.sin(2 * Math.PI * (i + 1) * phase),
    0,
  );
}
