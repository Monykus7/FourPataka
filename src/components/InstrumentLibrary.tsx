import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { InstrumentFolder, InstrumentPreset } from '../core/project';

const PRESET_DRAG_TYPE = 'application/x-fourpataka-instrument';
type Edit = { id: string | null; label: string };

export default function InstrumentLibrary({
  instruments,
  folders,
  selectedId,
  thumbnail,
  onSelect,
  onSaveNew,
  onCreateFolder,
  onRenameFolder,
  onRemoveFolder,
  onMove,
}: {
  instruments: InstrumentPreset[];
  folders: InstrumentFolder[];
  selectedId: string;
  thumbnail: (preset: InstrumentPreset) => ReactNode;
  onSelect: (id: string) => void;
  onSaveNew: () => void;
  onCreateFolder: (label: string) => void;
  onRenameFolder: (id: string, label: string) => void;
  onRemoveFolder: (id: string) => void;
  onMove: (presetId: string, folderId: string | null) => void;
}) {
  // Disclosure is view state, never a musical/history edit. New folders open;
  // saved folders start folded so custom/unfiled instruments get the space.
  const [collapsed, setCollapsed] = useState(() => new Set(folders.map((f) => f.id)));
  const [edit, setEdit] = useState<Edit | null>(null);
  const [error, setError] = useState('');
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const newFolderButton = useRef<HTMLButtonElement | null>(null);
  const finishEdit = () => {
    setEdit(null);
    setError('');
    returnFocus.current?.focus();
  };
  const beginEdit = (button: HTMLButtonElement, next: Edit) => {
    returnFocus.current = button;
    setError('');
    setEdit(next);
  };
  const dropEvents = (folderId: string | null) => ({
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!dragged || !e.dataTransfer.types.includes(PRESET_DRAG_TYPE)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setOver(folderId ?? 'unfiled');
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      // Accept only a drag started by this library, not arbitrary external text.
      const id = e.dataTransfer.getData(PRESET_DRAG_TYPE);
      if (!dragged || id !== dragged || !instruments.some((p) => p.id === id)) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        onMove(id, folderId);
        setError('');
      } catch (failure) {
        setError((failure as Error).message);
      }
      setDragged(null);
      setOver(null);
    },
  });
  const presetItem = (preset: InstrumentPreset) => (
    <button
      key={preset.id}
      className={`preset-item ${selectedId === preset.id ? 'selected' : ''} ${dragged === preset.id ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData(PRESET_DRAG_TYPE, preset.id);
        setDragged(preset.id);
      }}
      onDragEnd={() => {
        setDragged(null);
        setOver(null);
      }}
      onClick={() => onSelect(preset.id)}
      title="Drag into a folder or Unfiled; exact placement is also available in Instrument"
    >
      <span className="preset-mini">{thumbnail(preset)}</span>
      <span>
        {preset.label}
        <small>{preset.key}</small>
      </span>
      {selectedId === preset.id && <span className="preset-dot" />}
    </button>
  );
  return (
    <section className="instrument-library" aria-label="Instrument library">
      <div className="library-title">
        <span className="sidebar-section-label">INSTRUMENT LIBRARY</span>
        <div className="library-actions">
          <button
            ref={newFolderButton}
            className="icon-button"
            aria-label="New instrument folder"
            title="New folder"
            onClick={(e) => beginEdit(e.currentTarget, { id: null, label: '' })}
          >
            <FolderPlus size={15} />
          </button>
          <button
            className="icon-button"
            aria-label="Save sound as new preset"
            title="Save as new"
            onClick={onSaveNew}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      {edit && (
        <form
          className="library-folder-form"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              if (edit.id === null) onCreateFolder(edit.label);
              else onRenameFolder(edit.id, edit.label);
              finishEdit();
            } catch (failure) {
              setError((failure as Error).message);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              finishEdit();
            }
          }}
        >
          <input
            key={edit.id ?? 'new'}
            autoFocus
            aria-label="Instrument folder name"
            maxLength={100}
            value={edit.label}
            placeholder="Folder name"
            onChange={(e) => setEdit({ ...edit, label: e.target.value })}
          />
          <button
            className="icon-button"
            type="submit"
            aria-label={edit.id === null ? 'Create instrument folder' : 'Save folder name'}
          >
            <Check size={14} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Cancel folder edit"
            onClick={finishEdit}
          >
            <X size={14} />
          </button>
        </form>
      )}
      {error && (
        <p className="library-error" role="alert">
          {error}
        </p>
      )}
      <div className="preset-list">
        {folders.map((folder) => {
          const members = instruments.filter((p) => p.folderId === folder.id);
          const closed = collapsed.has(folder.id);
          return (
            <div
              key={folder.id}
              role="group"
              aria-label={`${folder.label} folder`}
              className={`library-folder ${over === folder.id ? 'drop-target' : ''}`}
              {...dropEvents(folder.id)}
            >
              <div className="library-folder-heading">
                <button
                  className={`folder-toggle ${members.some((p) => p.id === selectedId) ? 'contains-selected' : ''}`}
                  aria-label={`Toggle ${folder.label} folder`}
                  aria-expanded={!closed}
                  onClick={() =>
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (closed) next.delete(folder.id);
                      else next.add(folder.id);
                      return next;
                    })
                  }
                >
                  {closed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <Folder size={14} />
                  <span>{folder.label}</span>
                  <small>{members.length}</small>
                </button>
                <button
                  className="icon-button folder-action"
                  aria-label={`Rename ${folder.label} folder`}
                  title="Rename folder"
                  onClick={(e) =>
                    beginEdit(e.currentTarget, { id: folder.id, label: folder.label })
                  }
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="icon-button folder-action"
                  aria-label={`Remove ${folder.label} folder`}
                  title="Remove folder; keep instruments"
                  onClick={() => {
                    onRemoveFolder(folder.id);
                    if (edit?.id === folder.id) setEdit(null);
                    requestAnimationFrame(() => newFolderButton.current?.focus());
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {!closed && (
                <div className="folder-instruments">
                  {members.map(presetItem)}
                  {!members.length && <span className="library-empty">Drop instruments here</span>}
                </div>
              )}
            </div>
          );
        })}
        <div
          role="group"
          aria-label="Unfiled instruments"
          className={`library-unfiled ${over === 'unfiled' ? 'drop-target' : ''}`}
          {...dropEvents(null)}
        >
          <div className="library-unfiled-heading">
            Unfiled <small>{instruments.filter((p) => !p.folderId).length}</small>
          </div>
          {instruments.filter((p) => !p.folderId).map(presetItem)}
          {!instruments.some((p) => !p.folderId) && (
            <span className="library-empty">Drop here to unfile</span>
          )}
        </div>
      </div>
    </section>
  );
}
