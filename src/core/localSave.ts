import { importProject, RECOVERY_KEY, STORAGE_KEY, UNREADABLE_KEY, type Project } from './project';

export interface LocalStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function saveLocalProject(project: Project, storage: LocalStore = localStorage): void {
  const next = JSON.stringify(project);
  const previous = storage.getItem(STORAGE_KEY);
  if (previous === next) return;
  if (previous !== null) {
    let valid: Project | null = null;
    try {
      valid = importProject(previous);
    } catch {
      storage.setItem(UNREADABLE_KEY, previous);
    }
    // Reloading/canonicalizing the same project must not consume the previous
    // distinct checkpoint. Keep original bytes, not a migrated serialization.
    if (valid && JSON.stringify(valid) !== JSON.stringify(importProject(next)))
      storage.setItem(RECOVERY_KEY, previous);
  }
  storage.setItem(STORAGE_KEY, next);
}
