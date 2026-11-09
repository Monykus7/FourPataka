export const SPECTRAL_ENGINE_ID = 'fourpataka:engine/spectral';
export const SPECTRAL_TONES = 24;
export const SPECTRAL_HELD_FRAMES = 16;
export const SPECTRAL_RELEASE_FRAMES = 8;
export const SPECTRAL_NOISE_BANDS = ['Low noise', 'Mid noise', 'High noise'] as const;

export interface SpectralFrame {
  time: number;
  // Interleaved cosine/sine amplitudes in order of ratios, then three RMS noise levels.
  tones: number[];
  noise: number[];
}

export interface SpectralSettings {
  referenceHz: number;
  ratios: number[];
  held: SpectralFrame[];
  released: SpectralFrame[];
  timeScale: number;
  release: number;
  tone: number;
  noise: number;
  trim: number;
}

export const spectralControls = {
  timeScale: {
    label: 'Contour speed scale',
    description: 'Multiplier on elapsed seconds in the held contour',
    min: 0.25,
    max: 4,
    step: 0.05,
    unit: 'linear',
    defaultValue: 1,
    update: 'continuous',
  },
  release: {
    label: 'Release',
    description: 'Duration of the release contour after note-off',
    min: 0.01,
    max: 3,
    step: 0.01,
    unit: 's',
    defaultValue: 0.12,
    update: 'continuous',
  },
  tone: {
    label: 'Tonal level',
    description: 'Linear gain for harmonic and resonant tones',
    min: 0,
    max: 1,
    step: 0.01,
    unit: 'linear',
    defaultValue: 1,
    update: 'continuous',
  },
  noise: {
    label: 'Noise level',
    description: 'Linear gain for the three residual noise bands',
    min: 0,
    max: 1,
    step: 0.01,
    unit: 'linear',
    defaultValue: 1,
    update: 'continuous',
  },
  trim: {
    label: 'Output trim',
    description: 'Dry output level',
    min: -36,
    max: 0,
    step: 0.5,
    unit: 'dB',
    defaultValue: -12,
    update: 'continuous',
  },
} as const;

export function spectralFrame(time: number, count: number): SpectralFrame {
  return { time, tones: Array<number>(count * 2).fill(0), noise: [0, 0, 0] };
}

export function defaultSpectralSettings(): SpectralSettings {
  const tone = { tones: [0, 1], noise: [0, 0, 0] };
  return {
    referenceHz: 220,
    ratios: [1],
    held: [spectralFrame(0, 1), { time: 0.02, ...tone }],
    released: [{ time: 0, ...structuredClone(tone) }, spectralFrame(1, 1)],
    timeScale: 1,
    release: 0.12,
    tone: 1,
    noise: 1,
    trim: -12,
  };
}

const bounded = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;

export function validateSpectralSettings(value: unknown): asserts value is SpectralSettings {
  const settings = value as SpectralSettings | null;
  if (
    !settings ||
    Object.keys(settings).sort().join(',') !==
      'held,noise,ratios,referenceHz,release,released,timeScale,tone,trim'
  )
    throw new Error('Invalid evolving spectrum settings.');
  if (
    !bounded(settings.referenceHz, 30, 2000) ||
    !Array.isArray(settings.ratios) ||
    settings.ratios.length > SPECTRAL_TONES ||
    settings.ratios.some(
      (ratio, i) => !bounded(ratio, 0.015, 3200) || (i > 0 && ratio <= settings.ratios[i - 1]),
    )
  )
    throw new Error('Invalid evolving spectrum reference or tone ratios.');
  for (const [key, control] of Object.entries(spectralControls))
    if (!bounded(settings[key as keyof typeof spectralControls], control.min, control.max))
      throw new Error(`Invalid evolving spectrum ${control.label}.`);
  for (const [frames, maxCount, maxTime] of [
    [settings.held, SPECTRAL_HELD_FRAMES, 8],
    [settings.released, SPECTRAL_RELEASE_FRAMES, 1],
  ] as const) {
    if (
      !Array.isArray(frames) ||
      frames.length < 2 ||
      frames.length > maxCount ||
      frames.some(
        (frame, i) =>
          !frame ||
          Object.keys(frame).sort().join(',') !== 'noise,time,tones' ||
          !bounded(frame.time, 0, maxTime) ||
          (i > 0 && frame.time <= frames[i - 1].time) ||
          !Array.isArray(frame.tones) ||
          frame.tones.length !== settings.ratios.length * 2 ||
          frame.tones.some((n) => !bounded(n, -1, 1)) ||
          !Array.isArray(frame.noise) ||
          frame.noise.length !== 3 ||
          frame.noise.some((n) => !bounded(n, 0, 1)),
      )
    )
      throw new Error('Invalid evolving spectrum frames.');
    if (frames[0].time !== 0) throw new Error('The first frame must start at zero.');
  }
  const terminal = settings.released.at(-1)!;
  if (terminal.time !== 1 || terminal.tones.some(Boolean) || terminal.noise.some(Boolean))
    throw new Error('The release contour must end at zero.');
}
