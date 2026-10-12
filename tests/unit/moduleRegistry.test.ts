import { expect, it } from 'vitest';
import {
  createModuleRegistry,
  defaultModuleSettings,
  defineNumericModule,
  validateModuleSettings,
  type NumericModuleDefinition,
} from '../../src/modules';
import { levelMetadata } from '../../src/modules/examples/levelMetadata';

it('builds the public example with immutable definitions and fresh owned defaults', () => {
  const input = structuredClone(levelMetadata);
  const registry = createModuleRegistry([input]);
  (input.parameters.gain as any).defaultValue = 6;
  const definition = registry.get(levelMetadata.id);
  const first = defaultModuleSettings(definition),
    second = defaultModuleSettings(definition);
  first.gain = -12;
  expect(second).toEqual({ gain: 0 });
  expect(Object.isFrozen(definition.parameters.gain)).toBe(true);
  expect(Object.isFrozen(registry.definitions)).toBe(true);
  validateModuleSettings(definition, { gain: 0.125 });
});

it('rejects duplicate, reserved, unknown and incompatible module identities deterministically', () => {
  expect(() => createModuleRegistry([levelMetadata, levelMetadata])).toThrow(
    `Duplicate module ID: ${levelMetadata.id}`,
  );
  expect(() => createModuleRegistry([{ ...levelMetadata, id: 'fourpataka:pedal/level' }])).toThrow(
    'Reserved built-in',
  );
  const registry = createModuleRegistry([{ ...levelMetadata, id: 'fourpataka:pedal/level' }], {
    builtInIds: ['fourpataka:pedal/level'],
  });
  expect(registry.get('fourpataka:pedal/level').label).toBe(levelMetadata.label);
  expect(() => registry.get('missing:pedal/level')).toThrow('Unavailable module');
  for (const patch of [
    { apiVersion: 2 },
    { dataVersion: 0 },
    { dataVersion: 1.5 },
    { id: 'level' },
    { category: 'engine' },
    { parameters: {} },
  ])
    expect(() =>
      defineNumericModule({ ...levelMetadata, ...patch } as NumericModuleDefinition),
    ).toThrow();
});

it('rejects invalid descriptors, malformed/default/settings data without mutating the caller', () => {
  for (const patch of [
    { min: NaN },
    { max: 0, min: 1 },
    { step: 0 },
    { step: 99 },
    { defaultValue: 13 },
    { unit: 'mystery' },
    { update: 'retrigger' },
    { label: '' },
    { description: '' },
  ])
    expect(() =>
      defineNumericModule({
        ...levelMetadata,
        parameters: {
          gain: { ...levelMetadata.parameters.gain, ...patch } as any,
        },
      }),
    ).toThrow('Invalid parameter');
  for (const settings of [
    null,
    [],
    {},
    { gain: NaN },
    { gain: 13 },
    { gain: '0' },
    { gain: 0, extra: 1 },
  ])
    expect(() => validateModuleSettings(levelMetadata, settings)).toThrow('Invalid');
  const newer = { gain: -3 };
  expect(() => validateModuleSettings(levelMetadata, newer, 2)).toThrow(
    'Unsupported settings version',
  );
  expect(newer).toEqual({ gain: -3 });
});
