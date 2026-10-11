import { expect, it } from 'vitest';
import { parseScore } from '../../src/core/parser';
import { FILE_MARKER, indexScoreFiles } from '../../src/core/scoreFiles';
import { lexScore } from '../../src/core/scoreLexer';

export const fileScore = (...bodies: string[]) =>
  bodies
    .map(
      (body, i) =>
        `${FILE_MARKER}${JSON.stringify({ id: `file${i}`, name: `part${i}.fourier` })}\nfrom song Demo\n${body}\n`,
    )
    .join('');
it('extends same-track clocks in canonical file order while distinct tracks remain parallel', () => {
  const source = fileScore(
    'tempo 60\ntrack melody using sine {\n C4 quarter\n}\ntrack bass using sine {\n C2 whole\n}',
    'track melody using sine {\n D4 half\n}',
  );
  const score = parseScore(source, ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.tracks.map((track) => [track.key, track.beats, track.parts.length])).toEqual([
    ['melody', 3, 2],
    ['bass', 4, 1],
  ]);
  expect(score.tracks[0].events.map((event) => [event.beat, event.duration, event.fileId])).toEqual(
    [
      [0, 1, 'file0'],
      [1, 2, 'file1'],
    ],
  );
  expect(new Set(score.events.map((event) => event.id)).size).toBe(3);
  const part = score.tracks[0].parts[1];
  expect(source.slice(part.from, part.to)).toBe('track melody using sine {\n D4 half\n}');
});
it('shares section definitions across matching track parts and recompiles rests at their actual position', () => {
  const source = fileScore(
    'time 4/4\ntime 7/8 at 4\ntrack a using sine {\n section A {\n C4 quarter\n rest bar\n}\n play A\n}',
    'track a using sine {\n C4 quarter\n play A\n}',
  );
  const score = parseScore(source, ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.beats).toBe(7.5);
  expect(score.events.map((event) => event.duration)).toEqual([1, 3, 1, 1, 1.5]);
  expect(score.events[3].fileId).toBe('file0');
  expect(score.events[3].sectionCalls![0].fileId).toBe('file1');
  expect(score.events[3].sectionCalls![0].definitionFileId).toBe('file0');
  expect(source.slice(score.events[3].from, score.events[3].to)).toBe('C4 quarter');
});
it('rejects conflicting assignments, repeated local tracks, mismatched links and cross-file delimiters', () => {
  for (const source of [
    fileScore('track a using sine {\n C4 quarter\n}', 'track a using square {\n D4 quarter\n}'),
    fileScore('track a using sine {\n C4 quarter\n}\ntrack a using sine {\n D4 quarter\n}'),
    fileScore('track a using sine {\n C4 quarter', '}\ntrack b using sine {\n D4 quarter\n}'),
    fileScore(
      'track a using sine {\n section A {\n C4 quarter\n}\n}',
      'track a using sine {\n section A {\n D4 quarter\n}\n}',
    ),
    fileScore(
      'track a using sine {\n C4 quarter\n}',
      'from song Other\ntrack b using sine {\n D4 quarter\n}',
    ),
  ])
    expect(parseScore(source, ['sine', 'square']).diagnostics.length, source).toBeGreaterThan(0);
});
it('song links are whole-line tokens with bounded names and must precede music', () => {
  const source = 'from song repeat\ntrack a using sine {\n C4 quarter\n}';
  expect(lexScore(source)[0].kind).toBe('song-link');
  expect(parseScore(source, ['sine']).diagnostics).toEqual([]);
  expect(parseScore('tempo 120\n' + source, ['sine']).diagnostics[0].message).toContain(
    'first command',
  );
  expect(
    parseScore(source.replace('from song repeat', 'from song bad/name'), ['sine']).diagnostics
      .length,
  ).toBeGreaterThan(0);
  expect(
    indexScoreFiles(fileScore('C4 quarter').replace('from song Demo\n', '')).diagnostics[0].message,
  ).toContain('Start this file');
});
