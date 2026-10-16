import { expect, it } from 'vitest';
import { parseScore } from '../../src/core/parser';
import { performanceBeat } from '../../src/core/performanceTiming';

const keys = ['sine'];
const track = (body: string, key = 'lead') => `track ${key} using sine {\n${body}\n}`;
const parse = (body: string, global = 'swing eighth 66.66666666666667') =>
  parseScore(`${global}\n${track(body)}`, keys);

it('keeps written beats and seconds while deriving swung chords rests dots and gates', () => {
  const score = parse(
    'staccato[\n C4 eighth\n chord:Cmaj7 eighth\n]\nrest eighth\nD4 eighth\nE4 quarter.\nF4 eighth',
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.beat)).toEqual([0, 0.5, 1, 1.5, 2, 3.5]);
  [0, 2 / 3, 1, 1 + 2 / 3, 2, 3 + 2 / 3].forEach((beat, i) => expect(performanceBeat(score.events[i])).toBeCloseTo(beat, 12));
  expect(score.events[1].frequencies).toHaveLength(4);
  expect(score.events[0].performedGateDuration).toBeCloseTo(1 / 3);
  expect(score.events[4].performedDuration).toBeCloseTo(1 + 2 / 3);
  expect(score.beats).toBe(4);
  expect(score.seconds).toBe(2);
});
it('supports global settings and one independent track override including explicit off', () => {
  const score = parseScore(
    'swing eighth 75\n' +
      track('C4 eighth\nD4 eighth') +
      '\n' +
      track('swing off\nC4 eighth\nD4 eighth', 'straight') +
      '\n' +
      track('swing 16th 60\nC4 16th\nD4 16th\nE4 eighth', 'fast'),
    keys,
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.tracks[0].events[1].performedBeat).toBe(0.75);
  expect(score.tracks[1].events[1].performedBeat).toBeUndefined();
  expect(score.tracks[2].events[1].performedBeat).toBe(0.3);
});
it('preserves byte-for-byte event metadata for off/default/50 percent', () => {
  const body = 'legato[\n C4 eighth\n D4 eighth\n]\nrest quarter';
  const identity = parse(body, 'swing off').events.map(({ from, to, line, ...e }) => e);
  for (const global of ['', 'swing eighth 50', 'swing 16th 50'])
    expect(parse(body, global).events.map(({ from, to, line, ...e }) => e)).toEqual(identity);
});
it('keeps explicit and nested tuplets straight and protects touching pairs', () => {
  const score = parse(
    'triplet[\nC4 eighth\nD4 eighth\nE4 eighth\n]\nF4 eighth\nG4 eighth\nrepeat 2 {\ntriplet[\ntuplet:2:3[\nA4 eighth\nB4 eighth\n]\n]\n}',
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.events.slice(0, 3).map(performanceBeat)).toEqual([0, 1 / 3, 2 / 3]);
  expect(score.events[4].performedBeat).toBeCloseTo(1 + 2 / 3);
  expect(score.events.slice(5).map(performanceBeat)).toEqual([2, 2.5, 3, 3.5]);
});
it('uses absolute expanded clocks across repeats, sections and alternate endings', () => {
  const score = parse(
    'section A {\nC4 eighth\nD4 eighth\n}\nrepeat 2 {\nplay A\n}\nplay A trim 0.5 {\nE4 eighth\n}',
  );
  expect(score.diagnostics).toEqual([]);
  [0, 2 / 3, 1, 1 + 2 / 3, 2, 2 + 2 / 3].forEach((beat, i) => expect(performanceBeat(score.events[i])).toBeCloseTo(beat, 12));
  expect(score.beats).toBe(3);
});
it('rejects duplicate, late and nested directives with source diagnostics, including unused sections', () => {
  for (const body of [
    'swing off\nswing eighth 60\nC4 quarter',
    'C4 eighth\nswing off',
    'repeat 2 {\nswing off\nC4 quarter\n}',
    'section A {\nswing off\nC4 quarter\n}',
    'legato[\nswing off\nC4 quarter\n]',
  ]) {
    const score = parse(body);
    expect(score.diagnostics.length, body).toBeGreaterThan(0);
    const error = score.diagnostics.find(
      (e) => e.message.includes('swing') || e.message.includes('Swing'),
    )!;
    expect(error, body).toBeTruthy();
  }
  expect(parse('C4 quarter', 'swing off\nswing eighth 60').diagnostics[0].message).toContain(
    'Duplicate',
  );
  expect(parse('C4 quarter', 'swing eighth 80').diagnostics[0].message).toContain('50–75');
});
