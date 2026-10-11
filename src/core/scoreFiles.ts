import { SCORE_KEY } from './music';

export interface ScoreFile {
  id: string;
  name: string;
  markerFrom: number;
  from: number;
  to: number;
  firstLine: number;
  song?: string;
}
export interface ScoreFileIndex {
  source: string;
  explicit: boolean;
  files: ScoreFile[];
  song?: string;
  problem: string | null;
  diagnostics: { from: number; to: number; line: number; message: string }[];
}
export interface ScoreFileWorkspace {
  openFiles: string[];
  activeFile: string | null;
}
export const FILE_MARKER = '// @fourpataka-file ';
const fileName = (name: string) =>
  name.trim().length > 0 &&
  name.length <= 100 &&
  !/[\\/\r\n\x00-\x1f]/.test(name) &&
  !['.', '..'].includes(name.trim());

/** File boundaries live in the canonical source, so a tab never owns a second buffer. */
export function indexScoreFiles(source: string): ScoreFileIndex {
  const result: ScoreFileIndex = {
    source,
    explicit: false,
    files: [],
    problem: null,
    diagnostics: [],
  };
  let offset = 0;
  const names = new Set<string>(),
    ids = new Set<string>();
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i],
      trimmed = raw.trim();
    if (trimmed.startsWith('// @fourpataka-file')) {
      result.explicit = true;
      try {
        if (!trimmed.startsWith(FILE_MARKER)) throw new Error('Malformed file boundary.');
        const data: unknown = JSON.parse(trimmed.slice(FILE_MARKER.length));
        if (!data || typeof data !== 'object' || Array.isArray(data))
          throw new Error('Malformed file boundary.');
        const { id, name } = data as Record<string, unknown>;
        if (
          typeof id !== 'string' ||
          !SCORE_KEY.test(id) ||
          id.length > 100 ||
          typeof name !== 'string' ||
          !fileName(name)
        )
          throw new Error('Invalid file ID or name.');
        if (ids.has(id) || names.has(name.toLowerCase()))
          throw new Error('File IDs and names must be unique.');
        if (result.files.length >= 32)
          throw new Error('A song may contain at most 32 score files.');
        if (result.files.length) result.files[result.files.length - 1].to = offset;
        else if (
          source
            .slice(0, offset)
            .split('\n')
            .some((line) => line.split('//')[0].trim())
        )
          throw new Error('Put file boundaries before the music.');
        ids.add(id);
        names.add(name.toLowerCase());
        result.files.push({
          id,
          name,
          markerFrom: offset,
          from: Math.min(source.length, offset + raw.length + 1),
          to: source.length,
          firstLine: i + 2,
        });
      } catch (failure) {
        result.problem ??= (failure as Error).message;
        result.diagnostics.push({
          from: offset,
          to: offset + raw.length,
          line: i + 1,
          message: (failure as Error).message,
        });
      }
    }
    offset += raw.length + 1;
  }
  if (!result.explicit)
    result.files.push({
      id: 'main',
      name: 'score.fourier',
      markerFrom: 0,
      from: 0,
      to: source.length,
      firstLine: 1,
    });
  for (const file of result.files) {
    const body = source.slice(file.from, file.to);
    const first = body.split('\n').find((line) => line.split('//')[0].trim());
    const link = first && /^\s*from\s+song\s+(\S+)\s*$/.exec(first.split('//')[0]);
    if (link && SCORE_KEY.test(link[1]) && link[1].length <= 100) {
      file.song = link[1];
      result.song ??= file.song;
      if (file.song !== result.song)
        result.diagnostics.push({
          from: file.from,
          to: Math.min(file.to, file.from + body.indexOf(first!) + first!.length),
          line: file.firstLine + body.slice(0, body.indexOf(first!)).split('\n').length - 1,
          message: `This file must use from song ${result.song}. One project contains one song.`,
        });
    } else if (result.explicit)
      result.diagnostics.push({
        from: file.from,
        to: Math.min(file.to, file.from + (first?.length ?? 0)),
        line: file.firstLine,
        message: 'Start this file with from song <songKey>.',
      });
  }
  return result;
}

export const scoreFileAt = (index: ScoreFileIndex, position: number) =>
  index.files.find((file) => position >= file.markerFrom && position < file.to) ??
  (position === index.source.length ? index.files.at(-1) : undefined);
