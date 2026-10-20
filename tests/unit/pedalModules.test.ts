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
  maximumSampleRate: 192000,
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
  expect(importProject(JSON.stringify(old)).schemaVersion).toBe(6);
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

it('discovers the independent level contribution and validates its saved settings generically', async () => {
  const { makePedal, PEDAL_KINDS, PEDAL_CONTROLS, importProcessing, defaultProcessing } =
    await import('../../src/core/pedals');
  const { pedalModules } = await import('../../src/modules/assembly');
  const first = makePedal('example:pedal/level'),
    second = makePedal(first.kind);
  first.params.output = -6;
  expect(second.params.output).toBe(0);
  expect(PEDAL_KINDS).toContain(first.kind);
  expect(PEDAL_CONTROLS[first.kind].output).toEqual([-24, 12, 0.5, 'dB']);
  const processing = defaultProcessing();
  processing.master.pedals.push(first);
  const imported = importProcessing(JSON.parse(JSON.stringify(processing)));
  expect(imported.master.pedals[0]).toEqual(first);
  expect(pedalModules.get(first.kind).nodes).toBe(5);
  const invalid = structuredClone(processing);
  invalid.master.pedals[0].params.output = 30;
  expect(() => importProcessing(invalid)).toThrow('Invalid setting');
});

it('cleans owned nodes after factory failure and disposes a runtime only once', async () => {
  const { createMixedProcessor } = await import('../../src/modules');
  const nodes: any[] = [];
  const context = {
    currentTime: 0,
    createGain() {
      const node: any = {
        gain: {
          value: 1,
          setTargetAtTime(value: number) {
            this.value = value;
          },
        },
        disconnects: 0,
        connect(target: any) {
          return target;
        },
        disconnect() {
          this.disconnects++;
        },
      };
      nodes.push(node);
      return node;
    },
  } as unknown as BaseAudioContext;
  expect(() =>
    createMixedProcessor(context, { output: 0, mix: 100 }, false, () => {
      throw new Error('setup failed');
    }),
  ).toThrow('setup failed');
  expect(nodes.every((node) => node.disconnects === 1)).toBe(true);
  nodes.length = 0;
  const settings = { output: -6, mix: 100 };
  const runtime = createMixedProcessor(context, settings, false, () => ({
    latency: 0,
    tail: (params) => params.output + 24,
    update() {},
  }));
  settings.output = 12;
  expect(runtime.tail).toBe(18);
  runtime.dispose();
  runtime.dispose();
  runtime.update({ output: 0, mix: 100 }, false);
  expect(nodes.every((node) => node.disconnects === 1)).toBe(true);
});
