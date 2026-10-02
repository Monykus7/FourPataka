import { describe, expect, it } from 'vitest';
import { COMMANDS, parseScore } from '../../src/core/parser';
import { EXAMPLE_SCORE } from '../../src/core/project';

const keys = ['brightReed', 'softBass'];
const parse = (body: string) => parseScore(`track lead using brightReed {\n${body}\n}`, keys);
describe('score compilation', () => {
  it('compiles the example with parallel starts and exact beats', () => {
    const score = parseScore(EXAMPLE_SCORE, keys);
    expect(score.diagnostics).toEqual([]);
    expect(score.tracks.map((t) => t.beats)).toEqual([4, 4]);
    expect(score.events.filter((e) => e.beat === 0).map((e) => e.track)).toEqual([
      'melody',
      'bass',
    ]);
    expect(score.seconds).toBe(2);
    expect(score.events[1].notes).toEqual(['Bb5', 'D5', 'F5']);
  });
  it('resolves explicit chord octaves and mixed overrides', () => {
    expect(parse('chord : ( Bb4 D F ) 5 quarter').events[0].notes).toEqual(['Bb4', 'D5', 'F5']);
    expect(parse('chord:(Bb4 D5 F5) quarter').events[0].notes).toEqual(['Bb4', 'D5', 'F5']);
    expect(parse('chord:(Bb D F) quarter').diagnostics[0].message).toContain('needs an octave');
  });
  it('preserves source offsets despite comments and whitespace', () => {
    const text = '  // hi\n\ntrack lead using brightReed {\n  C4 quarter // note\n}';
    const event = parseScore(text, keys).events[0];
    expect(text.slice(event.from, event.to)).toBe('C4 quarter');
    expect(event.line).toBe(4);
  });
  it.each([
    'chord:()5 quarter',
    'C9 quarter',
    'Cb0 quarter',
    'C4 banana',
    'G quarter',
    'tempo 80',
    'track nested using brightReed {',
  ])('diagnoses malformed event %s', (event) =>
    expect(parse(event).diagnostics.length).toBeGreaterThan(0),
  );
  it('rejects duplicate directives, track keys, unknown instruments, and missing braces', () => {
    expect(
      parseScore('tempo 120\ntempo 90', keys).diagnostics.some((d) =>
        d.message.includes('Duplicate'),
      ),
    ).toBe(true);
    expect(parseScore('track x using missing {\nC4 quarter', keys).diagnostics).toHaveLength(2);
    expect(
      parseScore('track x using brightReed {\n}\ntrack x using brightReed {\n}', keys)
        .diagnostics[0].message,
    ).toContain('Duplicate');
  });
  it('refuses unsupported processing rather than silently ignoring it', () => {
    expect(
      parseScore(
        'master through cleanGlue\ntrack x using brightReed through warmDrive {\nC4 quarter\n}',
        keys,
      ).diagnostics,
    ).toHaveLength(2);
  });
  it('allows incomplete bars and a note shorter than a quarter', () => {
    const score = parse('C4 16th');
    expect(score.diagnostics).toEqual([]);
    expect(score.beats).toBe(0.25);
    expect(score.seconds).toBe(0.125);
  });
  it('compiles track/master chains with exact key spans and rejects unknown, duplicate or misplaced routing', () => {
    const text =
      '  master through cleanGlue // mix\ntrack lead using brightReed   through warmDrive { // track\n C4 quarter\n}';
    const score = parseScore(text, keys, ['cleanGlue', 'warmDrive']);
    expect(score.diagnostics).toEqual([]);
    expect(score.master?.key).toBe('cleanGlue');
    expect(text.slice(score.master!.from, score.master!.to)).toBe('cleanGlue');
    expect(score.tracks[0].chainKey).toBe('warmDrive');
    expect(text.slice(score.tracks[0].chainFrom, score.tracks[0].chainTo)).toBe('warmDrive');
    const unknown = parseScore(text, keys, []);
    expect(unknown.diagnostics.map((d) => text.slice(d.from, d.to))).toEqual([
      'cleanGlue',
      'warmDrive',
    ]);
    expect(
      parseScore(
        'master through clean\nmaster through clean\ntrack x using brightReed {\n C4 quarter\n}',
        keys,
        ['clean'],
      ).diagnostics[0].message,
    ).toContain('Duplicate master');
    expect(parse('master through clean').diagnostics[0].message).toContain('Expected a note');
    expect(
      parseScore('master clean\ntrack x using brightReed {\n}', keys, ['clean']).diagnostics[0]
        .message,
    ).toContain('Use master through');
    expect(
      parseScore('track x using brightReed through {\n C4 quarter\n}', keys, ['clean']).diagnostics
        .length,
    ).toBeGreaterThan(0);
  });
  it('checks every displayed command example against the parser', () => {
    for (const command of COMMANDS) {
      const text =
        command.name === 'through'
          ? `track lead using brightReed ${command.snippet} {\n C4 quarter\n}`
          : ['tempo', 'time', 'track', 'master'].includes(command.name)
            ? command.name === 'track'
              ? command.snippet
              : `${command.snippet}\ntrack lead using brightReed {\nC4 quarter\n}`
            : `track lead using brightReed {\n${command.snippet}\n}`;
      expect(parseScore(text, keys, ['warmDrive', 'cleanGlue']).diagnostics, command.name).toEqual(
        [],
      );
    }
  });
});
