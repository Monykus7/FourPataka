import { expect, it } from 'vitest';
import { defineFeature, createFeatureRegistry, type FeatureSnapshot } from '../../src/modules';
import { partialPair } from '../../src/modules/examples/partialPair/index';
import { fourierLearning } from '../../src/modules/features/fourierLearning/index';
import { createProject, importProject } from '../../src/core/project';
import {
  guardFeatureSource,
  readFeatureSettings,
  readFeatureVisibility,
} from '../../src/core/featureHost';
import { COMMANDS } from '../../src/core/commands';
import { insertCommand } from '../../src/core/scoreTools';
import { parseScore } from '../../src/core/parser';
const snapshot: FeatureSnapshot = {
  sourceRevision: 2,
  targetTrack: 'melody',
  targetFile: 'main',
  sourceEditable: true,
  referenceNote: 'C4',
  analysis: { supported: true, power: 1, centroidHz: 261.6, oddShare: 1, subShare: 0 },
  measurement: {
    peak: 0.5,
    rms: 0.25,
    sampleRateHz: 48000,
    windowSamples: 2048,
    cadenceMs: 50,
    playing: true,
    mode: 'audition',
    positionSeconds: 0.5,
    staleScore: false,
  },
};
it('validates immutable feature metadata independent defaults and guarded action capabilities', () => {
  const registry = createFeatureRegistry([partialPair]);
  const a = registry.get(partialPair.id).defaults();
  a.h2 = 0;
  expect(partialPair.defaults().h2).toBe(0.35);
  expect(Object.isFrozen(registry.commands[0])).toBe(true);
  expect(() => createFeatureRegistry([partialPair, partialPair])).toThrow('Duplicate');
  expect(() => createFeatureRegistry([fourierLearning])).toThrow('Reserved');
  expect(() => defineFeature({ ...partialPair, apiVersion: 2 })).toThrow();
  const restricted = defineFeature({ ...partialPair, capabilities: [] });
  expect(() => restricted.action('load', snapshot, { h2: 0.2 })).toThrow('capability');
  expect(() => restricted.action('insert', snapshot, { h2: 0.2 })).toThrow('source');
  const badView = defineFeature({
    ...partialPair,
    view: () => ({ metrics: [{ label: 'Bad', value: undefined as any }] }),
  });
  expect(() => badView.view(snapshot, { h2: 0.2 })).toThrow();
});
it('source snapshots are read-only and guarded insertion rejects changed revisions targets and playback', () => {
  const feature = defineFeature({
    ...partialPair,
    view(s) {
      (s.analysis as any).power = 9;
      return {};
    },
  });
  expect(() => feature.view(snapshot, { h2: 0.2 })).toThrow();
  expect(snapshot.analysis.power).toBe(1);
  const action = partialPair.action('insert', snapshot, { h2: 0.2 });
  expect(() => guardFeatureSource(action, snapshot)).not.toThrow();
  expect(() => guardFeatureSource(action, { ...snapshot, sourceRevision: 3 })).toThrow('changed');
  expect(() => guardFeatureSource(action, { ...snapshot, targetFile: 'other' })).toThrow('changed');
  expect(() => guardFeatureSource(action, { ...snapshot, sourceEditable: false })).toThrow('Stop');
});
it('preserves feature data through schema5 unknown/version recovery and legacy migration', () => {
  const p = createProject();
  p.featureSettings = {
    [partialPair.id]: { apiVersion: 1, dataVersion: 1, settings: { h2: 0.6 } },
  };
  const copied = importProject(JSON.stringify(p));
  expect(copied.featureSettings).toEqual(p.featureSettings);
  (p.featureSettings[partialPair.id].settings as any).h2 = 0;
  expect((copied.featureSettings![partialPair.id].settings as any).h2).toBe(0.6);
  const future = {
    'future:feature/tool': {
      apiVersion: 7,
      dataVersion: 9,
      settings: { future: [1, 2] },
      extra: 'retain',
    },
  };
  const parsed = readFeatureSettings(future);
  expect(parsed['future:feature/tool'].settings).toEqual(future['future:feature/tool'].settings);
  expect(parsed['future:feature/tool'].extra).toBe('retain');
  expect(parsed['future:feature/tool'].unavailable).toContain('not installed');
  expect(
    readFeatureSettings({
      [partialPair.id]: { apiVersion: 1, dataVersion: 2, settings: { future: true } },
    })[partialPair.id].unavailable,
  ).toContain('version');
  expect(
    readFeatureSettings({
      [partialPair.id]: {
        apiVersion: 1,
        dataVersion: 1,
        settings: { h2: 0.3 },
        unavailable: 'old',
      },
    })[partialPair.id].unavailable,
  ).toBeUndefined();
  expect(() => importProject(JSON.stringify({ ...p, schemaVersion: 4 }))).toThrow('schema 5');
  const old = { ...createProject(), schemaVersion: 4 };
  expect(importProject(JSON.stringify(old)).comparison).toEqual(old.comparison);
  expect(() =>
    readFeatureSettings({
      [partialPair.id]: { apiVersion: 1, dataVersion: 1, settings: { h2: 2 } },
    }),
  ).toThrow('strength');
});
it('UI visibility is separate and command metadata uses existing valid parser syntax with blank completion fields', () => {
  expect(
    readFeatureVisibility({ [partialPair.id]: false, 'future:feature/ui': true, bad: true }),
  ).toEqual({ [partialPair.id]: false, 'future:feature/ui': true });
  const p = createProject();
  const text = insertCommand(
    p.scoreText,
    p.instruments.map((i) => i.key),
    'octave-pair',
    'melody',
    'sine',
    p.processing.library.map((c) => c.key),
  );
  expect(
    parseScore(
      text,
      p.instruments.map((i) => i.key),
      p.processing.library.map((c) => c.key),
    ).diagnostics,
  ).toEqual([]);
  expect(COMMANDS.find((c) => c.name === 'octave-pair')!.completionTemplate).not.toContain('C4');
  const view = partialPair.view(snapshot, { h2: 0.2 });
  expect(view.metrics?.[0].value).toBe('-6.0 dBFS');
  expect(view.metrics?.[1].value).toBe('-12.0 dBFS');
});
it('migrated experiments retain their exact original source policies', () => {
  const missing = fourierLearning.action('missing', snapshot, {});
  expect(missing.type).toBe('load-sound');
  if (missing.type === 'load-sound') {
    expect(missing.sound.harmonics[0]).toBe(0);
    expect(missing.sound.harmonics[2]).toBeCloseTo(1 / 3);
  }
  const sub = fourierLearning.action('sub', snapshot, {});
  if (sub.type === 'load-sound') {
    expect(sub.sound.undertonesEnabled).toBe(true);
    expect(sub.sound.undertones[0]).toBe(0.25);
  }
});
