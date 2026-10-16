import { createEngineSound } from '../../src/core/engineSound';
import { expect, it } from 'vitest';
import { featureAnalysis } from '../../src/core/featureHost';
import { fourierShape, defineFeature, type FeatureSnapshot } from '../../src/modules';
import { sourceOutputAnalysis } from '../../src/modules/features/sourceOutputAnalysis/index';
import { fourierLearning } from '../../src/modules/features/fourierLearning/index';

const snapshot: FeatureSnapshot = {
  sourceRevision: 1,
  targetTrack: 'lead',
  targetFile: 'main',
  sourceEditable: true,
  referenceNote: 'A4',
  analysis: featureAnalysis(fourierShape('sine'), 440, 48000),
  measurement: {
    peak: 0.5,
    rms: 0.5 / Math.SQRT2,
    playing: true,
    mode: 'audition',
    sampleRateHz: 48000,
    windowSamples: 4800,
    cadenceMs: 50,
    positionSeconds: 1,
    staleScore: false,
    channels: 2,
    valid: true,
  },
};
it('source descriptors agree with known coefficients and exclude unavailable or disabled components', () => {
  const sound = fourierShape('sine');
  sound.harmonics[0] = 0.5;
  sound.harmonics[1] = 1;
  sound.polarity[1] = -1;
  let result = featureAnalysis(sound, 440, 48000);
  expect(result.power).toBe(1.25);
  expect(result.centroidHz).toBe(792);
  expect(result.details).toMatchObject({
    evenShare: 0.8,
    h1Share: 0.2,
    meanSquare: 0.625,
    dominantHz: 880,
    dominantLabel: 'H2',
    componentCount: 2,
  });
  sound.undertonesEnabled = true;
  sound.undertones[0] = 1;
  result = featureAnalysis(sound, 440, 48000);
  expect(result.details?.meanSquare).toBe(1.125);
  expect(result.oddShare + result.subShare + result.details!.evenShare).toBeCloseTo(1);
  expect(featureAnalysis(sound, 15000, 48000).details?.evenShare).toBe(0);
  sound.undertonesEnabled = false;
  sound.harmonics.fill(0);
  expect(featureAnalysis(sound, 440, 48000)).toMatchObject({
    power: 0,
    centroidHz: null,
    details: { meanSquare: 0, dominantHz: null, componentCount: 0 },
  });
});
it('reports defined levels only for valid non-silent running output and labels source limitations', () => {
  const model = sourceOutputAnalysis.view(snapshot, {});
  const output = model.metricGroups![1];
  expect(output.metrics.find((m) => m.label === 'RMS level')?.value).toBe('-9.0 dBFS');
  expect(output.metrics.find((m) => m.label === 'Crest factor')?.value).toBe('3.0 dB');
  for (const [patch, state] of [
    [{ playing: false }, 'Stopped'],
    [{ rms: 0, peak: 0 }, 'Silence'],
    [{ valid: false }, 'Unavailable'],
  ] as const) {
    const group = sourceOutputAnalysis.view(
      { ...snapshot, measurement: { ...snapshot.measurement, ...patch } },
      {},
    ).metricGroups![1];
    expect(group.metrics.find((m) => m.label === 'Output state')?.value).toBe(state);
    expect(group.metrics.some((m) => m.label === 'Crest factor' || m.label === 'RMS level')).toBe(
      false,
    );
  }
  const hit = fourierShape('sine');
  hit.percussion = { noise: 0.5, highpass: 1000, decay: 0.1 };
  expect(
    sourceOutputAnalysis.view({ ...snapshot, analysis: featureAnalysis(hit, 440, 48000) }, {})
      .metricGroups![0].note,
  ).toContain('partial model');
  const unavailable = featureAnalysis(createEngineSound('example:engine/basic-tone'), 440, 48000);
  expect(
    sourceOutputAnalysis.view({ ...snapshot, analysis: unavailable }, {}).metricGroups![0]
      .metrics[0].value,
  ).toContain('Unavailable');
});
it('adds undoable odd/even recipes without changing the four original experiment positions', () => {
  expect(
    fourierLearning
      .view(snapshot, {})
      .cards!.slice(0, 4)
      .map((c) => c.action.id),
  ).toEqual(['square', 'triangle', 'missing', 'sub']);
  for (const id of ['odd', 'even']) {
    const action = fourierLearning.action(id, snapshot, {});
    expect(action.type).toBe('load-sound');
    if (action.type !== 'load-sound') throw new Error();
    const a = featureAnalysis(action.sound, 440, 48000);
    expect(id === 'odd' ? a.oddShare : a.details!.evenShare).toBe(1);
  }
});
it('validates additive collapsed metadata and bounded grouped metric DTOs', () => {
  expect(sourceOutputAnalysis.collapsedByDefault).toBe(true);
  expect(() =>
    defineFeature({ ...sourceOutputAnalysis, collapsedByDefault: 'yes' as unknown as boolean }),
  ).toThrow();
  const bad = defineFeature({
    ...sourceOutputAnalysis,
    view: () => ({
      metricGroups: [{ title: 'Bad', metrics: [{ label: 'x', value: NaN as unknown as string }] }],
    }),
  });
  expect(() => bad.view(snapshot, {})).toThrow();
  expect(() => sourceOutputAnalysis.validateSettings([])).toThrow();
  expect(() => sourceOutputAnalysis.action('anything', snapshot, {})).toThrow('read-only');
});
