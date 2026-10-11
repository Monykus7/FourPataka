import { useRef, useState } from 'react';
import type { SectionSource, SectionSourceIndex } from '../core/scoreSections';

const keyOf = (section: SectionSource) => `${section.track}:${section.name}`;

export default function SectionNavigator({
  index,
  trackKey,
  playing,
  onNavigate,
  onRename,
}: {
  index: SectionSourceIndex;
  trackKey?: string;
  playing: boolean;
  onNavigate: (section: SectionSource) => void;
  onRename: (capture: SectionSourceIndex, section: SectionSource, name: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState<{
    index: SectionSourceIndex;
    section: SectionSource;
  } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const renameButton = useRef<HTMLButtonElement>(null);
  const sections = index.sections.filter((s) => !trackKey || s.track === trackKey);
  const current = sections.find((s) => keyOf(s) === selected) ?? sections[0];
  const valid = index.complete && !index.diagnostics.length;
  const cancel = () => {
    setEditing(null);
    setError('');
    renameButton.current?.focus();
  };
  if (!index.sections.length) return null;
  return (
    <div className="score-section-navigation">
      <div className="score-section-controls">
        <label>
          Section
          <select
            aria-label="Score section"
            value={current ? keyOf(current) : ''}
            disabled={!current || !valid}
            onChange={(event) => {
              setSelected(event.target.value);
              setEditing(null);
              setError('');
            }}
          >
            {!sections.length && <option value="">No sections in this track</option>}
            {sections.map((section) => (
              <option key={keyOf(section)} value={keyOf(section)}>
                {section.track} · {section.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!current || !valid} onClick={() => onNavigate(current)}>
          Go to section
        </button>
        <button
          ref={renameButton}
          disabled={playing || !current || !valid}
          onClick={() => {
            setEditing({ index, section: current });
            setName(current.name);
            setError('');
          }}
        >
          Rename section
        </button>
      </div>
      {editing && (
        <form
          className="score-view-form"
          aria-label="Rename section"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              onRename(editing.index, editing.section, name.trim());
              setSelected(`${editing.section.track}:${name.trim()}`);
              cancel();
            } catch (failure) {
              setError((failure as Error).message);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
        >
          <label>
            Section name
            <input
              autoFocus
              aria-label="Section name"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button type="submit" disabled={playing}>
            Confirm rename section
          </button>
          <button type="button" onClick={cancel}>
            Cancel section rename
          </button>
          {error && <span role="alert">{error}</span>}
        </form>
      )}
    </div>
  );
}
