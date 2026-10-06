import { LEGACY_HARMONIC_COUNT, mathematicalPreset, type Sound } from './music';

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
  const sound = mathematicalPreset('triangle');
  // Recognize only the historical 16-partial template after zero-padding migration.
  return {
    ...sound,
    harmonics: sound.harmonics.map((v, i) => (i < LEGACY_HARMONIC_COUNT ? v : 0)),
    polarity: sound.polarity.map((v, i) => (i < LEGACY_HARMONIC_COUNT ? v : 1)),
    attack: 0.03,
    release: 0.35,
  };
}

interface Template {
  id: string;
  key: string;
  label: string;
  version: number;
  sound: Sound;
}

export function upgradeSoftBassTemplate<T extends Template>(template: T): T {
  if (
    template.id !== 'soft-bass' ||
    template.key !== 'softBass' ||
    template.label !== 'Soft bass' ||
    template.version !== 1
  )
    return template;
  const legacy = legacySoftBassPreset();
  const keys = Object.keys(legacy) as (keyof Sound)[];
  if (
    Object.keys(template.sound).length !== keys.length ||
    !keys.every((key) => JSON.stringify(template.sound[key]) === JSON.stringify(legacy[key]))
  )
    return template;
  // Only the recognizable untouched factory template upgrades. Applied sounds
  // and A/B snapshots are owned copies and must never be rewritten here.
  return { ...template, version: 2, sound: softBassPreset() };
}
