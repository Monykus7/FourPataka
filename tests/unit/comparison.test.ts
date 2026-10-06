import { describe, expect, it } from 'vitest';
import { comparisonPhrase, DEFAULT_MATERIAL } from '../../src/core/comparison';
import { createProject, importProject, reconcileTracks } from '../../src/core/project';
import { parseScore } from '../../src/core/parser';

let project = createProject();
// Keep clipping expectations independent of the evolving starter song.
project.scoreText =
  'tempo 120\ntrack melody using brightReed {\n C5 quarter\n chord:(Bb D F)5 8th\n rest 8th\n G5 half\n}\ntrack bass using softBass {\n Bb2 half\n F2 half\n}';
project = reconcileTracks(
  project,
  parseScore(
    project.scoreText,
    project.instruments.map((p) => p.key),
    project.processing.library.map((p) => p.key),
  ),
);
const score = parseScore(
  project.scoreText,
  project.instruments.map((i) => i.key),
);
describe('shared A/B musical material', () => {
  it('uses one track, preserves rests and chords, and rebases clipped boundaries', () => {
    const phrase = comparisonPhrase(score, {
      ...DEFAULT_MATERIAL,
      kind: 'phrase',
      fromBeat: 0.5,
      toBeat: 3,
    });
    expect(phrase.tempo).toBe(120);
    expect(phrase.beats).toBe(2.5);
    expect(phrase.events.map((e) => [e.beat, e.duration])).toEqual([
      [0, 0.5],
      [0.5, 0.5],
      [1, 0.5],
      [1.5, 1],
    ]);
    expect(phrase.events[1].notes).toEqual(['Bb5', 'D5', 'F5']);
    expect(phrase.events[2].notes).toEqual([]);
    expect(phrase.events.some((e) => e.notes.includes('Bb2'))).toBe(false);
  });
  it('preserves the whole phrase and makes independent event arrays', () => {
    const phrase = comparisonPhrase(score, { ...DEFAULT_MATERIAL, kind: 'phrase' });
    expect(phrase.beats).toBe(4);
    phrase.events[0].notes[0] = 'A4';
    expect(score.events[0].notes).toEqual(['C5']);
  });
  it('keeps note/chord audition usable with an unfinished score', () => {
    const invalid = parseScore('', []);
    expect(comparisonPhrase(invalid, DEFAULT_MATERIAL).events[0].notes).toEqual(['C4']);
    expect(
      comparisonPhrase(invalid, { ...DEFAULT_MATERIAL, kind: 'chord' }).events[0].notes,
    ).toEqual(['Bb4', 'D5', 'F5']);
    expect(() => comparisonPhrase(invalid, { ...DEFAULT_MATERIAL, kind: 'phrase' })).toThrow(
      'diagnostics',
    );
  });
  it.each([{ trackKey: 'missing' }, { fromBeat: 4 }, { fromBeat: -1 }, { fromBeat: 2, toBeat: 1 }])(
    'rejects an unusable phrase range %j',
    (overrides) => {
      expect(() =>
        comparisonPhrase(score, { ...DEFAULT_MATERIAL, kind: 'phrase', ...overrides }),
      ).toThrow();
    },
  );
  it('migrates existing version 1 projects without changing their sounds', () => {
    const old = structuredClone(project) as any;
    delete old.comparisonMaterial;
    const restored = importProject(JSON.stringify(old));
    expect(restored.comparisonMaterial).toEqual(DEFAULT_MATERIAL);
    expect(restored.comparison).toEqual(project.comparison);
  });
  it('saves phrase selection outside snapshots and round trips it', () => {
    const selected = {
      ...project,
      comparisonMaterial: { ...DEFAULT_MATERIAL, kind: 'phrase' as const, fromBeat: 1, toBeat: 3 },
    };
    expect(importProject(JSON.stringify(selected))).toEqual(selected);
  });
  it.each([{ kind: 'other' }, { note: 'C9' }, { fromBeat: null }, { fromBeat: 2, toBeat: 1 }])(
    'rejects invalid saved material %j',
    (overrides) => {
      expect(() =>
        importProject(
          JSON.stringify({ ...project, comparisonMaterial: { ...DEFAULT_MATERIAL, ...overrides } }),
        ),
      ).toThrow();
    },
  );
});
