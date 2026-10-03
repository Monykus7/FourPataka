import { mathematicalPreset, type Sound } from './music';

export function softBassPreset(): Sound {
  const sound = mathematicalPreset('sine');
  // A few quiet even/odd partials make a rounded, asymmetric bass source.
  // Keep the explicit trim; these are editable coefficients, not a normalized wave.
  const magnitudes = [1, 0.22, 0.1, 0.045, 0.02, 0.009];
  return {
    ...sound,
    harmonics: sound.harmonics.map((_, i) => magnitudes[i] ?? 0),
    attack: 0.03,
    release: 0.35,
  };
}

export function legacySoftBassPreset(): Sound {
  return { ...mathematicalPreset('triangle'), attack: 0.03, release: 0.35 };
}
