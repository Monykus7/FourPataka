import { useEffect, useMemo, useRef, useState } from 'react';
import ScoreEditor, { type ScoreEditorPosition } from './ScoreEditor';
import type { CompiledScore } from '../core/parser';
import {
  editTrackView,
  indexScoreViews,
  renameTrackSource,
  removeTrackSource,
  projectScoreView,
} from '../core/scoreWorkspace';
import { appendTrack, nextTrackKey } from '../core/scoreTools';

export interface ScoreSourceChange {
  base: string;
  text: string;
  rename?: { from: string; to: string };
  operation?: boolean;
  remove?: string;
}
interface Props {
  value: string;
  score: CompiledScore;
  onChange: (change: ScoreSourceChange) => boolean;
  autocomplete: boolean;
  presetKeys: string[];
  chainKeys: string[];
  lines: number[];
  playing: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTrack: (key: string) => void;
  onView: () => void;
}

export default function ScoreWorkspace(props: Props) {
  const { value, score, onChange, presetKeys, chainKeys } = props;
  const index = useMemo(() => indexScoreViews(value), [value]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [operation, setOperation] = useState<'new' | 'rename' | 'delete' | null>(null);
  const [name, setName] = useState('');
  const [instrument, setInstrument] = useState('');
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(0);
  const positions = useRef<Record<string, ScoreEditorPosition>>({});
  const tablist = useRef<HTMLDivElement>(null);
  const formInput = useRef<HTMLInputElement>(null);
  const operationForm = useRef<HTMLFormElement>(null);
  const operationTrigger = useRef<HTMLButtonElement | null>(null);
  const active = !index.problem ? index.tracks.find((track) => track.key === selected) : undefined;
  const viewId = active ? `track-${active.key}` : 'all';
  const projection = useMemo(() => projectScoreView(value, active), [value, active]);
  const offset = projection.from;
  const end = projection.to;
  const text = projection.text;
  useEffect(() => {
    if (selected && !active) {
      setSelected(null);
      setNotice('Track boundaries changed. Continue in All score; your edit is retained.');
    }
  }, [selected, active]);
  useEffect(() => {
    if (operation) {
      if (operation === 'delete')
        operationForm.current?.querySelector<HTMLButtonElement>('[type=submit]')?.focus();
      else formInput.current?.focus();
    }
  }, [operation]);
  const select = (key: string | null) => {
    props.onView();
    setSelected(key);
    setOperation(null);
    setError('');
    setNotice('');
    if (key) props.onTrack(key);
  };
  const apply = (change: ScoreSourceChange, key: string | null) => {
    if (!onChange(change)) {
      setRecovery((n) => n + 1);
      setNotice('The score changed before this edit. The current score has been restored.');
      return;
    }
    if (change.rename) {
      const saved = positions.current[`track-${change.rename.from}`];
      if (saved) positions.current[`track-${change.rename.to}`] = saved;
    }
    setSelected(key);
    if (key) props.onTrack(key);
  };
  const edit = (next: string) => {
    if (next === text) return;
    const restored = projection.restore(next);
    try {
      if (!active) apply({ base: value, text: restored }, null);
      else {
        const result = editTrackView(value, index, active.key, restored);
        apply(
          {
            base: value,
            text: result.text,
            ...(result.trackKey && result.trackKey !== active.key
              ? { rename: { from: active.key, to: result.trackKey } }
              : {}),
          },
          result.trackKey,
        );
        if (!result.trackKey)
          setNotice('Track boundaries changed. Continue in All score; your edit is retained.');
      }
    } catch (e) {
      setNotice((e as Error).message);
      setRecovery((n) => n + 1);
    }
  };
  const cancel = () => {
    setOperation(null);
    setError('');
    requestAnimationFrame(() => operationTrigger.current?.focus());
  };
  const begin = (kind: 'new' | 'rename' | 'delete') => {
    operationTrigger.current = document.activeElement as HTMLButtonElement;
    setOperation(kind);
    setError('');
    setName(kind === 'new' ? nextTrackKey(value, presetKeys) : (active?.key ?? ''));
    setInstrument(presetKeys[0] ?? '');
  };
  const submit = () => {
    try {
      if (operation === 'new') {
        apply(
          {
            base: value,
            text: appendTrack(value, presetKeys, name.trim(), instrument, ['rest bar'], chainKeys),
            operation: true,
          },
          name.trim(),
        );
      } else if (active && operation === 'rename') {
        const key = name.trim();
        apply(
          {
            base: value,
            text: renameTrackSource(value, index, active.key, key),
            rename: { from: active.key, to: key },
          },
          key,
        );
      } else if (active && operation === 'delete') {
        apply(
          {
            base: value,
            text: removeTrackSource(value, index, active.key),
            operation: true,
            remove: active.key,
          },
          null,
        );
      }
      setOperation(null);
      setError('');
      requestAnimationFrame(() =>
        tablist.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus(),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const valid =
    !index.problem &&
    score.diagnostics.every((d) => d.message === 'Add a track to start composing.');
  const empty = !value.trim();
  const chords = score.events
    .flatMap((event) => (event.chordSymbol ? [event.chordSymbol] : []))
    .filter((chord) => chord.from >= offset && chord.to <= end)
    .map((chord) => ({
      ...chord,
      from: projection.toLocal(chord.from),
      to: projection.toLocal(chord.to),
    }));
  const diagnostics = score.diagnostics
    .filter((d) => d.from >= offset && d.from <= end)
    .map((d) => ({
      ...d,
      from: Math.max(0, projection.toLocal(d.from)),
      to: Math.min(text.length, projection.toLocal(d.to)),
      line: d.line - (active?.firstLine ?? 1) + 1,
    }));
  const lines = props.lines
    .map((line) => line - (active?.firstLine ?? 1) + 1)
    .filter((line) => line >= 1 && line <= text.split('\n').length);
  return (
    <div className="score-workspace">
      <div className="score-view-toolbar">
        <div
          role="tablist"
          aria-label="Score views"
          className="score-view-tabs"
          ref={tablist}
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const tabs = [...tablist.current!.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
            const at = tabs.indexOf(document.activeElement as HTMLButtonElement);
            if (at < 0) return;
            event.preventDefault();
            tabs[
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : (at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
            ].click();
            tabs[
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? tabs.length - 1
                  : (at + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
            ].focus();
          }}
        >
          {[null, ...index.tracks.map((t) => t.key)].map((key) => (
            <button
              key={key ? `track-${key}` : 'all'}
              role="tab"
              id={`score-view-${key ? `track-${key}` : 'all'}`}
              aria-controls="score-view-panel"
              aria-selected={key === (active?.key ?? null)}
              tabIndex={key === (active?.key ?? null) ? 0 : -1}
              onClick={() => select(key)}
            >
              {key ?? 'All score'}
            </button>
          ))}
        </div>
        <div className="score-view-actions">
          <button
            disabled={props.playing || (!valid && !empty) || !presetKeys.length}
            onClick={() => begin('new')}
          >
            New track tab
          </button>
          <button disabled={props.playing || !valid || !active} onClick={() => begin('rename')}>
            Rename track
          </button>
          <button disabled={props.playing || !valid || !active} onClick={() => begin('delete')}>
            Remove track
          </button>
        </div>
      </div>
      {operation && (
        <form
          className="score-view-form"
          ref={operationForm}
          aria-label={
            operation === 'new'
              ? 'New track tab'
              : operation === 'rename'
                ? 'Rename track'
                : 'Remove track'
          }
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
          {operation === 'delete' ? (
            <span>Remove {active?.key} from the score? Undo restores it and its sound.</span>
          ) : (
            <>
              <label>
                Track name
                <input
                  ref={formInput}
                  aria-label="Track tab name"
                  value={name}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              {operation === 'new' && (
                <label>
                  Instrument
                  <select
                    aria-label="New track instrument"
                    value={instrument}
                    onChange={(event) => setInstrument(event.target.value)}
                  >
                    {presetKeys.map((key) => (
                      <option key={key}>{key}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <button type="submit" disabled={props.playing}>
            {operation === 'delete'
              ? 'Confirm remove track'
              : operation === 'rename'
                ? 'Confirm rename track'
                : 'Create track tab'}
          </button>
          <button type="button" onClick={cancel}>
            Cancel track operation
          </button>
          {error && <span role="alert">{error}</span>}
        </form>
      )}
      <p className="score-view-context" role="status">
        {index.problem
          ? `${index.problem} Edit All score to restore track tabs.`
          : notice ||
            (active
              ? `${active.key} · one shared score file. Tempo, meter and master routing are in All score.`
              : 'All tracks and shared tempo, meter and master routing.')}
      </p>
      <div
        role="tabpanel"
        id="score-view-panel"
        aria-labelledby={`score-view-${viewId}`}
        className="score-workspace-editor"
      >
        <ScoreEditor
          key={`${viewId}:${recovery}`}
          value={text}
          onChange={edit}
          diagnostics={diagnostics}
          chords={chords}
          autocomplete={props.autocomplete}
          presetKeys={presetKeys}
          chainKeys={chainKeys}
          lines={lines}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          initialPosition={positions.current[viewId]}
          onPosition={(position) => {
            positions.current[viewId] = position;
          }}
        />
      </div>
    </div>
  );
}
