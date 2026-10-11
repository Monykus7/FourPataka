import { expect, it } from 'vitest';
import { indexScoreFiles, FILE_MARKER } from '../../src/core/scoreFiles';
import {
  editTrackView,
  indexScoreViews,
  removeTrackSource,
  renameTrackSource,
} from '../../src/core/scoreWorkspace';
import {
  appendTrack,
  insertCommand,
  setScoreChain,
  setScoreDirective,
  setScoreInstrument,
} from '../../src/core/scoreTools';
import { applyPreset, createProject, reconcileTracks } from '../../src/core/project';
import { parseScore } from '../../src/core/parser';

const source = [0, 1]
  .map(
    (i) =>
      `${FILE_MARKER}${JSON.stringify({ id: `file${i}`, name: `part${i}.fourier` })}\r\nfrom song Demo\r\ntrack a using sine { // retained ${i}\r\n C4 quarter\r\n}\r\n`,
  )
  .join('');
it('edits the addressed part while explicit track rename covers all files', () => {
  const index = indexScoreViews(source);
  expect(index.problem).toBeNull();
  expect(index.tracks).toHaveLength(2);
  const part = index.tracks[1];
  const edited = editTrackView(
    source,
    index,
    'a',
    source.slice(part.from, part.to).replace('C4', 'D4'),
    'file1',
  );
  expect(edited.text.slice(0, part.from)).toBe(source.slice(0, part.from));
  expect(parseScore(edited.text, ['sine']).tracks[0].events.map((e) => e.notes[0])).toEqual([
    'C4',
    'D4',
  ]);
  const split = editTrackView(
    source,
    index,
    'a',
    source.slice(part.from, part.to).replace('track a', 'track b'),
    'file1',
  );
  expect(split.renameOwnership).toBe(false);
  const renamed = renameTrackSource(source, index, 'a', 'melody');
  expect(parseScore(renamed, ['sine']).tracks.map((t) => t.key)).toEqual(['melody']);
  expect(renamed.match(/track melody/g)).toHaveLength(2);
  expect(
    parseScore(removeTrackSource(source, index, 'a', 'file1'), ['sine']).tracks[0].events,
  ).toHaveLength(1);
  expect(() => editTrackView(renamed, index, 'a', 'lost', 'file1')).toThrow('changed');
});
it('instrument and pedal assignment helpers update every part without rewriting comments', () => {
  const keys = ['sine', 'square'];
  const instrument = setScoreInstrument(source, keys, [], 'a', 'square');
  expect(instrument).toBe(source.replaceAll('using sine', 'using square'));
  const routed = setScoreChain(instrument, keys, ['clean'], 'a', 'clean');
  expect(parseScore(routed, keys, ['clean']).diagnostics).toEqual([]);
  expect(routed.match(/through clean/g)).toHaveLength(2);
  expect(setScoreChain(routed, keys, ['clean'], 'a', null)).toBe(instrument);
  let project = createProject();
  project.scoreText = source;
  project = reconcileTracks(
    project,
    parseScore(
      source,
      project.instruments.map((p) => p.key),
    ),
  );
  project.tracks[0].sound.harmonics[0] = 0.37;
  const preset = project.instruments.find((p) => p.key === 'square')!;
  const updated = applyPreset(project, preset.id, preset.sound, ['a']);
  expect(updated.scoreText.match(/using square/g)).toHaveLength(2);
  expect(updated.tracks).toHaveLength(1);
  expect(updated.tracks[0].sound).not.toBe(preset.sound);
  expect(project.tracks[0].sound.harmonics[0]).toBe(0.37);
});
it('commands target the selected file and new globals follow its song link', () => {
  const inserted = insertCommand(
    source,
    ['sine'],
    'note',
    'a',
    'sine',
    [],
    undefined,
    undefined,
    'file0',
  );
  const oldFiles = indexScoreFiles(source),
    newFiles = indexScoreFiles(inserted);
  expect(inserted.slice(newFiles.files[1].markerFrom)).toBe(
    source.slice(oldFiles.files[1].markerFrom),
  );
  expect(parseScore(inserted, ['sine']).tracks[0].events.map((e) => e.fileId)).toEqual([
    'file0',
    'file0',
    'file1',
  ]);
  const tempo = setScoreDirective(source, ['sine'], 'tempo', '96');
  expect(indexScoreFiles(tempo).diagnostics).toEqual([]);
  expect(parseScore(tempo, ['sine']).tempo).toBe(96);
  expect(
    parseScore(setScoreDirective('from song Demo', ['sine'], 'tempo', '96'), [
      'sine',
    ]).diagnostics.map((d) => d.message),
  ).toEqual(['Add a track to start composing.']);
  const master = setScoreChain(source, ['sine'], ['clean'], null, 'clean');
  expect(parseScore(master, ['sine'], ['clean']).diagnostics).toEqual([]);
  const next = appendTrack(source, ['sine'], 'bass', 'sine', ['C2 whole'], [], null, 'file0');
  expect(parseScore(next, ['sine']).tracks.find((t) => t.key === 'bass')!.parts[0].fileId).toBe(
    'file0',
  );
  const extended = appendTrack(next, ['sine'], 'bass', 'sine', ['D2 quarter'], [], null, 'file1');
  expect(parseScore(extended, ['sine']).tracks.find((t) => t.key === 'bass')!.beats).toBe(5);
});
