import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { importProject } from '../../src/core/project';
import { makePedal, EQ_DEFAULTS, PEDAL_CONTROLS } from '../../src/core/pedals';
import { bundledModules, LEGACY_MODULE_IDS } from '../../src/modules/assembly';
import { defaultModuleSettings, validateModuleSettings } from '../../src/modules';

const original = readFileSync(
  new URL('../fixtures/m1/schema1-owned-eq.json', import.meta.url),
  'utf8',
);
export const fixture = JSON.parse(original);

it('preserves schema-v1 source, custom coefficients/signs, boards and independent copies', () => {
  const saved = JSON.parse(original);
  const imported = importProject(original);
  expect(imported.schemaVersion).toBe(5);
  expect(imported.scoreText).toBe(saved.scoreText);
  for (const [newSound, oldSound] of [
    [imported.instruments.find((p) => p.key === 'personal')!.sound, saved.instruments[0].sound],
    [imported.tracks[0].sound, saved.tracks[0].sound],
    [imported.comparison.A, saved.comparison.A],
    [imported.comparison.B, saved.comparison.B],
  ]) {
    expect(newSound.harmonics.slice(0, 16)).toEqual(oldSound.harmonics);
    expect(newSound.polarity.slice(0, 16)).toEqual(oldSound.polarity);
    expect(newSound.harmonics.slice(16)).toEqual(Array(16).fill(0));
    expect(newSound.undertones).toEqual(oldSound.undertones);
    expect(newSound.trim).toBe(oldSound.trim);
  }
  for (const key of ['A', 'B'] as const)
    expect(imported.processing.audition[key]).toEqual(saved.processing.audition[key]);
  // Legacy source assignments gain an explicit marker, preserving their owned settings.
  expect(imported.processing.master).toEqual({
    ...saved.processing.master,
    assignmentKey: 'eqBoard',
  });
  expect(imported.tracks[0].level).toBe(0.65);
  expect(imported.tracks[0].appliedVersion).toBe(3);
  expect(imported.mixGain).toBe(saved.mixGain);
  expect(imported.processing.tracks.legacy.board).toEqual(saved.processing.tracks.legacy.board);
  expect(imported.processing.tracks.legacy.pedals[0].params).toEqual(
    saved.processing.tracks.legacy.pedals[0].params,
  );
  const once = structuredClone(imported);
  imported.processing.tracks.legacy.pedals[0].params.low = -12;
  imported.comparison.A.harmonics[0] = 0;
  expect(imported.processing.master).toEqual(once.processing.master);
  expect(imported.processing.audition.A).toEqual(once.processing.audition.A);
  expect(imported.comparison.B).toEqual(once.comparison.B);
  expect(importProject(JSON.stringify(once))).toEqual(once);
  expect(JSON.parse(original)).toEqual(saved);
});

it('retains old EQ defaults, exact fractional settings and legacy kind identity', () => {
  const definition = bundledModules.get(LEGACY_MODULE_IDS.eq);
  expect(EQ_DEFAULTS).toEqual({ low: 0, mid: 0, high: 0, frequency: 1000, output: 0, mix: 100 });
  expect(PEDAL_CONTROLS.eq.frequency).toEqual([150, 4000, 10, 'Hz']);
  const first = makePedal('eq'),
    second = makePedal('eq');
  first.params.low = 6;
  expect(second.params).toEqual(defaultModuleSettings(definition));
  expect(first.kind).toBe('eq');
  validateModuleSettings(definition, fixture.processing.master.pedals[0].params);
  const invalid = JSON.parse(original);
  invalid.processing.master.pedals[0].kind = 'example:pedal/level';
  expect(() => importProject(JSON.stringify(invalid))).toThrow('Invalid pedal');
});
