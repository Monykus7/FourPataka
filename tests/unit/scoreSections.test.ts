import { expect, it } from 'vitest';
import { lexScore } from '../../src/core/scoreLexer';
import {
  indexScoreSections,
  renameSectionSource,
  sectionNamesAt,
} from '../../src/core/scoreSections';
import { indexScoreViews } from '../../src/core/scoreWorkspace';
import { parseScore } from '../../src/core/parser';
import { prepareExport } from '../../src/audio/export';
import { createProject } from '../../src/core/project';
import { DEFAULT_WAV_OPTIONS } from '../../src/core/wav';
import { readFileSync } from 'node:fs';

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

it('bounds local definitions and call depth even for empty sections', () => {
  const definitions = Array.from({ length: 65 }, (_, i) => `section S${i} {\n}\n`).join('');
  const capped = parseScore(`track a using sine {\n${definitions}}`, ['sine']);
  expect(capped.sections).toHaveLength(64);
  expect(capped.diagnostics.some((d) => d.message.includes('64 named'))).toBe(true);
  const chain = (count: number) =>
    Array.from(
      { length: count },
      (_, i) => `section S${i} {\n${i + 1 < count ? `play S${i + 1}` : 'C4 quarter'}\n}\n`,
    ).join('');
  expect(parseScore(`track a using sine {\n${chain(16)}play S0\n}`, ['sine']).diagnostics).toEqual(
    [],
  );
  expect(
    parseScore(`track a using sine {\n${chain(17)}play S0\n}`, ['sine']).diagnostics.some((d) =>
      d.message.includes('16 levels'),
    ),
  ).toBe(true);
  const emptyCalls = parseScore(
    'track a using sine {\n section A {\n}\nrepeat 128 {\n repeat 128 {\n play A\n}\n}\n}',
    ['sine'],
  );
  expect(emptyCalls.events).toEqual([]);
  expect(emptyCalls.sectionInvocations.length).toBeLessThanOrEqual(10000);
  expect(emptyCalls.diagnostics.some((d) => d.message.includes('10,000 section calls'))).toBe(true);
});

it('previews each source chord once including declarations and fully trimmed notes', () => {
  const parsed = parseScore(
    'track a using sine {\n section A {\n chord:Cwide2@3 quarter\n}\n section B {\n chord:Fmaj7 half\n}\n repeat 3 {\n play A\n}\n play B trim 2\n}',
    ['sine'],
  );
  expect(parsed.diagnostics).toEqual([]);
  expect(parsed.events).toHaveLength(3);
  expect(parsed.chordPreviews.map((c) => c.symbol)).toEqual(['Cwide2@3', 'Fmaj7']);
  const unused = parseScore('track a using sine {\n section A {\n chord:Cmaj7 half\n}\n}', [
    'sine',
  ]);
  expect(unused.chordPreviews).toHaveLength(1);
  expect(unused.events).toEqual([]);
  expect(unused.beats).toBe(0);
});

it('WAV preflight freezes the whole performed score while keeping independent track sounds', () => {
  const project = createProject();
  project.scoreText =
    'tempo 60\ntrack a using sine {\n section A {\n C4 half\n D4 quarter\n}\n play A trim 0.5 {\n E4 quarter\n}\n}';
  const plan = prepareExport(project, DEFAULT_WAV_OPTIONS);
  expect(plan.score.events.map((e) => [e.beat, e.duration])).toEqual([
    [0, 2],
    [2, 0.5],
    [2.5, 1],
  ]);
  const original = plan.snapshot.tracks[0].sound.harmonics[0];
  project.scoreText = '';
  project.instruments.find((p) => p.key === 'sine')!.sound.harmonics[0] = 0;
  expect(plan.snapshot.scoreText).toContain('play A trim');
  expect(plan.snapshot.tracks[0].sound.harmonics[0]).toBe(original);
});

it('the contributor passage example produces its documented nine beats', () => {
  const guide = readFileSync('docs/extensions/NAMED_SECTIONS.md', 'utf8');
  const example = /```text\n([\s\S]*?)```/.exec(guide)![1];
  const compiled = parseScore(example, ['sine']);
  expect(compiled.diagnostics).toEqual([]);
  expect(compiled.sectionInvocations.map((call) => call.duration)).toEqual([4, 5]);
  expect(compiled.beats).toBe(9);
  expect(compiled.seconds).toBe(4.5);
});
