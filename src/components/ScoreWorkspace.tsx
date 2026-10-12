import { useEffect, useMemo, useRef, useState } from 'react';
import ScoreEditor, { type ScoreEditorPosition } from './ScoreEditor';
import type { CompiledScore } from '../core/parser';
import {
  indexScoreViews,
  renameTrackSource,
  removeTrackSource,
  projectScoreView,
} from '../core/scoreWorkspace';
import { appendTrack, nextTrackKey } from '../core/scoreTools';
import { indexScoreSections, renameSectionSource } from '../core/scoreSections';
import SectionNavigator from './SectionNavigator';
import ScoreFileTabs from './ScoreFileTabs';
import {
  editScoreFile,
  indexScoreFiles,
  normalizeFileWorkspace,
  type ScoreFileWorkspace,
} from '../core/scoreFiles';

export interface ScoreSourceChange {
  base: string;
  text: string;
  rename?: { from: string; to: string };
  operation?: boolean;
  remove?: string;
  removeTracks?: string[];
  workspace?: ScoreFileWorkspace;
}
interface Props {
  value: string;
  navigation?: { id: number; from: number; to: number; source: string };
  onNavigationApplied?: () => void;
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
  workspace?: ScoreFileWorkspace;
  songKey: string;
  onWorkspace: (workspace: ScoreFileWorkspace) => void;
}

