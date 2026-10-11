import { expect, it } from 'vitest';
import { createProject } from '../../src/core/project';
import {
  createInstrumentFolder,
  moveInstrumentToFolder,
  readInstrumentFolders,
  removeInstrumentFolder,
  renameInstrumentFolder,
  withDefaultInstrumentFolders,
} from '../../src/core/instrumentFolders';
import { commit, undo, redo } from '../../src/core/history';

it('seeds only recognized factory shapes once and respects explicit unfiled organization', () => {
  const old = createProject();
  delete old.instrumentFolders;
  old.instruments.find((p) => p.key === 'sine')!.id = 'my-sine';
  const next = withDefaultInstrumentFolders(old);
  expect(next.instrumentFolders).toEqual([{ id: 'simple-shapes', label: 'Simple shapes' }]);
  expect(next.instruments.filter((p) => p.folderId).map((p) => p.key)).toEqual([
    'square',
    'saw',
    'triangle',
  ]);
  expect(withDefaultInstrumentFolders(next)).toBe(next);
  expect(withDefaultInstrumentFolders({ ...old, instrumentFolders: [] })).toEqual({
    ...old,
    instrumentFolders: [],
  });
  expect(next.tracks).toBe(old.tracks);
  expect(next.comparison).toBe(old.comparison);
});

it('folder edits and moves preserve keys, versions, Sound references, score, copies and grouped history', () => {
  const old = withDefaultInstrumentFolders(createProject());
  const before = structuredClone(old);
  const created = createInstrumentFolder(old, '  Percussion  ', 'drums');
  const moved = moveInstrumentToFolder(created, 'kick', 'drums');
  const kick = old.instruments.find((p) => p.id === 'kick')!;
  expect(moved.instruments.find((p) => p.id === 'kick')).toEqual({ ...kick, folderId: 'drums' });
  expect(moved.instruments.find((p) => p.id === 'kick')!.sound).toBe(kick.sound);
  expect(moved.scoreText).toBe(old.scoreText);
  expect(moved.tracks).toBe(old.tracks);
  expect(moved.comparison).toBe(old.comparison);
  expect(moved.processing).toBe(old.processing);
  expect(moveInstrumentToFolder(moved, 'kick', 'drums')).toBe(moved);
  expect(renameInstrumentFolder(moved, 'drums', 'Drum kit').instrumentFolders!.at(-1)!.label).toBe(
    'Drum kit',
  );
  const history = commit({ past: [], present: created, future: [] }, moved);
  expect(undo(history).present).toBe(created);
  expect(redo(undo(history)).present).toBe(moved);
  const unfiled = moveInstrumentToFolder(moved, 'kick', null);
  expect(unfiled.instruments.find((p) => p.id === 'kick')).toEqual(kick);
  expect(old).toEqual(before);
});

it('removing a folder returns all its instruments to unfiled without deleting or changing sounds', () => {
  const project = withDefaultInstrumentFolders(createProject());
  const removed = removeInstrumentFolder(project, 'simple-shapes');
  expect(removed.instrumentFolders).toEqual([]);
  expect(removed.instruments).toHaveLength(project.instruments.length);
  expect(removed.instruments.every((p) => p.folderId === undefined)).toBe(true);
  expect(removed.instruments.map((p) => p.sound)).toEqual(project.instruments.map((p) => p.sound));
  expect(withDefaultInstrumentFolders(removed)).toBe(removed);
});

it('bounds and validates folder metadata and rejects stale move destinations', () => {
  const project = withDefaultInstrumentFolders(createProject());
  for (const label of ['', ' '.repeat(3), 'x'.repeat(101), 'simple SHAPES'])
    expect(() => createInstrumentFolder(project, label, 'new')).toThrow();
  expect(() => createInstrumentFolder(project, 'New', 'simple-shapes')).toThrow();
  expect(() => moveInstrumentToFolder(project, 'missing', null)).toThrow();
  expect(() => moveInstrumentToFolder(project, 'kick', 'missing')).toThrow();
  for (const value of [
    null,
    {},
    [{ id: 'a', label: '' }],
    [
      { id: 'a', label: 'One' },
      { id: 'a', label: 'Two' },
    ],
    [
      { id: 'a', label: 'One' },
      { id: 'b', label: 'one' },
    ],
    Array.from({ length: 33 }, (_, i) => ({ id: `f${i}`, label: `Folder ${i}` })),
  ])
    expect(() => readInstrumentFolders(value)).toThrow();
  expect(readInstrumentFolders([{ id: 'a', label: '  Drum kit ', unknown: true }])).toEqual([
    { id: 'a', label: 'Drum kit' },
  ]);
});
