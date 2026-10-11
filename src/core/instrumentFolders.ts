import type { InstrumentFolder, Project } from './project';

export const MAX_INSTRUMENT_FOLDERS = 32;
const SIMPLE_KEYS = ['sine', 'square', 'saw', 'triangle'];

export function withDefaultInstrumentFolders(project: Project): Project {
  // An explicit empty array means the user removed all folders. Seed only
  // legacy projects, and identify factory shapes by both ID and score key.
  if (project.instrumentFolders !== undefined) return project;
  const shapes = project.instruments.filter((p) => p.id === p.key && SIMPLE_KEYS.includes(p.key));
  if (!shapes.length) return { ...project, instrumentFolders: [] };
  const ids = new Set(shapes.map((p) => p.id));
  return {
    ...project,
    instrumentFolders: [{ id: 'simple-shapes', label: 'Simple shapes' }],
    instruments: project.instruments.map((p) =>
      ids.has(p.id) ? { ...p, folderId: 'simple-shapes' } : p,
    ),
  };
}

function folderLabel(project: Project, label: string, exceptId?: string): string {
  const trimmed = label.trim();
  if (!trimmed || trimmed.length > 100) throw new Error('Enter a folder name of 1–100 characters.');
  if (
    project.instrumentFolders?.some(
      (f) => f.id !== exceptId && f.label.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    )
  )
    throw new Error('A folder with that name already exists.');
  return trimmed;
}

export function createInstrumentFolder(project: Project, label: string, id: string): Project {
  const folders = project.instrumentFolders ?? [];
  if (folders.length >= MAX_INSTRUMENT_FOLDERS)
    throw new Error('This project has reached its limit of 32 instrument folders.');
  if (!id || id.length > 100 || folders.some((f) => f.id === id))
    throw new Error('Folder IDs must be valid and unique.');
  return {
    ...project,
    instrumentFolders: [...folders, { id, label: folderLabel(project, label) }],
  };
}

export function renameInstrumentFolder(project: Project, id: string, label: string): Project {
  const folder = project.instrumentFolders?.find((f) => f.id === id);
  if (!folder) throw new Error('This instrument folder no longer exists.');
  const next = folderLabel(project, label, id);
  if (next === folder.label) return project;
  return {
    ...project,
    instrumentFolders: project.instrumentFolders!.map((f) =>
      f.id === id ? { ...f, label: next } : f,
    ),
  };
}

export function moveInstrumentToFolder(
  project: Project,
  presetId: string,
  folderId: string | null,
): Project {
  const preset = project.instruments.find((p) => p.id === presetId);
  if (!preset) throw new Error('This instrument no longer exists.');
  if (folderId !== null && !project.instrumentFolders?.some((f) => f.id === folderId))
    throw new Error('This instrument folder no longer exists.');
  if ((preset.folderId ?? null) === folderId) return project;
  // Organization never reloads/reapplies a sound: only the preset's membership
  // changes. Its ID/key/version/Sound and every applied snapshot stay owned.
  return {
    ...project,
    instruments: project.instruments.map((p) => {
      if (p.id !== presetId) return p;
      const { folderId: _oldFolder, ...unfiled } = p;
      return folderId === null ? unfiled : { ...p, folderId };
    }),
  };
}

export function removeInstrumentFolder(project: Project, id: string): Project {
  if (!project.instrumentFolders?.some((f) => f.id === id)) return project;
  return {
    ...project,
    instrumentFolders: project.instrumentFolders.filter((f) => f.id !== id),
    instruments: project.instruments.map((p) => {
      if (p.folderId !== id) return p;
      const { folderId: _oldFolder, ...unfiled } = p;
      return unfiled;
    }),
  };
}

export function readInstrumentFolders(value: unknown): InstrumentFolder[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX_INSTRUMENT_FOLDERS)
    throw new Error('Expected at most 32 instrument folders.');
  const ids = new Set<string>();
  const labels = new Set<string>();
  return value.map((folder) => {
    if (
      !folder ||
      typeof folder !== 'object' ||
      typeof folder.id !== 'string' ||
      !folder.id ||
      folder.id.length > 100 ||
      ids.has(folder.id)
    )
      throw new Error('Folder IDs must be valid and unique.');
    if (
      typeof folder.label !== 'string' ||
      !folder.label.trim() ||
      folder.label.length > 100 ||
      labels.has(folder.label.trim().toLocaleLowerCase())
    )
      throw new Error('Folder names must be unique and contain 1–100 characters.');
    ids.add(folder.id);
    labels.add(folder.label.trim().toLocaleLowerCase());
    return { id: folder.id, label: folder.label.trim() };
  });
}