const marker = (id: string, name: string) => FILE_MARKER + JSON.stringify({ id, name });
function capturedFile(source: string, index: ScoreFileIndex, id: string) {
  if (source !== index.source)
    throw new Error('The score changed. Open the file again before editing.');
  if (index.problem) throw new Error('Repair file boundaries in All files first.');
  const file = index.files.find((file) => file.id === id);
  if (!file) throw new Error('Score file not found.');
  return file;
}
function checkName(index: ScoreFileIndex, name: string, id?: string) {
  if (!fileName(name))
    throw new Error('Use a file name of 1–100 characters without path separators.');
  if (index.files.some((file) => file.id !== id && file.name.toLowerCase() === name.toLowerCase()))
    throw new Error('Another file already uses that name.');
}
export function editScoreFile(source: string, index: ScoreFileIndex, id: string, text: string) {
  const file = capturedFile(source, index, id);
  // Do not let a file-local paste consume a sibling's boundary or silently create hidden tabs.
  if (text.split('\n').some((line) => line.trim().startsWith('// @fourpataka-file')))
    throw new Error('Edit file boundaries in All files, or use New file.');
  const suffix = source.slice(file.to);
  return source.slice(0, file.from) + text + (suffix && !text.endsWith('\n') ? '\n' : '') + suffix;
}
export function addScoreFile(
  source: string,
  index: ScoreFileIndex,
  id: string,
  name: string,
  fallbackSong: string,
) {
  if (source !== index.source || index.problem)
    throw new Error('Repair file boundaries before creating a file.');
  checkName(index, name);
  if (!SCORE_KEY.test(id) || id.length > 100 || index.files.some((file) => file.id === id))
    throw new Error('Choose a unique file ID.');
  if (index.files.length >= 32) throw new Error('A song may contain at most 32 score files.');
  const song = index.song ?? fallbackSong;
  if (!SCORE_KEY.test(song) || song.length > 100)
    throw new Error('Use a song key starting with a letter, followed by letters, digits or _.');
  const base = index.explicit
    ? source
    : marker('main', 'score.fourier') + '\n' + (index.song ? '' : `from song ${song}\n`) + source;
  return (
    base + (base.endsWith('\n') ? '' : '\n') + marker(id, name.trim()) + `\nfrom song ${song}\n\n`
  );
}
export function renameScoreFile(source: string, index: ScoreFileIndex, id: string, name: string) {
  const file = capturedFile(source, index, id);
  checkName(index, name, id);
  if (!index.explicit)
    throw new Error('Create a file workspace before renaming its original file.');
  const end = source.indexOf('\n', file.markerFrom);
  const crlf = source.slice(file.markerFrom, end).endsWith('\r');
  return (
    source.slice(0, file.markerFrom) +
    marker(id, name.trim()) +
    (crlf ? '\r' : '') +
    source.slice(end < 0 ? source.length : end)
  );
}
export function removeScoreFile(source: string, index: ScoreFileIndex, id: string) {
  const file = capturedFile(source, index, id);
  if (!index.explicit) return '';
  return source.slice(0, file.markerFrom) + source.slice(file.to);
}
/** UI state follows surviving source IDs; deleting a file cannot leave an invisible active editor. */
export function normalizeFileWorkspace(
  source: string,
  workspace?: ScoreFileWorkspace,
): ScoreFileWorkspace {
  const index = indexScoreFiles(source);
  const ids = new Set(index.files.map((file) => file.id));
  const openFiles = workspace
    ? workspace.openFiles.filter((id, i, items) => ids.has(id) && items.indexOf(id) === i)
    : index.files.map((file) => file.id);
  return {
    openFiles,
    activeFile: index.problem
      ? null
      : workspace && workspace.activeFile === null
        ? null
        : workspace?.activeFile && openFiles.includes(workspace.activeFile)
          ? workspace.activeFile
          : (openFiles[0] ?? null),
  };
}
export function readFileWorkspace(value: unknown): ScoreFileWorkspace | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid score file workspace.');
  const { openFiles, activeFile } = value as Record<string, unknown>;
  if (
    !Array.isArray(openFiles) ||
    openFiles.length > 32 ||
    openFiles.some((id) => typeof id !== 'string' || !SCORE_KEY.test(id) || id.length > 100) ||
    new Set(openFiles).size !== openFiles.length ||
    !(activeFile === null || (typeof activeFile === 'string' && openFiles.includes(activeFile)))
  )
    throw new Error('Invalid score file tab selection.');
  return { openFiles: [...openFiles] as string[], activeFile: activeFile as string | null };
}
