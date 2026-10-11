import { expect, it } from 'vitest';
import {
  createProject,
  importProject,
  reconcileTracks,
  withExampleScore,
} from '../../src/core/project';
import { addScoreFile, indexScoreFiles, restoreFileSelection } from '../../src/core/scoreFiles';
import { parseScore } from '../../src/core/parser';
import { commit, undo } from '../../src/core/history';

it('one project JSON retains canonical files, open tabs and independent applied sounds', () => {
  let project = createProject();
  project.scoreText = 'track a using sine {\n C4 quarter\n}';
  project.scoreText = addScoreFile(
    project.scoreText,
    indexScoreFiles(project.scoreText),
    'ending',
    'ending.fourier',
    'Demo',
  );
  project.scoreWorkspace = { openFiles: ['ending'], activeFile: 'ending' };
  project = reconcileTracks(
    project,
    parseScore(
      project.scoreText,
      project.instruments.map((p) => p.key),
    ),
  );
  project.tracks[0].sound.harmonics[0] = 0.31;
  const loaded = importProject(
    JSON.stringify({ ...project, scoreWorkspace: { ...project.scoreWorkspace, unknown: true } }),
  );
  expect(loaded.scoreText).toBe(project.scoreText);
  expect(loaded.scoreWorkspace).toEqual({ openFiles: ['ending'], activeFile: 'ending' });
  expect(loaded.tracks[0].sound.harmonics[0]).toBe(0.31);
  expect(loaded.tracks[0].sound).not.toBe(project.tracks[0].sound);
  expect(withExampleScore(loaded).scoreWorkspace).toBeUndefined();
});
it('legacy imports remain unchanged, malformed tab metadata rejects and stale IDs recover', () => {
  const project = createProject();
  expect(importProject(JSON.stringify(project)).scoreWorkspace).toBeUndefined();
  expect(
    importProject(
      JSON.stringify({
        ...project,
        scoreWorkspace: { openFiles: ['gone', 'main'], activeFile: 'gone' },
      }),
    ).scoreWorkspace,
  ).toEqual({ openFiles: ['main'], activeFile: 'main' });
  expect(() =>
    importProject(
      JSON.stringify({ ...project, scoreWorkspace: { openFiles: ['main'], activeFile: 'gone' } }),
    ),
  ).toThrow('selection');
  const raw = {
    ...project,
    scoreText: '// @fourpataka-file broken',
    scoreWorkspace: { openFiles: ['main'], activeFile: 'main' },
  };
  const recovered = importProject(JSON.stringify(raw));
  expect(recovered.scoreText).toBe(raw.scoreText);
  expect(recovered.scoreWorkspace).toEqual({ openFiles: [], activeFile: null });
});
it('note history preserves the current file selection while file removal remains one reversible operation', () => {
  const first = {
    scoreText: 'track a using sine {\n C4 quarter\n}',
    scoreWorkspace: { openFiles: ['main'], activeFile: 'main' as string | null },
  };
  const second = { ...first, scoreText: first.scoreText.replace('C4', 'D4') };
  let history = commit({ past: [], present: first, future: [] }, second);
  const current = { ...history.present, scoreWorkspace: { openFiles: [], activeFile: null } };
  expect(restoreFileSelection(undo(history).present, current).scoreWorkspace).toEqual(
    current.scoreWorkspace,
  );
  const source = addScoreFile(
    first.scoreText,
    indexScoreFiles(first.scoreText),
    'ending',
    'ending.fourier',
    'Demo',
  );
  const created = {
    scoreText: source,
    scoreWorkspace: { openFiles: ['main', 'ending'], activeFile: 'ending' },
  };
  history = commit(history, created);
  const back = restoreFileSelection(undo(history).present, created);
  expect(back.scoreText).toBe(second.scoreText);
  expect(back.scoreWorkspace).toEqual(first.scoreWorkspace);
});
