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

it('discovers the example explicitly without overwriting existing templates source or copies', async () => {
  const { createProject, withBundledPresets, importProject } =
    await import('../../src/core/project');
  const { instrumentModules } = await import('../../src/modules/assembly');
  const project = createProject();
  expect(project.instruments.find((p) => p.key === 'mellowPluck')).toBeTruthy();
  const old = {
    ...structuredClone(project),
    instruments: project.instruments.filter((p) => p.key !== 'mellowPluck'),
  };
  const restored = importProject(JSON.stringify(old));
  expect(restored.instruments.some((p) => p.key === 'mellowPluck')).toBe(false);
  restored.instruments[0].sound.trim = -23;
  const before = structuredClone(restored);
  restored.instruments.push({
    ...structuredClone(restored.instruments[0]),
    id: 'mellow-pluck',
    key: 'personal',
  });
  const added = withBundledPresets(restored);
  const example = added.instruments.find((p) => p.key === 'mellowPluck')!;
  expect(example.id).toBe('mellow-pluck-2');
  expect(added.instruments[0].sound.trim).toBe(-23);
  expect(added.scoreText).toBe(before.scoreText);
  expect(added.tracks).toEqual(before.tracks);
  expect(added.comparison).toEqual(before.comparison);
  expect(withBundledPresets(added)).toBe(added);
  expect(importProject(JSON.stringify(added))).toEqual(added);
  const module = instrumentModules.get('example:instrument/mellow-pluck');
  example.sound.harmonics[0] = 0;
  expect(module.createSound().harmonics[0]).toBe(1);
});
it('preserves occupied keys and fails capacity atomically', async () => {
  const { createProject, withBundledPresets } = await import('../../src/core/project');
  const project = createProject();
  const example = project.instruments.find((p) => p.key === 'mellowPluck')!;
  example.sound.trim = -22;
  expect(withBundledPresets(project)).toBe(project);
  expect(example.sound.trim).toBe(-22);
  project.instruments = project.instruments.filter((p) => p.key !== 'mellowPluck');
  while (project.instruments.length < 128)
    project.instruments.push({
      ...structuredClone(project.instruments[0]),
      id: `custom-${project.instruments.length}`,
      key: `custom${project.instruments.length}`,
    });
  const original = JSON.stringify(project);
  expect(() => withBundledPresets(project)).toThrow('128');
  expect(JSON.stringify(project)).toBe(original);
});
