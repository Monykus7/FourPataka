export const HARMONIC_COUNT = 32;
export const LEGACY_HARMONIC_COUNT = 16;
export interface FourierPoint {
  x: number;
  y: number;
}
export type WavePreset = 'sine' | 'square' | 'saw' | 'triangle';
export interface FourierSound {
  /** Optional aperiodic hit: linear noise level, high-pass Hz, e-fold decay seconds. */
  percussion?: {
    noise: number;
    highpass: number;
    lowpass?: number; // Hz; omission retains the original 14000 Hz noise ceiling.
    decay: number;
    noiseDecay?: number;
    pitch?: { amount: number; decay: number };
  };
  waveformPoints?: FourierPoint[];
  harmonics: number[];
  polarity: number[];
  undertones: number[];
  undertonesEnabled: boolean;
  attack: number;
  release: number;
  trim: number;
}
export function fourierShape(kind: WavePreset): FourierSound {
  return {
    harmonics: Array.from({ length: HARMONIC_COUNT }, (_, i) => {
      const h = i + 1;
      if (kind === 'sine') return i === 0 ? 1 : 0;
      if (kind === 'saw') return 1 / h;
      if (h % 2 === 0) return 0;
      return kind === 'square' ? 1 / h : 1 / h ** 2;
    }),
    polarity: Array.from({ length: HARMONIC_COUNT }, (_, i) =>
      kind === 'triangle' && i % 4 === 2 ? -1 : 1,
    ),
    undertones: [0, 0, 0, 0, 0],
    undertonesEnabled: false,
    attack: 0.015,
    release: 0.25,
    trim: -12,
  };
}
function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a project object.');
}
function numeric(
  value: unknown,
  low: number,
  high: number,
  label: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high)
    throw new Error(`Invalid ${label}: expected ${low}–${high}.`);
}
export function validateWavePoints(
  points: unknown,
  maxAmplitude = HARMONIC_COUNT,
): asserts points is FourierPoint[] {
  if (!Array.isArray(points) || points.length < 3 || points.length > 32)
    throw new Error('Waveform requires 3–32 points.');
  points.forEach((point, i) => {
    if (
      !point ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < 0 ||
      point.x > 1 ||
      Math.abs(point.y) > maxAmplitude ||
      (i > 0 && point.x - points[i - 1].x < 0.005 - 1e-10)
    )
      throw new Error('Invalid waveform point position or amplitude.');
  });
  if (points[0].x !== 0 || points[0].y !== 0 || points.at(-1)!.x !== 1 || points.at(-1)!.y !== 0)
    throw new Error('Waveform endpoints must be fixed at zero.');
}

export function validateFourierSound(
  value: unknown,
  count = HARMONIC_COUNT,
): asserts value is FourierSound {
  record(value);
  if (value.percussion !== undefined) {
    record(value.percussion);
    numeric(value.percussion.noise, 0, 1, 'noise level');
    numeric(value.percussion.highpass, 20, 16000, 'noise high-pass Hz');
    if (value.percussion.lowpass !== undefined)
      numeric(value.percussion.lowpass, 20, 16000, 'noise low-pass Hz');
    numeric(value.percussion.decay, 0.01, 2, 'hit decay seconds');
    if (value.percussion.noiseDecay !== undefined)
      numeric(value.percussion.noiseDecay, 0.005, 2, 'noise decay seconds');
    if (value.percussion.pitch !== undefined) {
      record(value.percussion.pitch);
      numeric(value.percussion.pitch.amount, 0, 48, 'pitch drop semitones');
      numeric(value.percussion.pitch.decay, 0.005, 0.5, 'pitch decay seconds');
    }
  }
  if (value.waveformPoints !== undefined) validateWavePoints(value.waveformPoints, count);
  for (const [name, size] of [
    ['harmonics', count],
    ['undertones', 5],
    ['polarity', count],
  ] as const) {
    const array = value[name];
    if (!Array.isArray(array) || array.length !== size)
      throw new Error(`${name} must have ${size} values.`);
    array.forEach((n) =>
      name === 'polarity'
        ? n === 1 || n === -1
          ? undefined
          : (() => {
              throw new Error('Polarity must be +1 or −1.');
            })()
        : numeric(n, 0, 1, name),
    );
  }
  if (typeof value.undertonesEnabled !== 'boolean')
    throw new Error('Invalid undertone enable state.');
  numeric(value.attack, 0.005, 2, 'attack');
  numeric(value.release, 0.01, 3, 'release');
  numeric(value.trim, -36, 0, 'output trim');
}
