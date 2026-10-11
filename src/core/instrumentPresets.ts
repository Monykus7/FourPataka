import { LEGACY_HARMONIC_COUNT, mathematicalPreset, type Sound } from './music';

export function kickPreset(): Sound {
  const sound = mathematicalPreset('sine');
  // A low fundamental supplies the body; quiet upper partials add the beater.
  // Note duration still controls the gate: this is not a pitch/decay envelope.
  const magnitudes = [1, 0.32, 0.12, 0.07, 0.035, 0.018, 0.009];
  return {
    ...sound,
    harmonics: sound.harmonics.map((_, i) => magnitudes[i] ?? 0),
    attack: 0.005,
    release: 0.16,
  };
}

export function hiHatPreset(): Sound {
  const sound = mathematicalPreset('sine');
  // Sparse high partials give a metallic tick without a low pitched body.
  // They remain integer harmonics, not noise or an inharmonic cymbal model.
  const partials = new Map([
    [13, 0.55],
    [17, 0.44],
    [19, 0.36],
    [23, 0.32],
    [29, 0.25],
    [31, 0.21],
  ]);
  return {
    ...sound,
    harmonics: sound.harmonics.map((_, i) => partials.get(i + 1) ?? 0),
    polarity: sound.polarity.map((_, i) => ([17, 23, 31].includes(i + 1) ? -1 : 1)),
    attack: 0.005,
    release: 0.035,
    trim: -15,
  };
}

export function snarePreset(): Sound {
  const sound = mathematicalPreset('sine');
  // A small low body under a dense upper bank approximates a snare's rattle.
  // Deterministic signs spread the waveform's peaks; audio stays unnormalized.
  const body = [0.48, 0.2, 0.12, 0.07];
  return {
    ...sound,
    harmonics: sound.harmonics.map((_, i) =>
      i < 4 ? body[i] : i < 8 ? 0 : 0.1 + ((i * 7) % 9) * 0.013,
    ),
    polarity: sound.polarity.map((_, i) => (i >= 8 && (i * 5) % 7 < 3 ? -1 : 1)),
    attack: 0.005,
    release: 0.09,
    trim: -18,
  };
}

// Bundled source metadata, not the planned M3 public preset-module registry.
export const PERCUSSION_PRESETS = [
  {
    id: 'kick',
    key: 'kick',
    label: 'Kick',
    version: 1,
    createSound: kickPreset,
    note: 'C2',
    noteBeats: 0.125,
    hint: 'Low body + beater · try C1–C2, short notes',
  },
  {
    id: 'hi-hat',
    key: 'hiHat',
    label: 'Closed hi-hat',
    version: 1,
    createSound: hiHatPreset,
    note: 'C4',
    noteBeats: 0.0625,
    hint: 'Metallic high partials · try C4–C5, very short notes',
  },
  {
    id: 'snare',
    key: 'snare',
    label: 'Snare',
    version: 1,
    createSound: snarePreset,
    note: 'D3',
    noteBeats: 0.125,
    hint: 'Low body + bright rattle · try C3–D3, short notes',
  },
] as const;

export function createPercussionPresets(): Template[] {
  return PERCUSSION_PRESETS.map(({ id, key, label, version, createSound }) => ({
    id,
    key,
    label,
    version,
    sound: createSound(),
  }));
}

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
