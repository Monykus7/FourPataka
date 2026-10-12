import { defineFeature, fourierShape, MODULE_API_VERSION } from '../../index';
const experiments = [
  {
    id: 'square',
    title: 'Build a square',
    text: 'Keep odd harmonics with magnitudes 1/h.',
    kind: 'square',
  },
  {
    id: 'triangle',
    title: 'Soften the edges',
    text: 'Use 1/h² with alternating signs for a triangle.',
    kind: 'triangle',
  },
  {
    id: 'missing',
    title: 'The missing fundamental',
    text: 'Remove H1 from a square approximation while keeping the remaining harmonics.',
    kind: 'square',
  },
  {
    id: 'sub',
    title: 'Go an octave below',
    text: 'Add a quiet f₀/2 below the reference note.',
    kind: 'sine',
  },
] as const;
export const fourierLearning = defineFeature({
  id: 'fourpataka:feature/fourier-learning',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  label: 'Fourier source',
  author: 'Monykus7',
  attribution: 'FourPataka learning experiments',
  placement: 'learn',
  capabilities: ['instrument'],
  defaults: () => ({}),
  validateSettings(value) {
    if (!value || typeof value !== 'object' || Object.keys(value).length)
      throw new Error('Learning settings must be empty.');
  },
  view(snapshot) {
    const source = snapshot.analysis;
    return {
      description: 'Signed sine coefficients combine into a Fourier source.',
      cards: experiments.map((e) => ({
        title: e.title,
        text: e.text,
        action: { id: e.id, label: 'Load experiment' },
      })),
      metricsTitle: `Your source, measured · ${snapshot.referenceNote}`,
      metrics:
        source.supported && source.power > 0
          ? [
              { label: 'Power-weighted centroid', value: `${Math.round(source.centroidHz!)} Hz` },
              {
                label: 'Odd harmonic power · includes H1',
                value: `${Math.round(source.oddShare * 100)}%`,
              },
              { label: 'Subharmonic power share', value: `${Math.round(source.subShare * 100)}%` },
            ]
          : [],
      note: !source.supported
        ? 'Fourier descriptors are unavailable for this engine.'
        : source.power === 0
          ? 'Silence: no effective components. Centroid and power shares are undefined.'
          : 'Steady source coefficients before trim/envelope; these are not measured loudness or processed audio.',
      actions: [{ id: 'open', label: 'Open instrument' }],
    };
  },
  action(id) {
    if (id === 'open') return { type: 'open-instrument' };
    const e = experiments.find((e) => e.id === id);
    if (!e) throw new Error('Unknown learning experiment.');
    const sound = fourierShape(e.kind);
    if (id === 'missing') sound.harmonics[0] = 0;
    if (id === 'sub') {
      sound.undertonesEnabled = true;
      sound.undertones[0] = 0.25;
    }
    return { type: 'load-sound', sound, openUndertones: id === 'sub' };
  },
});
