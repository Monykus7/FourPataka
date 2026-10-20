import { expect, it } from 'vitest';
import { ACOUSTICS_DEFAULTS, acousticsTail, validateAcoustics } from '../../src/modules';
import { createProject, importProject } from '../../src/core/project';
import { createEngineSound } from '../../src/core/engineSound';

it('validates exact acoustic units and rejects partial/nonfinite/out-of-range settings', () => {
  validateAcoustics({ ...ACOUSTICS_DEFAULTS, size: 2.35 });
  for (const change of [
    { mix: 101 },
    { size: 0 },
    { decay: Infinity },
    { damping: 20000 },
    { enabled: 1 },
  ])
    expect(() => validateAcoustics({ ...ACOUSTICS_DEFAULTS, ...change })).toThrow();
  expect(() => validateAcoustics({ enabled: true })).toThrow();
  expect(acousticsTail()).toBe(0);
  expect(acousticsTail({ ...ACOUSTICS_DEFAULTS, enabled: true })).toBe(1.3);
});

it('migrates legacy sounds dry and keeps schema6 chamber copies independent for every engine', () => {
  const legacy = createProject();
  const migrated = importProject(JSON.stringify({ ...legacy, schemaVersion: 5 }));
  expect(migrated.schemaVersion).toBe(6);
  expect(migrated.comparison.A.acoustics).toBeUndefined();
  const p = createProject();
  p.comparison.A.acoustics = { ...ACOUSTICS_DEFAULTS, enabled: true };
  p.comparison.B = createEngineSound('example:engine/basic-tone');
  p.comparison.B.acoustics = { ...ACOUSTICS_DEFAULTS, enabled: true, mix: 40 };
  const copy = importProject(JSON.stringify(p));
  copy.comparison.A.acoustics!.mix = 99;
  expect(copy.comparison.B.acoustics!.mix).toBe(40);
  expect(p.comparison.A.acoustics!.mix).toBe(25);
  expect(() => importProject(JSON.stringify({ ...p, schemaVersion: 5 }))).toThrow('schema 6');
});

it('rejects corrupt acoustic values atomically in library, applied tracks and A/B sounds', () => {
  const original = createProject();
  for (const select of [
    (p: typeof original) => p.instruments[0].sound,
    (p: typeof original) => p.comparison.A,
    (p: typeof original) => p.tracks[0].sound,
  ]) {
    const p = structuredClone(original);
    select(p).acoustics = { ...ACOUSTICS_DEFAULTS, decay: -1 };
    expect(() => importProject(JSON.stringify(p))).toThrow('Chamber decay');
    expect(original.comparison.A.acoustics).toBeUndefined();
  }
});
