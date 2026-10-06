import { expect, it } from 'vitest';
import { parseScore } from '../../src/core/parser';
const parse = (body: string) => parseScore(`track lead using sine {\n${body}\n}`, ['sine']);
it('compiles repeat counts as total plays with independent event IDs and original source spans', () => {
  const source =
    'track lead using sine {\nrepeat 3 {\nlegato[ C4 quarter\nD4 quarter ]\n}\nE4 quarter\n}';
  const score = parseScore(source, ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.beat)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(new Set(score.events.map((e) => e.id)).size).toBe(7);
  expect(score.events[2].from).toBe(score.events[0].from);
  expect(score.events[1].legatoToNext).toBeUndefined();
  expect(parse('repeat{ C4 quarter }').beats).toBe(2);
  expect(parse('repeat 3 { repeat 2 { C4 quarter } }').beats).toBe(6);
});
it('bounds expansion and diagnoses misplaced, missing and crossing block scopes', () => {
  for (const source of [
    'repeat 0{ C4 quarter }',
    'repeat 129{ C4 quarter }',
    'repeat 3{\nC4 quarter',
    'repeat{ legato[ C4 quarter }\n]',
  ])
    expect(parse(source).diagnostics.length).toBeGreaterThan(0);
  expect(parseScore('repeat{ C4 quarter }', ['sine']).diagnostics[0].message).toContain(
    'inside a track',
  );
  expect(
    parse('repeat 128 { repeat 128 { C4 quarter } }').diagnostics.some((d) =>
      d.message.includes('10,000'),
    ),
  ).toBe(true);
});

it('recomputes rest bar within repeats and honors global meter directives below tracks', () => {
  const source =
    'time 4/4\ntrack lead using sine {\nrepeat 3 {\nC4 quarter\nrest bar\n}\n}\ntime 7/8 at 4';
  const score = parseScore(source, ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.duration)).toEqual([1, 3, 1, 2.5, 1, 2.5]);
  expect(score.beats).toBe(11);
  expect(parse('triplet[ C4 eighth\nrest till end of bar ]').beats).toBe(4);
  expect(parse('rest bar').beats).toBe(4);
});

it('reports an invalid repeated source section once instead of once per iteration', () => {
  expect(parse('repeat 128 { C9 quarter }').diagnostics).toHaveLength(1);
});
