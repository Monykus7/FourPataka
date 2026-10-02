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
    // Odd reflection removes cosine terms. Sine orthogonality on [0, pi]
    // supplies the factor 2; interval spacing normalizes the sampled integral.
    return clamp((2 * sum) / intervals, -1, 1);
  });
}

export function soundFromWaveform(sound: Sound, halfCycle: readonly number[]): Sound {
  const coefficients = waveformCoefficients(halfCycle, sound.harmonics.length);
  const { waveformPoints: _points, ...rest } = sound;
  return {
    ...rest,
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

export interface WavePoint {
  /** Position within the editable half-cycle, 0–1. */
  x: number;
  y: number;
}

export function validateWavePoints(points: unknown): asserts points is WavePoint[] {
  if (!Array.isArray(points) || points.length < 3 || points.length > 32)
    throw new Error('Waveform requires 3–32 points.');
  points.forEach((point, i) => {
    if (
      !point ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.x > 1 ||
      Math.abs(point.y) > 16 ||
      (i > 0 && point.x - points[i - 1].x < 0.005 - 1e-10)
    )
      throw new Error('Invalid waveform point position or amplitude.');
  });
  if (points[0].x !== 0 || points[0].y !== 0 || points.at(-1)!.x !== 1 || points.at(-1)!.y !== 0)
    throw new Error('Waveform endpoints must be fixed at zero.');
}

// Shape-preserving cubic Hermite interpolation: flat tangents at turns and
// weighted harmonic-mean tangents elsewhere avoid overshoot between anchors.
export function waveformFromPoints(points: readonly WavePoint[], length = 257) {
  validateWavePoints(points);
  if (!Number.isInteger(length) || length < 3) throw new Error('Invalid sample count.');
  const gaps = points.slice(1).map((p, i) => p.x - points[i].x);
  const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / gaps[i]);
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return slopes.at(-1)!;
    const left = slopes[i - 1],
      right = slopes[i];
    // A sign change is a local extremum: a zero tangent keeps the interpolated
    // curve inside neighboring anchor amplitudes instead of overshooting.
    if (left * right <= 0) return 0;
    const w1 = 2 * gaps[i] + gaps[i - 1],
      w2 = gaps[i] + 2 * gaps[i - 1];
    return (w1 + w2) / (w1 / left + w2 / right);
  });
  let segment = 0;
  return Array.from({ length }, (_, i) => {
    const x = i / (length - 1);
    while (segment < points.length - 2 && x > points[segment + 1].x) segment++;
    const a = points[segment],
      b = points[segment + 1],
      h = gaps[segment];
    const t = (x - a.x) / h;
    // Hermite's basis uses segment-local t; tangents are measured per x.
    // Multiplying derivatives by h preserves units on uneven dot gaps.
    return (
      (2 * t ** 3 - 3 * t ** 2 + 1) * a.y +
      (t ** 3 - 2 * t ** 2 + t) * h * tangents[segment] +
      (-2 * t ** 3 + 3 * t ** 2) * b.y +
      (t ** 3 - t ** 2) * h * tangents[segment + 1]
    );
  });
}

export function soundFromPoints(sound: Sound, points: WavePoint[]): Sound {
  return {
    ...soundFromWaveform(sound, waveformFromPoints(points)),
    waveformPoints: structuredClone(points),
  };
}

export function resetWaveform(sound: Sound): Sound {
  const { waveformPoints: _points, ...rest } = sound;
  return {
    ...rest,
    harmonics: sound.harmonics.map((_, i) => (i === 0 ? 1 : 0)),
    polarity: sound.polarity.map(() => 1),
  };
}

export function keepMatchingWavePoints(sound: Sound): Sound {
  if (!sound.waveformPoints) return sound;
  const projected = waveformCoefficients(waveformFromPoints(sound.waveformPoints));
  if (projected.every((v, i) => Math.abs(v - sound.harmonics[i] * sound.polarity[i]) < 1e-8))
    return sound;
  const { waveformPoints: _points, ...rest } = sound;
  return rest;
}
