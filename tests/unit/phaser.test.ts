import { expect, it } from 'vitest';
import {
  defaultModuleSettings,
  defineNumericModule,
  validateModuleSettings,
} from '../../src/modules';
import { phaserModule } from '../../src/modules/pedals/phaser';
import { makePedal, clampPedal, importProcessing, defaultProcessing } from '../../src/core/pedals';

it('registers phaser with isolated defaults and exact stage choices', () => {
  const first = makePedal(phaserModule.id),
    second = makePedal(phaserModule.id);
  first.params.rate = 5;
  expect(second.params.rate).toBe(0.5);
  expect(first.module).toEqual({ id: phaserModule.id, apiVersion: 1, dataVersion: 1 });
  expect(Object.isFrozen(phaserModule.parameters.stages.choices)).toBe(true);
  expect(clampPedal({ ...second, params: { ...second.params, stages: 5 } }).params.stages).toBe(4);
  expect(() => validateModuleSettings(phaserModule, { ...second.params, stages: 5 })).toThrow(
    'stages',
  );
  validateModuleSettings(phaserModule, { ...second.params, rate: 0.1234 });
});

it('rejects ambiguous choice declarations without quantizing ordinary parameters', () => {
  for (const choices of [[], [4], [6, 4], [4, 4, 6], [4, 7], [4, NaN, 8], [0, 6, 8]]) {
    expect(() =>
      defineNumericModule({
        ...phaserModule,
        parameters: { stages: { ...phaserModule.parameters.stages, choices } },
      }),
    ).toThrow('parameter');
  }
  const choices = [4, 6, 8];
  const definition = defineNumericModule({
    ...phaserModule,
    parameters: { stages: { ...phaserModule.parameters.stages, choices } },
  });
  choices[0] = 5;
  expect(definition.parameters.stages.choices).toEqual([4, 6, 8]);
});

it('retains valid phaser settings through saved processing and rejects fractional stages atomically', () => {
  const processing = defaultProcessing();
  processing.master.pedals = [makePedal(phaserModule.id)];
  processing.master.pedals[0].params.stages = 8;
  const restored = importProcessing(JSON.parse(JSON.stringify(processing)));
  expect(restored.master.pedals[0].params.stages).toBe(8);
  restored.master.pedals[0].params.stages = 7;
  expect(() => importProcessing(restored)).toThrow();
  expect(processing.master.pedals[0].params.stages).toBe(8);
});

it('declares finite latency tail and conservative owned resources', () => {
  const environment = { sampleRate: 48000, compressorLatency: 0, oversamplingLatency: 0 };
  expect(phaserModule.latency(environment)).toBe(0);
  expect(phaserModule.tail(defaultModuleSettings(phaserModule), environment)).toBe(6);
  expect(phaserModule.exportTail({ ...defaultModuleSettings(phaserModule), mix: 0 })).toBe(0);
  expect(phaserModule.nodes).toBe(18);
});
