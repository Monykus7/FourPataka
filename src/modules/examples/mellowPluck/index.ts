import { defineFourierPreset, fourierShape } from '../../index';
/** Baked Fourier data: one contribution folder plus one assembly entry. */
export const mellowPluck = defineFourierPreset({
  id: 'example:instrument/mellow-pluck',
  apiVersion: 1,
  dataVersion: 1,
  libraryId: 'mellow-pluck',
  scoreKey: 'mellowPluck',
  label: 'Mellow pluck',
  templateVersion: 1,
  author: 'Monykus7',
  attribution: 'FourPataka bundled tutorial source; project license pending',
  tags: [],
  createSound() {
    const base = fourierShape('sine'),
      magnitudes = [1, 0.28, 0.14, 0.09, 0.045, 0.02];
    return {
      ...base,
      harmonics: base.harmonics.map((_, i) => magnitudes[i] ?? 0),
      polarity: base.polarity.map((_, i) => (i === 1 ? -1 : 1)),
      percussion: { noise: 0, highpass: 20, decay: 0.16 },
      attack: 0.008,
      release: 0.16,
      trim: -15,
    };
  },
});
