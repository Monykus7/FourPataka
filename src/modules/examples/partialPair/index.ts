import { defineFeature, fourierShape, MODULE_API_VERSION } from '../../index';
export const partialPair = defineFeature<{ h2: number }>({
  id: 'example:feature/partial-pair',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  label: 'Partial pair',
  author: 'Monykus7',
  attribution: 'FourPataka feature contributor example',
  placement: 'learn',
  capabilities: ['instrument', 'source', 'measurement'],
  parameters: {
    h2: {
      label: 'H2 strength',
      description: 'Second harmonic magnitude in the experiment',
      min: 0,
      max: 1,
      step: 0.01,
      unit: 'linear',
      defaultValue: 0.35,
      update: 'continuous',
    },
  },
  defaults: () => ({ h2: 0.35 }),
  validateSettings(value) {
    const data = value as { h2?: unknown };
    if (
      !data ||
      typeof data !== 'object' ||
      Object.keys(data).join(',') !== 'h2' ||
      typeof data.h2 !== 'number' ||
      !Number.isFinite(data.h2) ||
      data.h2 < 0 ||
      data.h2 > 1
    )
      throw new Error('Invalid Partial pair strength.');
  },
  commands: [
    {
      name: 'octave-pair',
      group: 'Events',
      scope: 'track',
      description: 'Two notes an octave apart',
      snippet: 'chord:(C4 C5) quarter',
      completionTemplate: 'chord:(${} ${}) ${}',
      syntax: 'chord:(<note> <note>) <duration>',
      rules:
        'Two explicit notes sound together. Change their pitches and duration after insertion.',
    },
  ],
  view(snapshot) {
    const m = snapshot.measurement;
    const db = (value: number) =>
      value > 0 ? `${(20 * Math.log10(value)).toFixed(1)} dBFS` : '−∞ dBFS';
    return {
      description:
        'Load a sine plus an adjustable second harmonic. Settings describe this experiment; Load applies them to the active snapshot.',
      metricsTitle: 'Live project output',
      metrics: [
        {
          label: 'Sample peak',
          value: m.valid === false ? 'Unavailable' : m.playing ? db(m.peak) : 'Stopped',
        },
        {
          label: 'RMS',
          value: m.valid === false ? 'Unavailable' : m.playing ? db(m.rms) : 'Stopped',
        },
        {
          label: 'Window',
          value: `${m.windowSamples} samples · ${((1000 * m.windowSamples) / m.sampleRateHz).toFixed(1)} ms`,
        },
      ],
      note: `Active output after its processing and project mix, before monitor volume. Sample peak is not true peak. Refresh ${m.cadenceMs} ms.${m.staleScore ? ' Playing the frozen previous score.' : ''}`,
      actions: [
        { id: 'load', label: 'Load partial pair' },
        {
          id: 'insert',
          label: 'Insert octave pair',
          disabled: !snapshot.sourceEditable || !snapshot.targetTrack,
        },
      ],
    };
  },
  action(id, snapshot, settings) {
    if (id === 'load') {
      const sound = fourierShape('sine');
      sound.harmonics[1] = settings.h2;
      return { type: 'load-sound', sound };
    }
    if (id === 'insert')
      return {
        type: 'insert-command',
        name: 'octave-pair',
        expectedRevision: snapshot.sourceRevision,
        targetTrack: snapshot.targetTrack,
        targetFile: snapshot.targetFile,
      };
    throw new Error('Unknown Partial pair action.');
  },
});
