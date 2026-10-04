import { expect, it } from 'vitest';
import { saveLocalProject, type LocalStore } from '../../src/core/localSave';
import { createProject, RECOVERY_KEY, STORAGE_KEY, UNREADABLE_KEY } from '../../src/core/project';

function memoryStore(): LocalStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

it('keeps the previous distinct project across identical saves and canonicalized reloads', () => {
  const storage = memoryStore();
  const first = createProject();
  const original = JSON.stringify(first, null, 2);
  storage.setItem(STORAGE_KEY, original);
  storage.setItem(RECOVERY_KEY, 'older bytes');
  saveLocalProject(first, storage);
  expect(storage.getItem(RECOVERY_KEY)).toBe('older bytes');
  const edited = structuredClone(first);
  edited.comparison.B.harmonics[0] = 0.4;
  edited.processing.master.bypass = true;
  saveLocalProject(edited, storage);
  expect(storage.getItem(RECOVERY_KEY)).toBe(JSON.stringify(first));
  saveLocalProject(edited, storage);
  expect(storage.getItem(RECOVERY_KEY)).toBe(JSON.stringify(first));
  expect(first.comparison.B.harmonics[0]).toBe(1);
});

it('archives damaged bytes without replacing a valid recovery copy', () => {
  const storage = memoryStore();
  const prior = JSON.stringify(createProject());
  storage.setItem(RECOVERY_KEY, prior);
  storage.setItem(STORAGE_KEY, '{broken Ω\n');
  saveLocalProject(createProject(), storage);
  expect(storage.getItem(UNREADABLE_KEY)).toBe('{broken Ω\n');
  expect(storage.getItem(RECOVERY_KEY)).toBe(prior);
});

it('leaves the current save intact when a recovery write fails', () => {
  const storage = memoryStore();
  const current = createProject();
  const bytes = JSON.stringify(current);
  storage.setItem(STORAGE_KEY, bytes);
  const next = { ...current, name: 'Changed' };
  const blocked: LocalStore = {
    ...storage,
    setItem: () => {
      throw new Error('Quota exceeded');
    },
  };
  expect(() => saveLocalProject(next, blocked)).toThrow('Quota exceeded');
  expect(storage.getItem(STORAGE_KEY)).toBe(bytes);
});
