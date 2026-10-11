import { expect, it } from 'vitest';
import { indexScoreFiles, addScoreFile, ensureScoreFiles } from '../../src/core/scoreFiles';
import { parseScore } from '../../src/core/parser';
import { insertCommand } from '../../src/core/scoreTools';

const file = (i: number, body: string) =>
  `// @fourpataka-file {"id":"file${i}","name":"part${i}.fourier"}\nfrom song Demo\n${body}\n`;
it('bounds file counts without losing the typed source or creating another track owner', () => {
  const source = Array.from({ length: 32 }, (_, i) =>
    file(i, 'track a using sine {\n C4 quarter\n}'),
  ).join('');
  const score = parseScore(source, ['sine']);
  expect(score.diagnostics).toEqual([]);
  expect(score.tracks).toHaveLength(1);
  expect(score.tracks[0].beats).toBe(32);
  expect(score.tracks[0].parts).toHaveLength(32);
  expect(() =>
    addScoreFile(source, indexScoreFiles(source), 'last', 'last.fourier', 'Demo'),
  ).toThrow('32');
  const excessive = source + file(32, 'track b using sine {\n D4 quarter\n}');
  expect(indexScoreFiles(excessive).source).toBe(excessive);
  expect(indexScoreFiles(excessive).problem).toContain('32');
  expect(parseScore(excessive, ['sine']).diagnostics.length).toBeGreaterThan(0);
});
it('song-link diagnostics identify the actual command after leading CRLF comments', () => {
  const source =
    file(0, 'track a using sine {\n C4 quarter\n}') +
    '// @fourpataka-file {"id":"b","name":"bass.fourier"}\r\n// notes\r\n\r\nfrom song Other\r\ntrack b using sine {\r\n C2 half\r\n}';
  const index = indexScoreFiles(source),
    diagnostic = index.diagnostics[0];
  expect(source.slice(diagnostic.from, diagnostic.to).trim()).toBe('from song Other');
  expect(diagnostic.line).toBe(source.slice(0, diagnostic.from).split('\n').length);
  const missing = source.replace('from song Other\r\n', '');
  expect(
    missing
      .slice(
        indexScoreFiles(missing).diagnostics[0].from,
        indexScoreFiles(missing).diagnostics[0].to,
      )
      .trim(),
  ).toBe('track b using sine {');
});
it('legacy promotion and song-link insertion preserve custom source and do not duplicate headers', () => {
  const source = '// custom\r\ntrack a using sine {\r\n C4 quarter\r\n}';
  const linked = insertCommand(source, ['sine'], 'from-song', 'a', 'sine');
  expect(linked).toBe('from song Song\n' + source);
  expect(insertCommand(linked, ['sine'], 'from-song', 'a', 'sine')).toBe(linked);
  const workspace = ensureScoreFiles(linked, indexScoreFiles(linked), 'Other');
  expect(workspace.endsWith(linked)).toBe(true);
  expect(workspace.match(/from song/g)).toHaveLength(1);
});