export default function ScoreWorkspace(props: Props) {
  const { value, score, onChange, presetKeys, chainKeys } = props;
  const index = useMemo(() => indexScoreViews(value), [value]);
  const fileIndex = useMemo(() => indexScoreFiles(value), [value]);
  const workspace = useMemo(
    () => normalizeFileWorkspace(value, props.workspace),
    [value, props.workspace],
  );
  const file = !fileIndex.problem
    ? fileIndex.files.find((file) => file.id === workspace.activeFile)
    : undefined;
  const fileTracks = file ? index.tracks.filter((track) => track.fileId === file.id) : [];
  const sectionIndex = useMemo(() => indexScoreSections(value), [value]);
  const [navigation, setNavigation] = useState<
    { id: number; from: number; to: number } | undefined
  >();
  const navigationId = useRef(0);
  useEffect(() => {
    const request = props.navigation;
    if (!request) return;
    // A later edit/undo must never reveal a span from a stale canonical document.
    if (request.source === value)
      setNavigation({ id: ++navigationId.current, from: request.from, to: request.to });
    props.onNavigationApplied?.();
  }, [props.navigation?.id, value]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [operation, setOperation] = useState<'new' | 'rename' | 'delete' | null>(null);
  const [name, setName] = useState('');
  const [instrument, setInstrument] = useState('');
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(0);
  const positions = useRef<Record<string, ScoreEditorPosition>>({});
  const trackPicker = useRef<HTMLSelectElement>(null);
  const formInput = useRef<HTMLInputElement>(null);
  const operationForm = useRef<HTMLFormElement>(null);
  const operationTrigger = useRef<HTMLButtonElement | null>(null);
  const operationCapture = useRef<{ source: string; fileId?: string } | undefined>(undefined);
  const active = !index.problem
    ? (fileTracks.find((track) => track.key === selected) ?? fileTracks[0])
    : undefined;
  // Tracks select command/operation targets only. The editor identity and slice
  // depend exclusively on the user's file, even between invalid keystrokes.
  const editorId = file?.id ?? 'files';
  const projection = useMemo(() => projectScoreView(value, file), [value, file]);
  const offset = projection.from;
  const end = projection.to;
  const text = projection.text;
  useEffect(() => {
    if (operation) {
      if (operation === 'delete')
        operationForm.current?.querySelector<HTMLButtonElement>('[type=submit]')?.focus();
      else formInput.current?.focus();
    }
  }, [operation]);
  const select = (key: string | null) => {
    setNavigation(undefined);
    props.onView();
    setSelected(key);
    setOperation(null);
    setError('');
    setNotice('');
    if (key) props.onTrack(key);
  };
  const chooseWorkspace = (next: ScoreFileWorkspace) => {
    props.onView();
    if (next.activeFile !== workspace.activeFile) {
      setSelected(null);
      setNavigation(undefined);
      setOperation(null);
      setError('');
      setNotice('');
      const track = index.tracks.find((track) => track.fileId === next.activeFile);
      if (track) props.onTrack(track.key);
    }
    props.onWorkspace(next);
  };
  const apply = (change: ScoreSourceChange, key: string | null) => {
    if (!onChange(change)) {
      setRecovery((n) => n + 1);
      setNotice('The score changed before this edit. The current score has been restored.');
      return false;
    }
    setSelected(key);
    if (key) props.onTrack(key);
    return true;
  };
  const edit = (next: string) => {
    if (next === text) return;
    setNavigation(undefined);
    const restored = projection.restore(next);
    try {
      apply(
        { base: value, text: file ? editScoreFile(value, fileIndex, file.id, restored) : restored },
        selected,
      );
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
    operationCapture.current = { source: value, fileId: file?.id };
    operationTrigger.current = document.activeElement as HTMLButtonElement;
    setOperation(kind);
    setError('');
    setName(kind === 'new' ? nextTrackKey(value, presetKeys) : (active?.key ?? ''));
    setInstrument(presetKeys[0] ?? '');
  };
  const submit = () => {
    try {
      if (
        operationCapture.current?.source !== value ||
        operationCapture.current?.fileId !== file?.id
      )
        throw new Error('The score changed. Open this track operation again.');
      if (operation === 'new') {
        apply(
          {
            base: value,
            text: appendTrack(
              value,
              presetKeys,
              name.trim(),
              instrument,
              ['rest bar'],
              chainKeys,
              null,
              file?.id ?? fileIndex.files[0]?.id,
            ),
            operation: true,
            workspace: {
              openFiles: workspace.openFiles.includes(file?.id ?? fileIndex.files[0]?.id)
                ? workspace.openFiles
                : [...workspace.openFiles, fileIndex.files[0].id],
              activeFile: file?.id ?? fileIndex.files[0]?.id ?? null,
            },
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
        const text = removeTrackSource(value, index, active.key, file?.id);
        apply(
          {
            base: value,
            text,
            operation: true,
            ...(!indexScoreViews(text).tracks.some((track) => track.key === active.key)
              ? { remove: active.key }
              : {}),
          },
          null,
        );
      }
      setOperation(null);
      setError('');
      requestAnimationFrame(() => trackPicker.current?.focus());
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const valid =
    !index.problem &&
    score.diagnostics.every((d) => d.message === 'Add a track to start composing.');
  const empty = !value.trim();
  const chords = score.chordPreviews
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
      message:
        d.message +
        (d.sectionCalls?.length
          ? ` Called via ${d.sectionCalls.map((call) => `${call.name} at line ${call.line}`).join(' → ')}.`
          : ''),
      from: Math.max(0, projection.toLocal(d.from)),
      to: Math.min(text.length, projection.toLocal(d.to)),
      line: d.line - (file?.firstLine ?? 1) + 1,
    }));
  const lines = props.lines
    .map((line) => line - (file?.firstLine ?? 1) + 1)
    .filter((line) => line >= 1 && line <= text.split('\n').length);
  return (
    <div className="score-workspace">
      <ScoreFileTabs
        index={fileIndex}
        workspace={workspace}
        songKey={props.songKey}
        playing={props.playing}
        onWorkspace={chooseWorkspace}
        onChange={(base, text, nextWorkspace) => {
          // Invalid musical text must not discard independently edited track sounds.
          const after = indexScoreViews(text);
          const removed = (after.problem ? [] : index.tracks)
            .filter((track) => !after.tracks.some((next) => next.key === track.key))
            .map((track) => track.key);
          if (
            !onChange({
              base,
              text,
              workspace: nextWorkspace,
              removeTracks: removed,
              operation: true,
            })
          )
            return false;
          setSelected(null);
          setNavigation(undefined);
          props.onView();
          return true;
        }}
      />
      <div
        role="tabpanel"
        id="score-file-panel"
        aria-labelledby={
          workspace.activeFile ? `score-file-${workspace.activeFile}` : 'score-file-all'
        }
      >
        <div className="score-view-toolbar">
          <label className="score-track-picker">
            Track
            <select
              ref={trackPicker}
              aria-label="Track in file"
              value={active?.key ?? ''}
              disabled={!!index.problem || !fileTracks.length}
              onChange={(event) => select(event.target.value)}
            >
              {!fileTracks.length && <option value="">No complete tracks</option>}
              {fileTracks.map((track) => (
                <option key={track.key} value={track.key}>
                  {track.key}
                </option>
              ))}
            </select>
          </label>
          <div className="score-view-actions">
            <button
              disabled={props.playing || (!valid && !empty) || !presetKeys.length}
              onClick={() => begin('new')}
            >
              Add track to file
            </button>
            <button disabled={props.playing || !valid || !active} onClick={() => begin('rename')}>
              Rename track
            </button>
            <button disabled={props.playing || !valid || !active} onClick={() => begin('delete')}>
              Remove track
            </button>
          </div>
        </div>
        <SectionNavigator
          index={sectionIndex}
          playing={props.playing}
          onNavigate={(section) => {
            if (section.fileId && section.fileId !== file?.id)
              chooseWorkspace({
                openFiles: workspace.openFiles.includes(section.fileId)
                  ? workspace.openFiles
                  : [...workspace.openFiles, section.fileId],
                activeFile: section.fileId,
              });
            select(section.track);
            setNavigation({
              id: ++navigationId.current,
              from: section.nameFrom,
              to: section.nameTo,
            });
          }}
          onRename={(capture, section, nextName) => {
            const renamed = renameSectionSource(
              value,
              capture,
              section.track,
              section.name,
              nextName,
            );
            if (renamed === value) return;
            if (!onChange({ base: value, text: renamed, operation: true }))
              throw new Error('The score changed. Select the section again before renaming.');
          }}
        />
        {operation && (
          <form
            className="score-view-form"
            ref={operationForm}
            aria-label={
              operation === 'new'
                ? 'Add track'
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
                    aria-label="Track name"
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
                  : 'Create track'}
            </button>
            <button type="button" onClick={cancel}>
              Cancel track operation
            </button>
            {error && <span role="alert">{error}</span>}
          </form>
        )}
        <p className="score-view-context" role="status">
          {index.problem
            ? `${index.problem} Keep editing this file to repair the music.`
            : notice ||
              (file
                ? `${file.name} · ${fileTracks.length} tracks · whole-song playback.`
                : 'All files · whole-song playback.')}
        </p>
        <div id="score-view-panel" className="score-workspace-editor">
          <ScoreEditor
            key={`${editorId}:${recovery}`}
            value={text}
            sections={score.sections}
            songKey={fileIndex.song}
            onChange={edit}
            diagnostics={diagnostics}
            chords={chords}
            autocomplete={props.autocomplete}
            presetKeys={presetKeys}
            chainKeys={chainKeys}
            lines={lines}
            onUndo={props.onUndo}
            onRedo={props.onRedo}
            initialPosition={positions.current[editorId]}
            navigation={
              navigation && navigation.from >= offset && navigation.to <= end
                ? {
                    id: navigation.id,
                    from: projection.toLocal(navigation.from),
                    to: projection.toLocal(navigation.to),
                  }
                : undefined
            }
            onPosition={(position) => {
              positions.current[editorId] = position;
            }}
          />
        </div>
      </div>
    </div>
  );
}
