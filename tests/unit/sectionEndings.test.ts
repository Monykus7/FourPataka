import { expect, it } from 'vitest';
import { parseScore } from '../../src/core/parser';
import { playbackTiming } from '../../src/core/articulation';

const parse = (body: string, globals = '') =>
  parseScore(`${globals}\ntrack a using sine {\n${body}\n}`, ['sine']);
const definition = 'section A {\n C4 quarter\n chord:Cmaj7 half\n rest 8th\n}';

it('cuts a fractional tail through a chord and appends a different-length ending without changing other calls', () => {
  const score = parse(`${definition}\n play A trim (1 + 1/4) {\n D4 quarter.\n}\n play A`);
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.duration)).toEqual([1, 1.25, 1.5, 1, 2, 0.5]);
  expect(score.events.map((e) => e.beat)).toEqual([0, 1, 2.25, 3.75, 4.75, 6.75]);
  expect(
    score.sectionInvocations.map((c) => [
      c.originalDuration,
      c.retainedBeats,
      c.endingDuration,
      c.duration,
    ]),
  ).toEqual([
    [3.5, 2.25, 1.5, 3.75],
    [3.5, 3.5, 0, 3.5],
  ]);
  expect(score.events[1].notes).toEqual(['C4', 'E4', 'G4', 'B4']);
  expect(score.events[2].sectionEndingOf).toEqual([score.sectionInvocations[0].id]);
  expect(score.events[4].duration).toBe(2);
});

it('handles zero full and exact tuplet-boundary cuts without zero-length notes or accumulated float drift', () => {
  const triplets = 'section A {\n triplet[\n C4 8th\n D4 8th\n E4 8th\n]\n}';
  const score = parse(
    `${triplets}\n repeat 3 {\n play A trim 1/3\n}\n play A trim 1 {\n G4 quarter\n}\n play A trim 0`,
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.beat)).toEqual([
    0,
    1 / 3,
    2 / 3,
    1,
    4 / 3,
    5 / 3,
    2,
    3,
    10 / 3,
    11 / 3,
  ]);
  expect(score.beats).toBe(4);
  expect(score.events.every((e) => e.duration > 0)).toBe(true);
  expect(new Set(score.events.map((e) => e.id)).size).toBe(score.events.length);
});

it('recalculates shortened staccato gates and respects internal versus caller legato boundaries', () => {
  const staccato = parse(
    'section A {\n staccato[ C4 half ]\n}\n play A trim 1/2 {\n D4 quarter\n}',
  );
  expect(staccato.events[0].duration).toBe(1.5);
  expect(staccato.events[0].gateDuration).toBe(0.75);
  expect(playbackTiming(staccato.events[0], 120).duration).toBe(0.375);
  const isolated = parse(
    'section A {\n legato[\n C4 quarter\n D4 quarter\n]\n}\n play A trim 1/2 {\n E4 quarter\n}',
  );
  expect(isolated.events.map((e) => e.legatoToNext)).toEqual([true, undefined, undefined]);
  const inherited = parse(
    'section A {\n C4 half\n}\n legato[\n play A trim 1/2 {\n D4 quarter\n}\n]',
  );
  expect(inherited.events[0].legatoToNext).toBe(true);
});

it('resolves bar rests at each original invocation before trimming and recomputes the ending at its new position', () => {
  const score = parse(
    'section A {\n C4 quarter\n rest bar\n}\n C4 quarter\n play A trim 1 {\n rest bar\n}\n play A trim 1',
    'time 4/4\ntime 7/8 at 4',
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.duration)).toEqual([1, 1, 1, 1, 1, 1.5]);
  expect(score.sectionInvocations.map((c) => [c.originalDuration, c.duration])).toEqual([
    [3, 3],
    [3.5, 2.5],
  ]);
  expect(score.beats).toBe(6.5);
});

it('trims nested invocation metadata with its ancestor and allows a finite same-section call in an ending', () => {
  const score = parse(
    'section A {\n C4 half\n}\n section B {\n play A\n D4 quarter\n}\n play B trim 2 {\n play A\n}',
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.duration)).toEqual([1, 2]);
  expect(score.sectionInvocations.map((c) => [c.name, c.duration, c.retainedBeats])).toEqual([
    ['B', 3, 1],
    ['A', 1, 1],
    ['A', 2, 2],
  ]);
  expect(score.sectionInvocations[1].clippedByParent).toBe(true);
  const same = parse('section A {\n C4 quarter\n}\n play A trim 1 {\n play A\n}');
  expect(same.diagnostics).toEqual([]);
  expect(same.events).toHaveLength(1);
});

it('diagnoses negative oversized invalid and recursive trims at their source and leaves no partial call events', () => {
  for (const cut of ['-1', '4', '1/0', '1**2', 'Infinity', '1000001']) {
    const score = parse(`${definition}\n play A trim ${cut} {\n D4 quarter\n}`);
    expect(score.diagnostics.length).toBeGreaterThan(0);
    expect(score.events).toEqual([]);
  }
  const invalid = parse('section A {\n section B {\n C4 quarter\n}\n}\n play A');
  expect(invalid.diagnostics.length).toBeGreaterThan(0);
  const cycle = parse(
    'section A {\n play B {\n play A\n}\n}\n section B {\n C4 quarter\n}\n play A',
  );
  expect(cycle.diagnostics.some((d) => d.message.includes('Cyclic'))).toBe(true);
  expect(
    cycle.diagnostics.find((d) => d.message.includes('Cyclic'))!.sectionCalls!.map((c) => c.name),
  ).toContain('A');
});
