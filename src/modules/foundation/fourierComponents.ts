import type { FourierSound } from './fourier';
export const dbToGain = (db: number) => 10 ** (db / 20);
export interface Component {
  kind: 'harmonic' | 'undertone';
  index: number;
  label: string;
  frequency: number;
  magnitude: number;
  polarity: number;
  available: boolean;
}
export function components(
  sound: FourierSound,
  fundamental: number,
  sampleRate = 48000,
): Component[] {
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
