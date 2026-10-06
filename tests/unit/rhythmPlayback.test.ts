import { expect, it } from 'vitest';
import { addBeats, beatValue, parseDuration } from '../../src/core/rhythm';
import { playbackTiming } from '../../src/core/articulation';
import { parseScore } from '../../src/core/parser';
import { measurePositionAt } from '../../src/core/meter';
import { comparisonPhrase } from '../../src/core/comparison';

it('accumulates triplets and arbitrary tuplets exactly without moving articulation spacing', () => {
  let sum = { numerator: 0n, denominator: 1n };
  for (let i = 0; i < 300; i++) sum = addBeats(sum, parseDuration('8th', 'triplet').beats);
  expect(beatValue(sum)).toBe(100);
  expect(parseDuration('16th', 'tuplet:5:4').duration).toBe(0.2);
  expect(parseDuration('quarter.').duration).toBe(1.5);
  expect(parseDuration('half..').duration).toBe(3.5);
  for (const token of ['tuplet:0:2', 'tuplet:33:2', 'tuplet:3:0', 'tuplet:3:99'])
    expect(() => parseDuration('8th', token)).toThrow();
  const score = parseScore(
    'track lead using sine {\nC4 8th triplet staccato\nD4 8th triplet legato\nE4 8th triplet\n}',
    ['sine'],
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.beats).toBe(1);
  expect(score.events[1].beat).toBe(1 / 3);
  expect(score.events[2].beat).toBe(2 / 3);
  expect(playbackTiming(score.events[0], 120)).toEqual({ duration: 1 / 12, releaseLimit: 0.03 });
  expect(playbackTiming(score.events[1], 120).duration).toBeCloseTo(1 / 6 + 1 / 60);
});

it('legato stops at rests and track endings, and source text/spans remain intact', () => {
  const text =
    'track lead using sine {\n chord:Cmaj7 8th tuplet:5:4 legato // source\n rest quarter\n C4 quarter legato\n}';
  const score = parseScore(text, ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.events.every((e) => !e.legatoToNext)).toBe(true);
  expect(text.slice(score.events[0].from, score.events[0].to)).toBe(
    'chord:Cmaj7 8th tuplet:5:4 legato',
  );
  expect(
    parseScore('track lead using sine {\n rest 8th staccato\n}', ['sine']).diagnostics[0].message,
  ).toContain('Rests cannot');
});

it('changes global meter at prior bar boundaries without changing playback seconds', () => {
  const text =
    'time 4/4\ntime 7/8 at 8\ntime 3/4 at 15\ntrack lead using sine {\n rest whole\n rest whole\n C4 whole\n D4 whole\n}';
  const score = parseScore(text, ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.seconds).toBe(8);
  expect(measurePositionAt(8, score.meter, score.meterChanges)).toMatchObject({
    bar: 3,
    beat: 1,
    meter: { numerator: 7, denominator: 8 },
  });
  expect(measurePositionAt(15, score.meter, score.meterChanges)).toMatchObject({
    bar: 5,
    beat: 1,
    meter: { numerator: 3, denominator: 4 },
  });
  for (const directive of [
    'time 7/8 at 3',
    'time 3/4 at 0',
    'time 3/4 at Infinity',
    'time 7/8 at 8\ntime 3/4 at 8',
  ]) {
    expect(
      parseScore(directive + '\ntrack lead using sine {\nC4 whole\n}', ['sine']).diagnostics.length,
    ).toBeGreaterThan(0);
  }
});

it('phrase clipping preserves articulation gates and does not sound an already-shortened note', () => {
  const score = parseScore(
    'track lead using sine {\n C4 quarter staccato\n D4 quarter legato\n E4 quarter\n}',
    ['sine'],
  );
  const phrase = comparisonPhrase(score, {
    kind: 'phrase',
    note: 'C4',
    trackKey: 'lead',
    fromBeat: 0.75,
    toBeat: 2,
  });
  expect(phrase.events[0].frequencies).toEqual([]);
  expect(phrase.events[0].gateDuration).toBe(0);
  expect(phrase.events[1].legatoToNext).toBeUndefined();
});
