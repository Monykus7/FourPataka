import { expect, it } from 'vitest';
import {
  defineFourierPreset,
  createFourierPresetRegistry,
  fourierShape,
  type FourierPresetModule,
} from '../../src/modules';
const definition: FourierPresetModule = {
  id: 'test:instrument/tone',
  apiVersion: 1,
  dataVersion: 1,
  libraryId: 'tone',
  scoreKey: 'tone',
  label: 'Tone',
  templateVersion: 1,
  author: 'Test',
  attribution: 'Test source',
  tags: [],
  createSound: () => fourierShape('sine'),
};
it('captures immutable metadata and fresh settings without trusting caller ownership', () => {
  const source = fourierShape('square');
  const module = defineFourierPreset({ ...definition, createSound: () => source });
  source.harmonics[0] = 0;
  const a = module.createSound(),
    b = module.createSound();
  a.polarity[0] = -1;
  expect(b.harmonics[0]).toBe(1);
  expect(b.polarity[0]).toBe(1);
  expect(Object.isFrozen(module.tags)).toBe(true);
  expect(createFourierPresetRegistry([module]).createTemplates()[0].key).toBe('tone');
});
it('rejects duplicate reserved incompatible invalid and impure factory definitions', () => {
  expect(() => createFourierPresetRegistry([definition, definition])).toThrow('Duplicate');
  expect(() =>
    createFourierPresetRegistry([{ ...definition, id: 'fourpataka:instrument/tone' }]),
  ).toThrow('Reserved');
  for (const patch of [
    { apiVersion: 2 },
    { dataVersion: 2 },
    { scoreKey: 'bad-key' },
    { templateVersion: 0 },
    { tags: [''] },
    { createSound: () => ({ ...fourierShape('sine'), trim: 12 }) },
  ])
    expect(() => defineFourierPreset({ ...definition, ...patch })).toThrow();
  let count = 0;
  expect(() =>
    defineFourierPreset({
      ...definition,
      createSound: () => ({ ...fourierShape('sine'), trim: --count }),
    }),
  ).toThrow('deterministic');
});
