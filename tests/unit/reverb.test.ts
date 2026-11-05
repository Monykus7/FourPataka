import { expect, it } from 'vitest';
import { defaultModuleSettings, validateModuleSettings } from '../../src/modules';
import { reverbModule, reverbTail } from '../../src/modules/pedals/reverb';
import { pedalModules, LEGACY_MODULE_IDS } from '../../src/modules/assembly';
import { makePedal, defaultProcessing, importProcessing } from '../../src/core/pedals';

it('registers owned reverb defaults and validates independent units without a legacy alias', () => {
  expect(pedalModules.get(reverbModule.id).id).toBe(reverbModule.id);
  expect(Object.values(LEGACY_MODULE_IDS)).not.toContain(reverbModule.id);
  const a = makePedal(reverbModule.id),
    b = makePedal(reverbModule.id);
  expect(a.params).toEqual({
    preDelay: 15,
    decay: 1.5,
    size: 100,
    damping: 6500,
    output: 0,
    mix: 25,
  });
  a.params.decay = 7;
  expect(b.params.decay).toBe(1.5);
  for (const patch of [
    { preDelay: 101 },
    { decay: 0 },
    { size: 49 },
    { damping: NaN },
    { mix: 101 },
  ])
    expect(() => validateModuleSettings(reverbModule, { ...b.params, ...patch })).toThrow();
  validateModuleSettings(reverbModule, { ...b.params, decay: 0.375 });
});

it('round-trips owned reverb parameters and rejects corrupt imports atomically', () => {
  const p = defaultProcessing();
  p.master.pedals = [makePedal(reverbModule.id)];
  const copy = importProcessing(JSON.parse(JSON.stringify(p)));
  copy.master.pedals[0].params.mix = 100;
  expect(p.master.pedals[0].params.mix).toBe(25);
  copy.master.pedals[0].params.decay = Infinity;
  expect(() => importProcessing(copy)).toThrow();
});

it('distinguishes intentional space timing from latency and declares conservative tail/resources', () => {
  const p = defaultModuleSettings(reverbModule);
  expect(
    reverbModule.latency({ sampleRate: 48000, compressorLatency: 0, oversamplingLatency: 0 }),
  ).toBe(0);
  expect(reverbTail(p)).toBeCloseTo(3.515);
  expect(reverbTail({ ...p, preDelay: 100, decay: 10 })).toBeCloseTo(20.6);
  expect(reverbModule.exportTail({ ...p, mix: 0 })).toBe(0);
  expect(reverbModule.nodes).toBe(53);
  expect(reverbModule.memoryBytes).toBe(3145728);
});

it('declares branch warm-up independently of musical latency and retains API1 defaults', () => {
  const p = defaultModuleSettings(reverbModule),
    env = { sampleRate: 48000, compressorLatency: 0, oversamplingLatency: 0 };
  expect(reverbModule.warmup!(p, env)).toBeGreaterThan(0.1);
  expect(
    reverbModule.warmup!({ ...p, preDelay: 100, size: 200 }, { ...env, sampleRate: 3000 }),
  ).toBeLessThan(0.34);
  expect(reverbModule.warmup!({ ...p, mix: 0 }, env)).toBe(0);
});
