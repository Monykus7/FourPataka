import { LEGACY_HARMONIC_COUNT, mathematicalPreset, type Sound } from './music';

export function legacyKickPreset(): Sound {
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

export function kickPreset(): Sound {
  const base = mathematicalPreset('sine');
  const body = [1, 0.14, 0.045, 0.015];
  return {
    ...base,
    harmonics: base.harmonics.map((_, i) => body[i] ?? 0),
    percussion: {
      noise: 0.12,
      highpass: 3000,
      decay: 0.12,
      noiseDecay: 0.012,
      pitch: { amount: 24, decay: 0.025 },
    },
    attack: 0.005,
    release: 0.24,
    trim: -12,
  };
}

export function legacyHiHatPreset(): Sound {
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

export function hiHatPreset(): Sound {
  const legacy = legacyHiHatPreset();
  // Noise supplies the broadband sizzle; quiet upper partials retain a metallic edge.
  // The hit decays independently of written duration, while note-off can shorten it.
  return {
    ...legacy,
    harmonics: legacy.harmonics.map((level) => level * 0.08),
    percussion: { noise: 0.85, highpass: 6500, decay: 0.045 },
    trim: -12,
  };
}

export function legacySnarePreset(): Sound {
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

export function legacySnareV2Preset(): Sound {
  const base = mathematicalPreset('sine');
  const body = [0.6, 0.26, 0.08, 0.035];
  // A short tuned membrane body and longer broadband rattle have separate decay.
  return {
    ...base,
    harmonics: base.harmonics.map((_, i) => body[i] ?? 0),
    percussion: {
      noise: 0.8,
      highpass: 1200,
      decay: 0.045,
      noiseDecay: 0.09,
      pitch: { amount: 4, decay: 0.018 },
    },
    attack: 0.005,
    release: 0.18,
    trim: -12,
  };
}

export function snarePreset(): Sound {
  const base = mathematicalPreset('sine');
  // The membrane supports the wire rattle, rather than masking it with a bass
  // tone. A fixed noise band keeps the crack independent of the written pitch.
  const body = [0.18, 0.1, 0.07, 0.025];
  return {
    ...base,
    harmonics: base.harmonics.map((_, i) => body[i] ?? 0),
    percussion: { noise: 1, highpass: 700, lowpass: 7800, decay: 0.022, noiseDecay: 0.085 },
    attack: 0.005,
    release: 0.18,
    trim: -9,
  };
}

// Bundled source metadata, not the planned M3 public preset-module registry.
export const PERCUSSION_PRESETS = [
  {
    id: 'kick',
    key: 'kick',
    label: 'Kick',
    version: 2,
    createSound: kickPreset,
    note: 'C2',
    noteBeats: 0.5,
    hint: 'Falling pitch + low body + short beater · try C1–C2',
  },
  {
    id: 'hi-hat',
    key: 'hiHat',
    label: 'Closed hi-hat',
    version: 2,
    createSound: hiHatPreset,
    note: 'C4',
    noteBeats: 0.0625,
    hint: 'Filtered noise + metallic edge · 45 ms hit decay',
  },
  {
    id: 'snare',
    key: 'snare',
    label: 'Snare',
    version: 3,
    createSound: snarePreset,
    note: 'G3',
    noteBeats: 0.5,
    hint: 'Noise-led crack + wire rattle · quiet 22 ms body · try D3–G3',
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

export function upgradeDrumTemplate<T extends Template>(template: T): T {
  const definition = PERCUSSION_PRESETS.find(
    (preset) =>
      preset.id === template.id && preset.key === template.key && preset.label === template.label,
  );
  if (!definition || !['kick', 'snare'].includes(template.key)) return template;
  const legacy =
    template.version === 1
      ? template.key === 'kick'
        ? legacyKickPreset()
        : legacySnarePreset()
      : template.key === 'snare' && template.version === 2
        ? legacySnareV2Preset()
        : undefined;
  if (!legacy) return template;
  const keys = Object.keys(legacy) as (keyof Sound)[];
  if (
    Object.keys(template.sound).length !== keys.length ||
    !keys.every((key) => JSON.stringify(template.sound[key]) === JSON.stringify(legacy[key]))
  )
    return template;
  return { ...template, version: definition.version, sound: definition.createSound() };
}

export function upgradeHiHatTemplate<T extends Template>(template: T): T {
  if (
    template.id !== 'hi-hat' ||
    template.key !== 'hiHat' ||
    template.label !== 'Closed hi-hat' ||
    template.version !== 1
  )
    return template;
  const legacy = legacyHiHatPreset();
  const keys = Object.keys(legacy) as (keyof Sound)[];
  if (
    Object.keys(template.sound).length !== keys.length ||
    !keys.every((key) => JSON.stringify(template.sound[key]) === JSON.stringify(legacy[key]))
  )
    return template;
  // Upgrade library factories only. Owned tracks and A/B remain explicit user copies.
  return { ...template, version: 2, sound: hiHatPreset() };
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
