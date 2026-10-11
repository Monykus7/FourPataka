import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileMusic, FolderOpen, Plus, X } from 'lucide-react';
import {
  addScoreFile,
  ensureScoreFiles,
  indexScoreFiles,
  renameScoreFile,
  removeScoreFile,
  type ScoreFileIndex,
  type ScoreFileWorkspace,
} from '../core/scoreFiles';

export default function ScoreFileTabs({
  index,
  workspace,
  songKey,
  playing,
  onWorkspace,
  onChange,
}: {
  index: ScoreFileIndex;
  workspace: ScoreFileWorkspace;
  songKey: string;
  playing: boolean;
  onWorkspace: (state: ScoreFileWorkspace) => void;
  onChange: (base: string, text: string, state: ScoreFileWorkspace) => boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [operation, setOperation] = useState<{
    kind: 'new' | 'rename' | 'delete';
    index: ScoreFileIndex;
    id?: string;
    name?: string;
  } | null>(null);
  const [name, setName] = useState(''),
    [song, setSong] = useState(''),
    [error, setError] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null),
    trigger = useRef<HTMLButtonElement | null>(null),
    form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (operation)
      form.current
        ?.querySelector<HTMLInputElement | HTMLButtonElement>('input, button[type=submit]')
        ?.focus();
  }, [operation]);
  const cancel = () => {
    setOperation(null);
    setError('');
    requestAnimationFrame(() =>
      (trigger.current?.isConnected ? trigger.current : menuButton.current)?.focus(),
    );
  };
  const open = (id: string | null) => {
    onWorkspace({
      openFiles:
        id && !workspace.openFiles.includes(id)
          ? [...workspace.openFiles, id]
          : workspace.openFiles,
      activeFile: id,
    });
    setMenu(false);
  };
  const begin = (kind: 'new' | 'rename' | 'delete', id?: string) => {
    trigger.current = document.activeElement as HTMLButtonElement;
    const file = index.files.find((file) => file.id === id);
    setOperation({ kind, index, id, name: file?.name });
    setMenu(false);
    setError('');
    setSong(index.song ?? songKey);
    let candidate = 'part2.fourier',
      i = 3;
    while (index.files.some((file) => file.name.toLowerCase() === candidate.toLowerCase()))
      candidate = `part${i++}.fourier`;
    setName(kind === 'new' ? candidate : (file?.name ?? ''));
  };
  const submit = () => {
    if (!operation || playing) return;
    try {
      const capture = operation.index;
      if (index.source !== capture.source)
        throw new Error('The score changed. Open this file operation again.');
      let text: string, state: ScoreFileWorkspace;
      if (operation.kind === 'new') {
        const id = 'file_' + crypto.randomUUID().replaceAll('-', '_');
        text = addScoreFile(index.source, capture, id, name.trim(), song.trim());
        state = { openFiles: [...workspace.openFiles, id], activeFile: id };
      } else if (operation.kind === 'rename') {
        const promoted = ensureScoreFiles(index.source, capture, song.trim());
        text = renameScoreFile(promoted, indexScoreFiles(promoted), operation.id!, name.trim());
        state = workspace;
      } else {
        text = removeScoreFile(index.source, capture, operation.id!);
        const remaining = workspace.openFiles.filter((id) => id !== operation.id);
        state = {
          openFiles: remaining,
          activeFile:
            workspace.activeFile === operation.id ? (remaining[0] ?? null) : workspace.activeFile,
        };
      }
      if (!onChange(index.source, text, state))
        throw new Error('The score changed. Open this file operation again.');
      cancel();
    } catch (failure) {
      setError((failure as Error).message);
    }
  };
  return (
    <>
      <div className="score-file-bar">
        <button
          ref={menuButton}
          className="score-files-menu-button"
          aria-label="Browse score files"
          aria-expanded={menu}
          aria-controls="score-file-menu"
          onClick={() => setMenu(!menu)}
        >
          <FolderOpen size={15} />
          <span>Files</span>
          <ChevronDown size={12} />
        </button>
        <div
          className="score-file-tabs"
          role="tablist"
          aria-label="Score files"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')];
            const at = tabs.indexOf(document.activeElement as HTMLButtonElement);
            if (at < 0) return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : (at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next].click();
            tabs[next].focus();
          }}
        >
          <button
            role="tab"
            id="score-file-all"
            aria-controls="score-file-panel"
            aria-selected={workspace.activeFile === null}
            tabIndex={workspace.activeFile === null ? 0 : -1}
            onClick={() => open(null)}
          >
            All files
          </button>
          {workspace.openFiles.map((id) => {
            const file = index.files.find((file) => file.id === id);
            return (
              file && (
                <div className="score-file-tab" key={id} data-active={id === workspace.activeFile}>
                  <button
                    role="tab"
                    id={`score-file-${id}`}
                    aria-controls="score-file-panel"
                    aria-selected={id === workspace.activeFile}
                    tabIndex={id === workspace.activeFile ? 0 : -1}
                    onClick={() => open(id)}
                  >
                    <FileMusic size={13} />
                    <span>{file.name}</span>
                  </button>
                  <button
                    className="score-file-close"
                    aria-label={`Close ${file.name} tab`}
                    title="Close tab; keep its music in the song"
                    onClick={() => {
                      const remaining = workspace.openFiles.filter((key) => key !== id);
                      onWorkspace({
                        openFiles: remaining,
                        activeFile:
                          workspace.activeFile === id
                            ? (remaining[
                                Math.min(workspace.openFiles.indexOf(id), remaining.length - 1)
                              ] ?? null)
                            : workspace.activeFile,
                      });
                      requestAnimationFrame(() =>
                        document
                          .querySelector<HTMLButtonElement>(
                            '.score-file-tabs [aria-selected="true"]',
                          )
                          ?.focus(),
                      );
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            );
          })}
        </div>
        <button
          className="score-new-file"
          aria-label="New score file"
          title="New score file"
          disabled={playing || !!index.problem || index.files.length >= 32}
          onClick={() => begin('new')}
        >
          <Plus size={16} />
        </button>
      </div>
      {menu && (
        <div
          className="score-file-menu"
          id="score-file-menu"
          role="region"
          aria-label="File browser"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setMenu(false);
              menuButton.current?.focus();
            }
          }}
        >
          <strong>{index.song ?? 'Song files'}</strong>
          {index.files.map((file) => (
            <div className="score-file-entry" key={file.id}>
              <button onClick={() => open(file.id)} aria-label={`Open ${file.name}`}>
                <FileMusic size={14} />
                {file.name}
              </button>
              <span>{workspace.openFiles.includes(file.id) ? 'Open' : ''}</span>
              <button
                aria-label={`Rename ${file.name} file`}
                disabled={playing || !!index.problem}
                onClick={() => begin('rename', file.id)}
              >
                Rename
              </button>
              <button
                aria-label={`Delete ${file.name} file`}
                disabled={playing || !!index.problem}
                onClick={() => begin('delete', file.id)}
              >
                Delete
              </button>
            </div>
          ))}
          {index.problem && <p role="alert">{index.problem} Repair boundaries in All files.</p>}
        </div>
      )}
      {operation && (
        <form
          className="score-view-form score-file-form"
          aria-label={`${operation.kind} score file`}
          ref={form}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
        >
          {operation.kind === 'delete' ? (
            <p>Delete {operation.name} and its music? Other files are kept. Undo restores it.</p>
          ) : (
            <label>
              File name
              <input
                aria-label="Score file name"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          {!index.song && operation.kind !== 'delete' && (
            <label>
              Song key
              <input
                aria-label="Song key"
                maxLength={100}
                value={song}
                onChange={(event) => setSong(event.target.value)}
              />
            </label>
          )}
          <button type="submit" disabled={playing}>
            {operation.kind === 'new'
              ? 'Create score file'
              : operation.kind === 'rename'
                ? 'Confirm rename file'
                : 'Confirm delete file'}
          </button>
          <button type="button" onClick={cancel}>
            Cancel file operation
          </button>
          {error && <span role="alert">{error}</span>}
        </form>
      )}
    </>
  );
}
