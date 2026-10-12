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
