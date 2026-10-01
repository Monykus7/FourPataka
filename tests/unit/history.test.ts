import { expect, it } from 'vitest';
import { commit, redo, undo, type History } from '../../src/core/history';
it('groups a continuous gesture into one undo step and restores redo', () => {
  let h: History<number> = { past: [], present: 0, future: [] };
  h = commit(h, 1);
  h = commit(h, 2, true);
  h = commit(h, 3, true);
  expect(h.past).toEqual([0]);
  expect(undo(h).present).toBe(0);
  expect(redo(undo(h)).present).toBe(3);
  expect(commit(undo(h), 4).future).toEqual([]);
});
it('retains whole musical operations as a single undoable snapshot', () => {
  const before = { tracks: [1, 2], A: 4, B: 7 };
  const h = commit({ past: [], present: before, future: [] }, { tracks: [3, 3], A: 4, B: 7 });
  expect(undo(h).present).toEqual(before);
  expect(redo(undo(h)).present.tracks).toEqual([3, 3]);
});
