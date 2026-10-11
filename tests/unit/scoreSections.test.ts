import { expect, it } from 'vitest';
import { lexScore } from '../../src/core/scoreLexer';
import { indexScoreSections, renameSectionSource } from '../../src/core/scoreSections';
import { indexScoreViews } from '../../src/core/scoreWorkspace';

const source = `track melody using sine {
  section A {
    repeat 2 {
      C4 quarter
    }
  }
  play A trim 1/3 {
    D4 quarter
  }
  play A // A is a comment
}
track bass using sine {
  section A {
    C2 whole
  }
  play A
}`;

it('indexes named definitions calls and alternate-ending braces without losing track boundaries', () => {
  const index = indexScoreSections(source);
  expect(index.diagnostics).toEqual([]);
  expect(index.sections.map((s) => [s.track, s.name])).toEqual([
    ['melody', 'A'],
    ['bass', 'A'],
  ]);
  expect(index.references).toHaveLength(3);
  expect(index.references[0].token.trimExpression).toBe('1/3');
  expect(indexScoreViews(source).tracks.map((t) => t.key)).toEqual(['melody', 'bass']);
  expect(indexScoreViews(source).problem).toBeNull();
  for (const section of index.sections)
    expect(source.slice(section.from, section.to)).toMatch(/^section A \{/);
});

it('renames only a track-local definition and its real references, guarding stale spans', () => {
  const index = indexScoreSections(source);
  const renamed = renameSectionSource(source, index, 'melody', 'A', 'Verse');
  expect(renamed).toContain('section Verse');
  expect(renamed).toContain('play Verse trim 1/3');
  expect(renamed).toContain('play Verse // A is a comment');
  expect(renamed.slice(renamed.indexOf('track bass'))).toBe(
    source.slice(source.indexOf('track bass')),
  );
  expect(() => renameSectionSource(source + '\n', index, 'melody', 'A', 'B')).toThrow(
    'score changed',
  );
});

it('header names and trim expressions are not re-tokenized as repeat or bracket commands', () => {
  const tokens = lexScore(
    'track repeat using section {\n section repeat {\n C4 quarter\n}\n play repeat trim (4*2 + 7*3) / 3 {\n D4 quarter\n}\n}',
  );
  expect(tokens[0].kind).toBe('text');
  expect(tokens[1]).toMatchObject({ kind: 'section-open', sectionName: 'repeat' });
  expect(tokens[4]).toMatchObject({
    kind: 'ending-open',
    sectionName: 'repeat',
    trimExpression: '(4*2 + 7*3) / 3',
  });
});

it('retains CRLF offsets and diagnoses duplicate nested missing or malformed section boundaries', () => {
  const crlf = source.replace(/\n/g, '\r\n');
  const renamed = renameSectionSource(crlf, indexScoreSections(crlf), 'melody', 'A', 'B');
  expect(renamed.split('\r\n')).toHaveLength(source.split('\n').length);
  for (const bad of [
    'track a using sine {\n section A {\n C4 quarter\n}',
    'track a using sine {\n repeat 2 {\n section A {\n C4 quarter\n}\n}\n}',
    'track a using sine {\n section A {\n}\n section A {\n}\n}',
  ]) {
    const index = indexScoreSections(bad);
    expect(index.diagnostics.length || indexScoreViews(bad).problem).toBeTruthy();
  }
});
