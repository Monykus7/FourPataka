import { describe, expect, it } from 'vitest';
import {
  indexScoreViews,
  editTrackView,
  renameTrackSource,
  removeTrackSource,
  moveTrackOwnership,
  projectScoreView,
  removeTrackOwnership,
} from '../../src/core/scoreWorkspace';
import { createProject, reconcileTracks } from '../../src/core/project';
import { parseScore } from '../../src/core/parser';

const source =
  '// retained { }\r\ntempo 116\r\ntrack lead using sine { // header\r\n repeat 2 {\r\n legato[C4 quarter]\r\n }\r\n} // tail\r\ntime 7/8 at 4\r\ntrack bass using softBass {\r\n C2 whole\r\n}\r\n';
describe('single-source track views', () => {
  it('maps CRLF source spans to editor offsets and restores selected-view line endings', () => {
    const index = indexScoreViews(source),
      view = index.tracks[0];
    const projection = projectScoreView(source, view);
    const at = source.indexOf('C4');
    expect(projection.text.slice(projection.toLocal(at), projection.toLocal(at + 2))).toBe('C4');
    expect(projection.toCanonical(projection.toLocal(at))).toBe(at);
    expect(projection.restore(projection.text)).toBe(source.slice(view.from, view.to));
    const result = editTrackView(
      source,
      index,
      'lead',
      projection.restore(projection.text.replace('C4', 'A4')),
    );
    expect(result.text).toBe(source.replace('C4', 'A4'));
    expect(projectScoreView('track all using sine {\nC4 quarter\n}').toLocal(26)).toBe(26);
  });
  it('indexes nested braces/brackets while preserving canonical CRLF offsets and outside globals', () => {
    const index = indexScoreViews(source);
    expect(index.problem).toBeNull();
    expect(index.tracks.map((view) => view.key)).toEqual(['lead', 'bass']);
    const lead = index.tracks[0];
    expect(source.slice(lead.from, lead.to)).toBe(
      'track lead using sine { // header\r\n repeat 2 {\r\n legato[C4 quarter]\r\n }\r\n}',
    );
    expect(source.slice(lead.keyFrom, lead.keyTo)).toBe('lead');
    expect(lead.firstLine).toBe(3);
    const changed = editTrackView(
      source,
      index,
      'lead',
      source.slice(lead.from, lead.to).replace('C4', 'G4'),
    );
    expect(changed.text).toBe(source.replace('C4', 'G4'));
    expect(changed.trackKey).toBe('lead');
  });
  it('refuses stale revisions and ambiguous structure instead of guessing a patch', () => {
    const index = indexScoreViews(source);
    expect(() => editTrackView(source + '// new', index, 'lead', '')).toThrow('score changed');
    for (const text of [
      'track lead using sine {',
      'track x using sine { repeat 2 { C4 quarter\n}',
      'track x using sine { legato[C4 quarter }',
      'track x using sine { bogus {\n}\n}',
      '}',
      'track x using sine {\n}\ntrack x using sine {\n}',
      'track x using sine { track y using sine {\n}\n}',
    ]) {
      expect(indexScoreViews(text).problem, text).not.toBeNull();
      expect(indexScoreViews(text).tracks, text).toEqual([]);
    }
  });
  it('retains incomplete edits and exposes boundary changes in the full score', () => {
    const index = indexScoreViews(source),
      view = index.tracks[0];
    const unfinished = source.slice(view.from, view.to - 1);
    const result = editTrackView(source, index, 'lead', unfinished);
    expect(result.text).toBe(source.slice(0, view.from) + unfinished + source.slice(view.to));
    expect(result.trackKey).toBeNull();
    expect(
      editTrackView(source, index, 'lead', 'track lead using sine {\nC4 quarter\n}\ntempo 120')
        .trackKey,
    ).toBeNull();
  });
  it('renames/deletes only the indexed block and diagnoses collisions or illegal names', () => {
    const index = indexScoreViews(source),
      view = index.tracks[0];
    expect(renameTrackSource(source, index, 'lead', 'melody')).toBe(
      source.replace('track lead', 'track melody'),
    );
    expect(() => renameTrackSource(source, index, 'lead', 'bass')).toThrow('already');
    expect(() => renameTrackSource(source, index, 'lead', 'bad name')).toThrow('starting');
    expect(removeTrackSource(source, index, 'lead')).toBe(
      source.slice(0, view.from) + source.slice(view.to),
    );
  });
  it('explicit deletion removes copies even when the remaining source has no tracks', () => {
    const project = createProject();
    const key = project.tracks[0].key;
    const result = removeTrackOwnership(project, key);
    expect(result.tracks.some((t) => t.key === key)).toBe(false);
    expect(result.processing.tracks[key]).toBeUndefined();
    expect(project.tracks.some((t) => t.key === key)).toBe(true);
  });
  it('moves owned sounds, levels, chains and comparison selection through rename and reconciliation', () => {
    let project = createProject();
    project.scoreText = source;
    const keys = project.instruments.map((i) => i.key),
      chains = project.processing.library.map((i) => i.key);
    project = reconcileTracks(project, parseScore(source, keys, chains));
    project.tracks[0].sound.harmonics[3] = 0.37;
    project.tracks[0].level = 0.23;
    project.processing.tracks.lead.bypass = true;
    project.comparisonMaterial.trackKey = 'lead';
    const renamed = {
      ...moveTrackOwnership(project, 'lead', 'melody'),
      scoreText: renameTrackSource(source, indexScoreViews(source), 'lead', 'melody'),
    };
    const result = reconcileTracks(renamed, parseScore(renamed.scoreText, keys, chains));
    expect(result.tracks[0]).toEqual({ ...project.tracks[0], key: 'melody' });
    expect(result.processing.tracks.melody).toEqual(project.processing.tracks.lead);
    expect(result.processing.tracks.lead).toBeUndefined();
    expect(result.comparisonMaterial.trackKey).toBe('melody');
    expect(project.tracks[0].key).toBe('lead');
  });
});
