import { expect, it } from 'vitest';
import { lexScore } from '../../src/core/scoreLexer';
import {
  indexScoreSections,
  renameSectionSource,
  sectionNamesAt,
} from '../../src/core/scoreSections';
import { indexScoreViews } from '../../src/core/scoreWorkspace';
import { parseScore } from '../../src/core/parser';

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

it('offers only current-track section names even with an unfinished play command or track body', () => {
  const text =
    'track melody using sine {\n section Verse {\n C4 quarter\n}\n play \n}\ntrack bass using sine {\n section Bass {\n C2 quarter\n}\n play ';
  expect(sectionNamesAt(text, text.indexOf('play ') + 5)).toEqual(['Verse']);
  expect(sectionNamesAt(text, text.length)).toEqual(['Bass']);
  expect(sectionNamesAt(text, 0)).toEqual(['Verse']);
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

it('defines without playing, resolves forward calls and reuses track-local sections with unique event IDs', () => {
  const score = parseScore(
    'track melody using sine {\n play A\n repeat 2 {\n play A\n}\n section A {\n C4 quarter\n D4 8th\n}\n}\ntrack bass using sine {\n section A {\n C2 whole\n}\n play A\n}',
    ['sine'],
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.tracks.map((t) => t.beats)).toEqual([4.5, 4]);
  expect(score.events.map((e) => e.notes[0])).toEqual(['C4', 'D4', 'C4', 'D4', 'C4', 'D4', 'C2']);
  expect(new Set(score.events.map((e) => e.id)).size).toBe(7);
  expect(score.sectionInvocations.map((c) => c.duration)).toEqual([1.5, 1.5, 1.5, 4]);
  expect(score.events[0].line).toBe(7);
  expect(score.events[0].sectionCalls![0].line).toBe(2);
  expect(
    parseScore('track a using sine {\n section A {\n C4 whole\n}\n}', ['sine']).events,
  ).toEqual([]);
});

it('inherits caller scales, recompiles positional bar rests and retains nested call provenance', () => {
  const score = parseScore(
    'time 4/4\ntrack a using sine {\n section A {\n C4 quarter\n rest bar\n}\n section B {\n play A\n}\n C4 quarter\n play B\n triplet[\n play A\n]\n}',
    ['sine'],
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.tracks[0].beats).toBe(8);
  expect(score.events.map((e) => e.duration)).toEqual([1, 1, 2, 2 / 3, 10 / 3]);
  expect(score.events[1].sectionCalls!.map((c) => c.name)).toEqual(['B', 'A']);
});

it('diagnoses unused invalid definitions, undefined/cyclic calls and bounded recursive expansion', () => {
  for (const text of [
    'section A {\n play Missing\n}',
    'section A {\n play B\n}\n section B {\n play A\n}',
    'section A {\n Q4 quarter\n}',
  ])
    expect(
      parseScore(`track a using sine {\n${text}\n}`, ['sine']).diagnostics.length,
    ).toBeGreaterThan(0);
  const explosive = parseScore(
    'track a using sine {\n section A {\n C4 64th\n}\n repeat 128 {\n repeat 128 {\n play A\n}\n}\n}',
    ['sine'],
  );
  expect(explosive.events.length).toBeLessThanOrEqual(10000);
  expect(explosive.sectionInvocations.length).toBeLessThanOrEqual(10000);
  expect(explosive.diagnostics.some((d) => /10,000|100,000/.test(d.message))).toBe(true);
});
