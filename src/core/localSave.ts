import {
  createProject,
  importProject,
  RECOVERY_KEY,
  STORAGE_KEY,
  UNREADABLE_KEY,
  type Project,
} from './project';

export interface LocalStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RecoveryCopy {
  key: 'previous' | 'unreadable';
  label: string;
  text: string;
  bytes: number;
  project: Project | null;
  error: string | null;
}

export function readRecoveryCopies(storage?: LocalStore): {
  copies: RecoveryCopy[];
  error: string | null;
} {
  const copies: RecoveryCopy[] = [];
  let error: string | null = null;
  for (const [key, label, storageKey] of [
    ['previous', 'Previous autosave', RECOVERY_KEY],
    ['unreadable', 'Unreadable save', UNREADABLE_KEY],
  ] as const) {
    try {
      const text = (storage ?? localStorage).getItem(storageKey);
      if (text === null) continue;
      let project: Project | null = null;
      let validation: string | null = null;
      try {
        project = importProject(text);
      } catch (e) {
        validation = (e as Error).message;
      }
      copies.push({
        key,
        label,
        text,
        bytes: new TextEncoder().encode(text).length,
        project,
        error: validation,
      });
    } catch {
      error = 'Local storage is unavailable. Your current session is unchanged.';
    }
  }
  try {
    const latest = (storage ?? localStorage).getItem(STORAGE_KEY);
    if (latest !== null) {
      try {
        importProject(latest);
      } catch (e) {
        // A full store may reject archival. Expose the damaged current bytes
        // directly without another write, preferring them over an older archive.
        const index = copies.findIndex((copy) => copy.key === 'unreadable');
        if (index < 0 || copies[index].text !== latest) {
          const copy: RecoveryCopy = {
            key: 'unreadable',
            label: 'Unreadable save (latest)',
            text: latest,
            bytes: new TextEncoder().encode(latest).length,
            project: null,
            error: (e as Error).message,
          };
          if (index < 0) copies.push(copy);
          else copies[index] = copy;
        }
      }
    }
  } catch {
    error = 'Local storage is unavailable. Your current session is unchanged.';
  }
  return { copies, error };
}

export function loadProject(storage?: LocalStore): {
  project: Project;
  warning: string | null;
  recoveryIssue: boolean;
} {
  try {
    const store = storage ?? localStorage;
    const stored = store.getItem(STORAGE_KEY);
    if (stored === null) return { project: createProject(), warning: null, recoveryIssue: false };
    try {
      const project = importProject(stored);
      const savedInstruments = JSON.parse(stored).instruments;
      const before = savedInstruments.find((preset: { id: string }) => preset.id === 'soft-bass');
      const after = project.instruments.find((preset) => preset.id === 'soft-bass');
      const added = project.instruments.filter(
        (preset) => !savedInstruments.some((saved: { key: string }) => saved.key === preset.key),
      );
      const messages: string[] = [];
      if (before?.version === 1 && after?.version === 2)
        messages.push(
          'Soft bass library preset updated. Existing tracks and A/B sounds are kept. Load Soft bass from the library to use the new shape.',
        );
      if (added.length)
        messages.push(
          `Percussion presets added: ${added.map((p) => p.key).join(', ')}. Existing sounds kept.`,
        );
      return {
        project,
        recoveryIssue: false,
        warning: messages.join(' ') || null,
      };
    } catch {
      // Archiving failure must not prevent reading an available valid backup.
      let archived = true;
      try {
        store.setItem(UNREADABLE_KEY, stored);
      } catch {
        archived = false;
      }
      try {
        const backup = store.getItem(RECOVERY_KEY);
        if (backup !== null)
          return {
            project: importProject(backup),
            recoveryIssue: true,
            warning: `Recovered the previous local save. The latest save could not be read.${archived ? '' : ' Its damaged bytes could not be archived.'}`,
          };
      } catch {
        /* Both invalid copies stay available for raw export. */
      }
      return {
        project: createProject(),
        recoveryIssue: true,
        warning: `The local save could not be read. A fresh example is open; ${archived ? 'the unreadable save was kept in storage' : 'the damaged save could not be archived'}.`,
      };
    }
  } catch {
    return {
      project: createProject(),
      recoveryIssue: true,
      warning: 'Local storage is unavailable. Export JSON to keep your work.',
    };
  }
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
