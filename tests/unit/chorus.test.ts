import { expect, it } from 'vitest';
import { defaultModuleSettings, validateModuleSettings } from '../../src/modules';
import { chorusModule, chorusExcursion } from '../../src/modules/pedals/chorus';
import { makePedal, importProcessing, defaultProcessing } from '../../src/core/pedals';
import { LEGACY_MODULE_IDS } from '../../src/modules/assembly';

it('encodes safe independent controls for every base/depth combination', () => {
  for (const time of [5, 5.5, 11, 15, 30])
    for (const depth of [0, 12.5, 30, 100]) {
      const radius = chorusExcursion(time, depth);
      expect(time - radius).toBeGreaterThanOrEqual(1);
      expect(time + radius).toBeLessThanOrEqual(40);
    }
  expect(chorusExcursion(5, 100)).toBe(4);
  expect(chorusExcursion(30, 100)).toBe(10);
  expect(chorusExcursion(15, 30)).toBe(3);
});

it('registers independently owned defaults without adding a phantom legacy alias', () => {
  const first = makePedal(chorusModule.id),
    second = makePedal(chorusModule.id);
  first.params.time = 30;
  expect(second.params.time).toBe(15);
  expect(first.module).toEqual({ id: chorusModule.id, apiVersion: 1, dataVersion: 1 });
  expect(Object.keys(LEGACY_MODULE_IDS).sort()).toEqual(['compressor', 'delay', 'eq', 'overdrive']);
  validateModuleSettings(chorusModule, { ...second.params, depth: 12.34 });
  for (const patch of [{ time: 4 }, { depth: 101 }, { rate: NaN }, { mix: -1 }])
    expect(() => validateModuleSettings(chorusModule, { ...second.params, ...patch })).toThrow();
});

it('saves valid bounds without changing musical data and rejects invalid imports', () => {
  const processing = defaultProcessing();
  processing.master.pedals = [makePedal(chorusModule.id)];
  processing.master.pedals[0].params = {
    ...processing.master.pedals[0].params,
    time: 5,
    depth: 100,
  };
  const restored = importProcessing(JSON.parse(JSON.stringify(processing)));
  expect(restored.master.pedals[0].params).toEqual(processing.master.pedals[0].params);
  restored.master.pedals[0].params.depth = 101;
  expect(() => importProcessing(restored)).toThrow();
  expect(processing.master.pedals[0].params.depth).toBe(100);
});

it('declares musical delay rather than scheduling latency and bounds cleanup/export', () => {
  const p = defaultModuleSettings(chorusModule),
    env = { sampleRate: 48000, oversamplingLatency: 0, compressorLatency: 0 };
  expect(chorusModule.latency(env)).toBe(0);
  expect(chorusModule.tail(p, env)).toBe(0.05);
  expect(chorusModule.exportTail(p)).toBe(0.05);
  expect(chorusModule.exportTail({ ...p, mix: 0 })).toBe(0);
  expect(chorusModule.nodes).toBe(12);
});
