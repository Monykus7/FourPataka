import { expect, it } from 'vitest';
import { CHORD_SHAPES, createChordShapeRegistry, type ChordShape } from '../../src/modules/chords';
import { parseScore } from '../../src/core/parser';

const definition: ChordShape = {
  id: 'test:cluster',
  apiVersion: 1,
  label: 'Cluster',
  aliases: ['cluster'],
  tones: [
    { degree: 0, semitones: 0 },
    { degree: 1, semitones: 1 },
  ],
};
it('assembles built-ins and an independently defined contributor example without alias collisions', () => {
  expect(CHORD_SHAPES.find('maj13#11')!.tones.map((t) => t.semitones)).toEqual([
    0, 4, 7, 11, 14, 18, 21,
  ]);
  expect(CHORD_SHAPES.find('open5')!.id).toBe('example:open-fifth');
  expect(CHORD_SHAPES.find('unavailable')).toBeUndefined();
  expect(CHORD_SHAPES.find('m')).not.toBe(CHORD_SHAPES.find('M'));
});
it('ships the documented wide-second contribution through the real registry and parser', () => {
  expect(CHORD_SHAPES.find('wide2')!.id).toBe('example:wide-second');
  const score = parseScore('track example using sine {\nchord:Cwide2@3 quarter\n}', ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.events[0].notes).toEqual(['C3', 'D4', 'G4']);
  expect(score.events[0].chordSymbol!.shapeId).toBe('example:wide-second');
});
it('owns immutable definition copies while each registry is independent', () => {
  const source = structuredClone(definition);
  const registry = createChordShapeRegistry([source]);
  (source.tones as { degree: number; semitones: number }[])[1].semitones = 2;
  expect(registry.find('cluster')!.tones[1].semitones).toBe(1);
  expect(Object.isFrozen(registry.find('cluster')!.tones[0])).toBe(true);
  expect(CHORD_SHAPES.find('cluster')).toBeUndefined();
});
it('rejects duplicate IDs/aliases, incompatible APIs and malformed or unsafe tone definitions', () => {
  expect(() => createChordShapeRegistry([definition, definition])).toThrow();
  for (const change of [
    { id: 'not-namespaced' },
    { apiVersion: 2 },
    { label: '' },
    { aliases: ['bad alias'] },
    { tones: [] },
    { tones: [{ degree: 0, semitones: 1 }] },
    {
      tones: [
        { degree: 0, semitones: 0 },
        { degree: 2, semitones: NaN },
      ],
    },
    {
      tones: [
        { degree: 0, semitones: 0 },
        { degree: 4, semitones: 0 },
      ],
    },
    {
      tones: [
        { degree: 0, semitones: 0 },
        { degree: 2, semitones: 40 },
      ],
    },
  ])
    expect(() => createChordShapeRegistry([{ ...definition, ...change }])).toThrow();
  expect(() =>
    createChordShapeRegistry([definition, { ...definition, id: 'test:second' }]),
  ).toThrow('alias');
});
