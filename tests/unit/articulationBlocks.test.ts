import { expect, it } from 'vitest';
import { parseScore } from '../../src/core/parser';
const parse = (body: string) => parseScore(`track lead using sine {\n${body}\n}`, ['sine']);

it('scopes connected notes to a block and retains note spans rather than brackets', () => {
  const source = 'track lead using sine {\nlegato[ C4 quarter\nD4 quarter]\nE4 quarter\n}';
  const score = parseScore(source, ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => [e.articulation, e.legatoToNext])).toEqual([
    ['legato', true],
    ['legato', undefined],
    [undefined, undefined],
  ]);
  expect(score.events.map((e) => source.slice(e.from, e.to))).toEqual([
    'C4 quarter',
    'D4 quarter',
    'E4 quarter',
  ]);
  expect(score.tracks[0].bodyTo).toBe(source.lastIndexOf('}'));
});

it('rest breaks legato and nested articulation restores its outer scope', () => {
  const score = parse(
    'legato[\nC4 quarter\nrest 8th\nD4 8th\nstaccato[ E4 quarter ]\nF4 quarter\nG4 quarter\n]\nA4 quarter',
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.articulation)).toEqual([
    'legato',
    undefined,
    'legato',
    'staccato',
    'legato',
    'legato',
    undefined,
  ]);
  expect(score.events[0].legatoToNext).toBeUndefined();
  expect(score.events[3].gateDuration).toBe(0.5);
  expect(score.events[4].legatoToNext).toBe(true);
  expect(score.events[5].legatoToNext).toBeUndefined();
});

it('diagnoses missing or unmatched brackets at their source and recovers at track boundaries', () => {
  const source =
    'track a using sine {\n staccato[\n C4 quarter\n}\ntrack b using sine {\n D4 quarter\n}';
  const score = parseScore(source, ['sine']);
  expect(score.diagnostics).toHaveLength(1);
  expect(source.slice(score.diagnostics[0].from, score.diagnostics[0].to)).toBe('staccato[');
  expect(score.tracks[1].events[0].articulation).toBeUndefined();
  expect(parse('C4 quarter]').diagnostics[0].message).toContain('Unexpected closing');
  expect(parseScore('legato[\n]', ['sine']).diagnostics.length).toBeGreaterThan(0);
  expect(
    parse(Array(65).fill('legato[').join('\n') + '\nC4 quarter').diagnostics.some((d) =>
      d.message.includes('64 levels'),
    ),
  ).toBe(true);
});

it('accepts the requested block example and preserves bare-chord expansion spans', () => {
  const body = 'staccato[\nF5 quarter\nGmaj7 eighth\n]';
  const score = parse(body);
  expect(score.diagnostics).toEqual([]);
  expect(score.beats).toBe(1.5);
  expect(score.events.map((e) => e.gateDuration)).toEqual([0.5, 0.25]);
  expect(score.events[1].notes).toEqual(['G4', 'B4', 'D5', 'F#5']);
  expect(score.events[1].chordSymbol?.symbol).toBe('Gmaj7');
  expect(parse('G quarter').diagnostics.length).toBeGreaterThan(0);
  // Numeric roots stay pitch syntax: C9 is an invalid octave, not an inferred ninth chord.
  expect(parse('C9 quarter').diagnostics.length).toBeGreaterThan(0);
  expect(parse('legato[\nGmaj7@3 eighth. triplet\nchord:Cmaj7 quarter\n]').beats).toBe(1.5);
});

it('scales grouped triplets, chords and rests exactly and keeps articulation across nested tuplets', () => {
  const score = parse(
    'legato[\ntriplet[\n C4 eighth\n Gmaj7 eighth\n D4 eighth\n]\nE4 quarter\n]\nF4 quarter',
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.events.map((e) => e.beat)).toEqual([0, 1 / 3, 2 / 3, 1, 2]);
  expect(score.events[2].legatoToNext).toBe(true);
  expect(score.events[3].legatoToNext).toBeUndefined();
  expect(parse('tuplet:5:4[\nrest quarter\nC4 quarter\n]').beats).toBe(1.6);
  expect(parse('triplet[\ntuplet:5:4[ C4 eighth ]\n]').events[0].duration).toBeCloseTo(4 / 15, 12);
  expect(parse('tuplet:1:0[ C4 eighth ]').diagnostics.length).toBeGreaterThan(0);
});
