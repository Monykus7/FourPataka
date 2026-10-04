import { expect, it } from 'vitest';
import {
  loadProject,
  readRecoveryCopies,
  saveLocalProject,
  type LocalStore,
} from '../../src/core/localSave';
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
  edited.processing.master.bypassed = true;
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

it('loads a valid backup despite archival failure and does not hide corrupt backups as storage errors', () => {
  const storage = memoryStore();
  const prior = { ...createProject(), name: 'Saved work' };
  storage.setItem(STORAGE_KEY, '');
  storage.setItem(RECOVERY_KEY, JSON.stringify(prior));
  const blocked: LocalStore = {
    ...storage,
    setItem: () => {
      throw new Error('Quota exceeded');
    },
  };
  const result = loadProject(blocked);
  expect(result.project.name).toBe('Saved work');
  expect(result.warning).toContain('could not be archived');
  expect(result.recoveryIssue).toBe(true);
  storage.setItem(RECOVERY_KEY, '{bad backup');
  const fresh = loadProject(storage);
  expect(fresh.warning).toContain('fresh example');
  expect(fresh.warning).not.toContain('storage is unavailable');
  expect(storage.getItem(RECOVERY_KEY)).toBe('{bad backup');
  expect(storage.getItem(UNREADABLE_KEY)).toBe('');
});

it('captures exact raw snapshots, validation errors and UTF-8 bytes without mutating storage', () => {
  const storage = memoryStore();
  const prior = { ...createProject(), name: 'Recovered Ω' };
  const raw = JSON.stringify(prior, null, 2);
  storage.setItem(RECOVERY_KEY, raw);
  storage.setItem(UNREADABLE_KEY, '{Ω\n');
  const { copies, error } = readRecoveryCopies(storage);
  expect(error).toBeNull();
  expect(copies[0]).toMatchObject({ text: raw, project: { name: 'Recovered Ω' }, error: null });
  expect(copies[1]).toMatchObject({ text: '{Ω\n', bytes: 4, project: null });
  expect(copies[1].error).toBeTruthy();
  storage.setItem(RECOVERY_KEY, JSON.stringify(createProject()));
  expect(copies[0].text).toBe(raw);
  copies[0].project!.comparison.B.harmonics[0] = 0.2;
  expect(prior.comparison.B.harmonics[0]).toBe(1);
});

it('reports unavailable storage and absent copies without changing current work', () => {
  expect(readRecoveryCopies(memoryStore())).toEqual({ copies: [], error: null });
  const blocked: LocalStore = {
    getItem: () => {
      throw new Error('Access denied');
    },
    setItem: () => {},
  };
  expect(readRecoveryCopies(blocked).error).toContain('unavailable');
  expect(loadProject(blocked).warning).toContain('unavailable');
});

it('exposes the latest damaged bytes directly when archival cannot write, ahead of an older archive', () => {
  const storage = memoryStore();
  storage.setItem(STORAGE_KEY, '{latest damaged Ω');
  storage.setItem(RECOVERY_KEY, JSON.stringify(createProject()));
  storage.setItem(UNREADABLE_KEY, '{older damage');
  const full: LocalStore = {
    ...storage,
    setItem: () => {
      throw new Error('Quota exceeded');
    },
  };
  expect(loadProject(full).warning).toContain('could not be archived');
  const snapshot = readRecoveryCopies(full);
  expect(snapshot.copies).toHaveLength(2);
  expect(snapshot.copies[1]).toMatchObject({
    key: 'unreadable',
    label: 'Unreadable save (latest)',
    text: '{latest damaged Ω',
    project: null,
  });
  expect(storage.getItem(UNREADABLE_KEY)).toBe('{older damage');
});
