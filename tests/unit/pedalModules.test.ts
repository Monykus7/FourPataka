import { expect, it } from 'vitest';
import {
  definePedalModule,
  createPedalRegistry,
  checkedSeconds,
  MODULE_API_VERSION,
  type PedalModule,
} from '../../src/modules';
import { levelMetadata } from '../../src/modules/examples/levelMetadata';
const definition: PedalModule = {
  ...levelMetadata,
  category: 'pedal',
  apiVersion: MODULE_API_VERSION,
  author: 'Example',
  attribution: 'Source example; repository license pending',
  bypass: 'dry',
  nodes: 5,
  memoryBytes: 0,
  minimumSampleRate: 3000,
  latency: () => 0,
  tail: () => 0,
  exportTail: () => 0,
  create: () => {
    throw new Error('Test-only factory');
  },
};
it('validates pedal contracts, reserved aliases and duplicate registration', () => {
  const module = definePedalModule(definition);
  expect(Object.isFrozen(module)).toBe(true);
  expect(createPedalRegistry([module]).get(module.id)).toEqual(module);
  expect(() => createPedalRegistry([module, module])).toThrow('Duplicate');
  expect(() => createPedalRegistry([{ ...module, legacyKind: 'eq' }])).toThrow('legacy');
  for (const patch of [
    { nodes: 0 },
    { memoryBytes: Infinity },
    { minimumSampleRate: 1 },
    { bypass: 'silence' },
    { create: null },
    { author: '' },
  ])
    expect(() => definePedalModule({ ...module, ...patch } as PedalModule)).toThrow(
      'Invalid pedal',
    );
  expect(() => checkedSeconds(NaN, module.id)).toThrow();
  expect(() => checkedSeconds(-1, module.id)).toThrow();
  expect(checkedSeconds(0.006, module.id)).toBe(0.006);
});

it('preserves missing and incompatible module payloads without silently substituting DSP', async () => {
  const { readSavedPedal } = await import('../../src/modules');
  const raw = {
    id: 'owned',
    kind: 'future:pedal/color',
    bypassed: false,
    module: { id: 'future:pedal/color', apiVersion: 2, dataVersion: 4 },
    params: { curve: [0, 0.25, 1], mode: 'soft' },
    extra: { author: 'Future' },
  };
  const copy = structuredClone(raw);
  const missing = readSavedPedal(raw, () => undefined);
  expect(missing.unavailable!.original).toEqual(raw);
  expect(missing.params).toEqual({});
  expect(readSavedPedal(JSON.parse(JSON.stringify(missing)), () => undefined)).toEqual(missing);
  expect(raw).toEqual(copy);
  const current = { ...definition, id: raw.kind, apiVersion: 1, dataVersion: 1 };
  expect(readSavedPedal(raw, () => current).unavailable!.reason).toContain('Incompatible');
  expect(() =>
    readSavedPedal({ ...raw, module: { ...raw.module, id: 'wrong:pedal/id' } }, () => undefined),
  ).toThrow('reference');
  expect(() => readSavedPedal({ ...raw, params: { bad: Infinity } }, () => undefined)).toThrow(
    'recovery',
  );
  const compatible = {
    ...raw,
    module: { id: raw.kind, apiVersion: 1, dataVersion: 1 },
    params: { gain: -3 },
  };
  const parked = readSavedPedal(compatible, () => undefined);
  expect(readSavedPedal(parked, () => current).params).toEqual({ gain: -3 });
  expect(readSavedPedal(parked, () => current).unavailable).toBeUndefined();
});

it('migrates old projects atomically and retains unavailable modules in independent copies', async () => {
  const { createProject, importProject } = await import('../../src/core/project');
  const project = createProject();
  const raw = {
    id: 'missing',
    kind: 'future:pedal/color',
    bypassed: false,
    module: { id: 'future:pedal/color', apiVersion: 1, dataVersion: 2 },
    params: { curve: [0, 1] },
  };
  const old = { ...structuredClone(project), schemaVersion: 2 };
  expect(importProject(JSON.stringify(old)).schemaVersion).toBe(3);
  const data: any = structuredClone(project);
  data.processing.master.pedals = [raw];
  data.processing.audition.A.pedals = [raw];
  const loaded = importProject(JSON.stringify(data));
  const saved = JSON.stringify(loaded);
  expect(importProject(saved)).toEqual(loaded);
  expect(loaded.processing.master.pedals[0].unavailable!.original.params).toEqual(raw.params);
  loaded.processing.master.pedals[0].unavailable!.original.params = { curve: [0] };
  expect(loaded.processing.audition.A.pedals[0].unavailable!.original.params).toEqual(raw.params);
  expect(() => importProject(JSON.stringify({ ...data, schemaVersion: 2 }))).toThrow('schema 3');
  expect(data.processing.master.pedals[0]).toEqual(raw);
});
