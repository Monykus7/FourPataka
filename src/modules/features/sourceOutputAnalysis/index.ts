import { defineFeature, MODULE_API_VERSION } from '../../index';

export const sourceOutputAnalysis = defineFeature({
  id: 'fourpataka:feature/source-output-analysis',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  label: 'Source / output analysis',
  author: 'Monykus7',
  attribution: 'FourPataka source descriptors and channel-aware output measurements',
  placement: 'instrument',
  capabilities: ['measurement'],
  collapsedByDefault: true,
  defaults: () => ({}),
  validateSettings(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length)
      throw new Error('Analysis settings must be empty.');
  },
  view(snapshot) {
    const source = snapshot.analysis,
      details = source.details,
      m = snapshot.measurement;
    const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
    const sourceMetrics = !source.supported
      ? [{ label: 'Source state', value: 'Unavailable for this engine' }]
      : !details
        ? [{ label: 'Source state', value: 'Detailed descriptors unavailable' }]
        : !source.power
          ? [{ label: 'Source state', value: 'Zero periodic components' }]
          : [
              { label: 'Power-weighted centroid', value: `${source.centroidHz!.toFixed(1)} Hz` },
              { label: 'Odd harmonic power · includes H1', value: percent(source.oddShare) },
              { label: 'Even harmonic power', value: percent(details.evenShare) },
              { label: 'H1 power contribution', value: percent(details.h1Share) },
              { label: 'Subharmonic power share', value: percent(source.subShare) },
              {
                label: 'Dominant source component',
                value: `${details.dominantLabel} · ${details.dominantHz!.toFixed(1)} Hz`,
              },
              {
                label: 'Mean-square source power',
                value: `${details.meanSquare.toPrecision(4)} amplitude²`,
              },
              { label: 'Effective components', value: String(details.componentCount) },
            ];
    const available = m.valid !== false && m.channels !== undefined;
    const state = !m.playing
      ? 'Stopped'
      : !available
        ? 'Unavailable'
        : !m.peak && !m.rms
          ? 'Silence'
          : 'Measuring';
    const outputMetrics = [
      { label: 'Output state', value: state },
      {
        label: 'Playback path',
        value:
          m.mode === 'score'
            ? 'Whole score'
            : m.mode === 'audition'
              ? 'Instrument audition'
              : 'No active playback',
      },
      {
        label: 'Measurement window',
        value: `${m.windowSamples} samples/channel · ${((1000 * m.windowSamples) / m.sampleRateHz).toFixed(1)} ms`,
      },
      {
        label: 'Channels / refresh',
        value: `${m.channels ?? 'Unknown'} channels · ${m.sampleRateHz} Hz · ${m.cadenceMs} ms refresh`,
      },
      ...(m.playing && available && m.rms > 0 && m.peak > 0
        ? [
            { label: 'RMS level', value: `${(20 * Math.log10(m.rms)).toFixed(1)} dBFS` },
            { label: 'Sample peak', value: `${(20 * Math.log10(m.peak)).toFixed(1)} dBFS` },
            { label: 'Crest factor', value: `${(20 * Math.log10(m.peak / m.rms)).toFixed(1)} dB` },
          ]
        : []),
    ];
    return {
      description:
        'Steady source coefficients and live processed audio are different measurements.',
      metricGroups: [
        {
          title: `Source model · ${snapshot.referenceNote}`,
          metrics: sourceMetrics,
          note: `Active editable A/B instrument at the reference note, before trim and envelope. Only enabled periodic components below Nyquist are included.${details?.partialModel ? ' Hit noise, pitch sweep and decay are excluded; this is a partial model of this instrument.' : ''}`,
        },
        {
          title: 'Live output',
          metrics: outputMetrics,
          note: `After active processing and project mix, before monitor volume. RMS averages channel energies; peak is the largest absolute sample on either channel. dBFS uses full-scale amplitude 1. Sample peak is not true peak or LUFS.${m.staleScore ? ' Playing the frozen previous score; source editing does not change its applied instruments.' : ''}`,
        },
      ],
    };
  },
  action() {
    throw new Error('Analysis is read-only.');
  },
});
