export const HARMONIC_COUNT = 32;
export const LEGACY_HARMONIC_COUNT = 16;
export const DURATIONS: Record<string, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  '8th': 0.5,
  '16th': 0.25,
  '32nd': 0.125,
  '64th': 0.0625,
};
export const SCORE_KEY = /^[A-Za-z][A-Za-z0-9_]*$/;
export const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
export const dbToGain = (db: number) => 10 ** (db / 20);
export const coefficientDb = (magnitude: number) =>
  magnitude === 0 ? '−∞' : (20 * Math.log10(magnitude)).toFixed(1);

export function pitch(note: string): { midi: number; frequency: number; name: string } {
  const match = /^([A-G])([#b]?)([0-8])$/.exec(note);
  if (!match) throw new Error(`Invalid pitch “${note}”. Use C0–B8, with optional # or b.`);
  const semitones: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi =
    (Number(match[3]) + 1) * 12 +
    semitones[match[1]] +
    (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
  if (midi < 12 || midi > 119) throw new Error(`Pitch “${note}” resolves outside C0–B8.`);
  return { midi, frequency: 440 * 2 ** ((midi - 69) / 12), name: note };
}

export interface Sound {
  waveformPoints?: import('./waveform').WavePoint[];
  harmonics: number[];
  polarity: number[];
  undertones: number[];
  undertonesEnabled: boolean;
  attack: number;
  release: number;
  trim: number;
}
export type WavePreset = 'sine' | 'square' | 'saw' | 'triangle';
export type HarmonicPolarity = 1 | -1;

export function setHarmonicPolarity(
  sound: Sound,
  index: number,
  polarity: HarmonicPolarity,
): Sound {
  if (!Number.isInteger(index) || index < 0 || index >= sound.harmonics.length)
    throw new Error('Choose an existing harmonic.');
  if (polarity !== 1 && polarity !== -1) throw new Error('Polarity must be +1 or −1.');
  if (sound.polarity[index] === polarity) return sound;
  // Sign is independent of strength, including silent partials. Copy the bank
  // so an editor change cannot mutate another snapshot or library template.
  return { ...sound, polarity: sound.polarity.map((value, i) => (i === index ? polarity : value)) };
}
export function mathematicalPreset(kind: WavePreset): Sound {
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

export interface Component {
  kind: 'harmonic' | 'undertone';
  index: number;
  label: string;
  frequency: number;
  magnitude: number;
  polarity: number;
  available: boolean;
}
export function components(sound: Sound, fundamental: number, sampleRate = 48000): Component[] {
  return [
    ...sound.harmonics.map((magnitude, i) => ({
      kind: 'harmonic' as const,
      index: i,
      label: `H${i + 1}`,
      frequency: fundamental * (i + 1),
      magnitude,
      polarity: sound.polarity[i],
      available: fundamental * (i + 1) < sampleRate / 2,
    })),
    ...sound.undertones.map((magnitude, i) => ({
      kind: 'undertone' as const,
      index: i,
      label: `f₀/${i + 2}`,
      frequency: fundamental / (i + 2),
      magnitude: sound.undertonesEnabled ? magnitude : 0,
      polarity: 1,
      available: fundamental / (i + 2) < sampleRate / 2,
    })),
  ];
}
export function sourceSamples(sound: Sound, fundamental: number, sampleRate = 48000, length = 600) {
  const seconds = (sound.undertonesEnabled ? 6 : 2) / fundamental;
  const partials = components(sound, fundamental, sampleRate).filter(
    (p) => p.available && p.magnitude > 0,
  );
  const values = Array.from(
    { length },
    (_, i) =>
      partials.reduce(
        (sum, p) =>
          sum +
          p.polarity *
            p.magnitude *
            Math.sin((2 * Math.PI * p.frequency * seconds * i) / (length - 1)),
        0,
      ) * dbToGain(sound.trim),
  );
  return { values, seconds };
}
export interface Macros {
  falloff: number;
  brightness: number;
  oddEven: number;
  subWeight: number;
}
export const NEUTRAL_MACROS: Macros = { falloff: 0, brightness: 0, oddEven: 0, subWeight: 1 };
export function transform(baseline: Sound, m: Macros): Sound {
  // Retain the H16 brightness reference so migrated lower-bank timbres stay identical.
  return {
    ...structuredClone(baseline),
    harmonics: baseline.harmonics.map((b, i) =>
      clamp(
        b *
          (i + 1) ** -m.falloff *
          2 ** ((m.brightness * i) / 15) *
          (1 + (i % 2 === 0 ? m.oddEven : -m.oddEven)),
        0,
        1,
      ),
    ),
    undertones: baseline.undertones.map((b) => clamp(b * m.subWeight, 0, 1)),
  };
}
export function descriptors(sound: Sound, fundamental: number, sampleRate = 48000) {
  const active = components(sound, fundamental, sampleRate).filter(
    (c) => c.available && c.magnitude > 0,
  );
  const power = active.reduce((sum, c) => sum + c.magnitude ** 2, 0);
  const oddPower = active
    .filter((c) => c.kind === 'harmonic' && c.index % 2 === 0)
    .reduce((s, c) => s + c.magnitude ** 2, 0);
  const subPower = active
    .filter((c) => c.kind === 'undertone')
    .reduce((s, c) => s + c.magnitude ** 2, 0);
  return {
    power,
    centroid: power ? active.reduce((s, c) => s + c.frequency * c.magnitude ** 2, 0) / power : null,
    oddShare: power ? oddPower / power : 0,
    subShare: power ? subPower / power : 0,
  };
}
