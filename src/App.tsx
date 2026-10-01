import { keepMatchingWavePoints } from './core/waveform';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  FileMusic,
  Headphones,
  Layers3,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Square,
  Undo2,
  Redo2,
  Upload,
  Volume2,
  Waves,
  X,
} from 'lucide-react';
import { AudioEngine } from './audio/engine';
import {
  clamp,
  coefficientDb,
  components,
  descriptors,
  mathematicalPreset,
  NEUTRAL_MACROS,
  pitch,
  SCORE_KEY,
  transform,
  type Macros,
  type Sound,
  type WavePreset,
} from './core/music';
import { COMMANDS, parseScore, type CompiledScore, type ScoreEvent } from './core/parser';
import {
  applyPreset,
  createProject,
  importProject,
  loadProject,
  PREFERENCES_KEY,
  RECOVERY_KEY,
  reconcileTracks,
  STORAGE_KEY,
  type Project,
} from './core/project';
import { commit, redo, undo, type History } from './core/history';
import SourceGraphs from './components/SourceGraphs';
import FourierWorkspace from './components/FourierWorkspace';
import Pedalboard from './components/Pedalboard';
import ChainBypass from './components/ChainBypass';
import ProcessedGraphs from './components/ProcessedGraphs';
import TrackMaker from './components/TrackMaker';
import { appendTrack, insertCommand, nextTrackKey } from './core/scoreTools';
import { comparisonPhrase, type AuditionPhrase } from './core/comparison';
import ComparisonPanel from './components/ComparisonPanel';
import { version } from '../package.json';
const ScoreEditor = lazy(() => import('./components/ScoreEditor'));

type View = 'instrument' | 'compose' | 'learn';
function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}');
    return {
      autocomplete: saved.autocomplete !== false,
      monitor:
        typeof saved.monitor === 'number' && Number.isFinite(saved.monitor)
          ? clamp(saved.monitor, 0, 1)
          : 0.35,
    };
  } catch {
    return { autocomplete: true, monitor: 0.35 };
  }
}
function MiniWave({ kind }: { kind: string }) {
  const shapes: Record<string, string> = {
    sine: 'M2 18 C7 0 13 0 18 18 S29 36 34 18 S45 0 50 18',
    square: 'M2 28 L2 8 L14 8 L14 28 L26 28 L26 8 L38 8 L38 28 L50 28',
    saw: 'M2 28 L14 8 L14 28 L26 8 L26 28 L38 8 L38 28 L50 8',
    triangle: 'M2 18 L8 6 L20 30 L32 6 L44 30 L50 18',
  };
  return (
    <svg viewBox="0 0 52 36" aria-hidden="true">
      <path
        d={shapes[kind] ?? shapes.sine}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function RangeControl({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="range-control">
      <span className="range-title">
        {label}
        <span className="numeric-value">
          <input
            aria-label={`${label} exact value`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number(value.toFixed(3))}
            onChange={(e) => {
              if (e.target.value !== '' && Number.isFinite(Number(e.target.value)))
                onChange(clamp(Number(e.target.value), min, max));
            }}
          />
          {unit}
        </span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function App() {
  const [initial] = useState(loadProject);
  const [history, setHistory] = useState<History<Project>>({
    past: [],
    present: initial.project,
    future: [],
  });
  const project = history.present;
  const projectRef = useRef(project);
  projectRef.current = project;
  const [view, setView] = useState<View>('instrument');
  const [preferences, setPreferences] = useState(readPreferences);
  const [toast, setToast] = useState<string | null>(initial.warning);
  const [saveStatus, setSaveStatus] = useState('Saved locally');
  const [selectedPartial, setSelectedPartial] = useState('H1');
  const [solo, setSolo] = useState(false);
  const [undertonesOpen, setUndertonesOpen] = useState(false);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [macros, setMacros] = useState<Macros>(NEUTRAL_MACROS);
  const [selectedTrack, setSelectedTrack] = useState(project.tracks[0]?.key ?? '');
  const [pedalDestination, setPedalDestination] = useState('audition');
  const [selectedEvent, setSelectedEvent] = useState<ScoreEvent | null>(null);
  const [playback, setPlayback] = useState<'score' | 'audition' | null>(null);
  const [running, setRunning] = useState<{ text: string; score: CompiledScore } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [peak, setPeak] = useState(0);
  const [sampleRate, setSampleRate] = useState(48000);
  const [newPreset, setNewPreset] = useState(false);
  const [trackMakerOpen, setTrackMakerOpen] = useState(false);
  const [presetLabel, setPresetLabel] = useState('');
  const [presetKey, setPresetKey] = useState('');
  const [modalError, setModalError] = useState('');
  const [commandSearch, setCommandSearch] = useState('');
  const [commandsOpen, setCommandsOpen] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const engine = useRef(new AudioEngine());
  const auditionRequested = useRef(false);
  const editGroup = useRef({ key: '', time: 0 });
  const active = project.comparison.active;
  const sound = project.comparison[active];
  const macroBaseline = useRef<Sound>(structuredClone(sound));
  const instruments = project.instruments;
  const preset = instruments.find((i) => i.id === project.editorPresetId)!;
  const isCustom = JSON.stringify(sound) !== JSON.stringify(preset.sound);
  const score = useMemo(
    () =>
      parseScore(
        project.scoreText,
        instruments.map((i) => i.key),
      ),
    [project.scoreText, instruments],
  );
  const material = project.comparisonMaterial;
  const auditionPitch = material.kind === 'note' ? material.note : material.kind;
  const comparison = useMemo<{ phrase: AuditionPhrase | null; error: string | null }>(() => {
    try {
      return { phrase: comparisonPhrase(score, material), error: null };
    } catch (e) {
      return { phrase: null, error: (e as Error).message };
    }
  }, [score, material]);
  const referenceNote =
    comparison.phrase?.events.find((e) => e.notes.length)?.notes[0] ?? material.note;
  const fundamental = pitch(referenceNote).frequency;
  const partial = components(sound, fundamental, sampleRate).find(
    (c) => c.label === selectedPartial,
  )!;
  const metrics = descriptors(sound, fundamental, sampleRate);
  const track = project.tracks.find((t) => t.key === selectedTrack) ?? project.tracks[0];
  const associated = project.tracks.filter((t) => t.presetId === preset.id);

  const change = useCallback((mutate: (p: Project) => Project, groupKey = '') => {
    const time = Date.now();
    const grouped =
      !!groupKey &&
      editGroup.current.key === groupKey &&
      (groupKey.startsWith('waveform:') || time - editGroup.current.time < 900);
    editGroup.current = { key: groupKey, time };
    setHistory((h) => {
      const updated = mutate(h.present);
      if (updated === h.present) return h;
      const parsed = parseScore(
        updated.scoreText,
        updated.instruments.map((i) => i.key),
      );
      return commit(h, reconcileTracks(updated, parsed), grouped);
    });
  }, []);
  const resetMacros = (next: Sound) => {
    macroBaseline.current = structuredClone(next);
    setMacros({ ...NEUTRAL_MACROS });
  };
  const changeSound = (mutate: (s: Sound) => Sound, key = '', manual = true) => {
    const next = keepMatchingWavePoints(mutate(sound));
    if (manual) resetMacros(next);
    change((p) => ({ ...p, comparison: { ...p.comparison, [p.comparison.active]: next } }), key);
  };
  const travel = useCallback((direction: 'undo' | 'redo') => {
    editGroup.current = { key: '', time: 0 };
    setHistory((h) => {
      const next = direction === 'undo' ? undo(h) : redo(h);
      macroBaseline.current = structuredClone(
        next.present.comparison[next.present.comparison.active],
      );
      setMacros({ ...NEUTRAL_MACROS });
      return next;
    });
  }, []);

  useEffect(() => {
    setSaveStatus('Saving…');
    const timer = setTimeout(() => {
      try {
        const previous = localStorage.getItem(STORAGE_KEY);
        if (previous) {
          try {
            importProject(previous);
            localStorage.setItem(RECOVERY_KEY, previous);
          } catch {
            /* keep recoverable copy */
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
        setSaveStatus('Saved locally');
      } catch {
        setSaveStatus('Save unavailable');
        setToast('Local saving failed. Export JSON to keep your session.');
      }
    }, 400);
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projectRef.current));
      } catch {
        /* status already surfaced by autosave */
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
    };
  }, [project]);
  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      /* project export is still available */
    }
    engine.current.setMonitor(preferences.monitor);
  }, [preferences]);
  useEffect(() => {
    engine.current.setMix(project.mixGain);
  }, [project.mixGain]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    engine.current.onEnded = () => {
      auditionRequested.current = false;
      setPlayback(null);
      setElapsed(0);
      setPeak(0);
    };
    const timer = setInterval(() => {
      setElapsed(engine.current.progress);
      setPeak(engine.current.measure().peak);
      setPlayback(engine.current.mode);
      setSampleRate(engine.current.sampleRate);
    }, 50);
    return () => {
      clearInterval(timer);
      engine.current.onEnded = null;
      engine.current.stop();
    };
  }, []);
  useEffect(() => {
    if (newPreset) dialog.current?.showModal();
    else dialog.current?.close();
  }, [newPreset]);

  const stop = () => {
    auditionRequested.current = false;
    engine.current.stop();
    setRunning(null);
  };
  const playScore = async () => {
    auditionRequested.current = false;
    if (score.diagnostics.length) {
      setToast('Fix the score diagnostics before playing.');
      setView('compose');
      return;
    }
    try {
      await engine.current.play(score, project.tracks, project.processing);
      setPlayback(engine.current.mode);
      if (engine.current.mode) setRunning({ text: project.scoreText, score });
    } catch (e) {
      setToast(`Audio could not start: ${(e as Error).message}`);
    }
  };
  const audition = async (next = sound) => {
    if (!comparison.phrase) {
      auditionRequested.current = false;
      engine.current.stop();
      setToast(comparison.error);
      return;
    }
    auditionRequested.current = true;
    try {
      await engine.current.auditionPhrase(
        next,
        comparison.phrase,
        solo ? selectedPartial : undefined,
        project.processing.audition[active],
      );
      setPlayback(engine.current.mode);
      setRunning(null);
    } catch (e) {
      auditionRequested.current = false;
      setToast(`Audio could not start: ${(e as Error).message}`);
    }
  };
  const actionRef = useRef({ stop, playScore, audition });
  actionRef.current = { stop, playScore, audition };
  const previousAudition = useRef({ active, material, presetId: preset.id });
  useEffect(() => {
    const previous = previousAudition.current;
    previousAudition.current = { active, material, presetId: preset.id };
    if (engine.current.mode !== 'audition' && !auditionRequested.current) return;
    if (
      engine.current.mode !== 'audition' ||
      previous.active !== active ||
      previous.material !== material ||
      previous.presetId !== preset.id
    ) {
      void actionRef.current.audition();
    } else {
      engine.current.updateAudition(sound, solo ? selectedPartial : undefined);
      engine.current.updateProcessing(project.processing, active);
    }
  }, [active, material, preset.id, sound, solo, selectedPartial, project.processing]);
  useEffect(() => {
    if (engine.current.mode === 'score')
      engine.current.updateProcessing(project.processing, active);
  }, [project.processing, active]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"], dialog')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        travel(e.shiftKey ? 'redo' : 'undo');
      }
      if (e.code === 'Space' && !target.closest('button')) {
        e.preventDefault();
        if (engine.current.mode) actionRef.current.stop();
        else void actionRef.current.playScore();
      }
      if (e.key === 'Escape') actionRef.current.stop();
    };
    const endDrag = () => {
      editGroup.current = { key: '', time: 0 };
    };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('pointerup', endDrag);
    return () => {
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('pointerup', endDrag);
    };
  }, [travel]);
  const selectPreset = (id: string) => {
    const next = instruments.find((i) => i.id === id)!;
    resetMacros(next.sound);
    setSolo(false);
    change((p) => ({
      ...p,
      editorPresetId: id,
      comparison: { ...p.comparison, [p.comparison.active]: structuredClone(next.sound) },
    }));
  };
  const selectAB = (side: 'A' | 'B') => {
    if (side === active) return;
    resetMacros(project.comparison[side]);
    change((p) => ({ ...p, comparison: { ...p.comparison, active: side } }));
  };
  const copyAB = (from: 'A' | 'B', to: 'A' | 'B') => {
    change((p) => ({
      ...p,
      comparison: { ...p.comparison, [to]: structuredClone(p.comparison[from]) },
      processing: {
        ...p.processing,
        audition: { ...p.processing.audition, [to]: structuredClone(p.processing.audition[from]) },
      },
    }));
    if (to === active) resetMacros(project.comparison[from]);
    setToast(`Copied ${from} to ${to}.`);
  };
  const exportJson = async () => {
    if (window.fourpatakaDesktop?.saveProject) {
      try {
        const result = await window.fourpatakaDesktop.saveProject(
          JSON.stringify(project, null, 2),
          project.name,
        );
        if (!result.canceled) setToast(`Saved ${result.name}.`);
      } catch (e) {
        setToast(`Save failed: ${(e as Error).message}`);
      }
      return;
    }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^a-z0-9_-]/gi, '-') || 'FourPataka'}.fourpataka.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Project exported, including presets, track copies, and A/B sounds.');
  };
  const acceptProject = (text: string) => {
    const imported = importProject(text);
    stop();
    resetMacros(imported.comparison[imported.comparison.active]);
    change(() => imported);
    setSelectedTrack(imported.tracks[0]?.key ?? '');
    setSelectedEvent(null);
    setToast('Project imported. Undo restores your previous session.');
  };
  const openNativeProject = async () => {
    try {
      const result = await window.fourpatakaDesktop!.openProject!();
      if (!result.canceled && result.text !== undefined) acceptProject(result.text);
    } catch (e) {
      setToast(`Open failed: ${(e as Error).message}. Your session is unchanged.`);
    }
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Project file is too large (maximum 2 MB).');
      acceptProject(await file.text());
    } catch (e) {
      setToast(`Import failed: ${(e as Error).message}. Your session is unchanged.`);
    }
    if (fileInput.current) fileInput.current.value = '';
  };
  const savePreset = () => {
    change((p) => ({
      ...p,
      instruments: p.instruments.map((i) =>
        i.id === preset.id ? { ...i, sound: structuredClone(sound), version: i.version + 1 } : i,
      ),
    }));
    setToast(`${preset.label} saved. Track copies are unchanged; use Apply to update them.`);
  };
  const createPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruments.length >= 128) {
      setModalError('This project has reached its limit of 128 presets.');
      return;
    }
    if (!presetLabel.trim() || presetLabel.length > 100) {
      setModalError('Enter a label of 1–100 characters.');
      return;
    }
    if (!SCORE_KEY.test(presetKey) || presetKey.length > 100) {
      setModalError('Use a score key starting with a letter, followed by letters, digits, or _.');
      return;
    }
    if (instruments.some((i) => i.key === presetKey)) {
      setModalError('This score key already exists. Choose a unique key.');
      return;
    }
    const id = crypto.randomUUID();
    change((p) => ({
      ...p,
      editorPresetId: id,
      instruments: [
        ...p.instruments,
        {
          id,
          key: presetKey,
          label: presetLabel.trim(),
          version: 1,
          sound: structuredClone(sound),
        },
      ],
    }));
    setNewPreset(false);
    setToast(`Saved ${presetLabel.trim()} as “${presetKey}”.`);
  };
  const apply = (all: boolean) => {
    const targets = all ? associated.map((t) => t.key) : track ? [track.key] : [];
    change((p) => applyPreset(p, preset.id, sound, targets));
    setToast(`Applied to ${targets.join(', ')}. Undo restores the previous sounds.`);
  };
  const updateMacro = (key: keyof Macros, value: number) => {
    const next = { ...macros, [key]: value };
    setMacros(next);
    changeSound(() => transform(macroBaseline.current, next), `macro:${key}`, false);
  };
  const timelineScore = playback === 'score' && running ? running.score : score;
  const beat = playback === 'score' ? (elapsed * (running?.score.tempo ?? score.tempo)) / 60 : 0;
  const activeEvents =
    playback === 'score'
      ? timelineScore.events.filter((e) => beat >= e.beat && beat < e.beat + e.duration)
      : [];
  const stale = playback === 'score' && running?.text !== project.scoreText;
  const highlightedLines = stale ? [] : activeEvents.map((e) => e.line);
  const menuActions = useRef<(action: string) => void>(() => {});
  menuActions.current = (action) => {
    if (action === 'open') void openNativeProject();
    else if (action === 'save') void exportJson();
    else if (action === 'undo' || action === 'redo') travel(action);
    else if (action === 'instrument' || action === 'compose' || action === 'learn') setView(action);
    else if (action === 'play') void playScore();
    else if (action === 'stop') stop();
    else if (action === 'commands') {
      setView('compose');
      setCommandsOpen(true);
      requestAnimationFrame(() =>
        document.querySelector('.commands-panel')?.scrollIntoView({ block: 'center' }),
      );
    } else if (action === 'track') {
      if (
        playback === 'score' ||
        score.diagnostics.some((d) => d.message !== 'Add a track to start composing.')
      ) {
        setToast('Stop playback and fix score diagnostics before making a track.');
        return;
      }
      setView('compose');
      setTrackMakerOpen(true);
    }
  };
  useEffect(
    () => window.fourpatakaDesktop?.onMenuAction((action) => menuActions.current(action)),
    [],
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView('instrument');
          }}
          aria-label="FourPataka home"
        >
          <span className="brand-mark">
            <Waves size={23} />
          </span>
          <span>
            Four<span className="brand-light">Pataka</span>
          </span>
        </a>
        <div className="project-identity">
          <span className="eyebrow">PROJECT</span>
          <input
            aria-label="Project name"
            maxLength={100}
            value={project.name}
            onChange={(e) => {
              const value = e.target.value;
              if (value.trim()) change((p) => ({ ...p, name: value }), 'project-name');
            }}
          />
          <span className="save-state">
            <span className={`status-dot ${saveStatus === 'Save unavailable' ? 'error' : ''}`} />
            {saveStatus}
          </span>
        </div>
        <div className="file-actions">
          <button
            className="icon-button"
            title="Undo (Ctrl/⌘ Z)"
            aria-label="Undo"
            disabled={!history.past.length}
            onClick={() => travel('undo')}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button"
            title="Redo (Ctrl/⌘ Shift Z)"
            aria-label="Redo"
            disabled={!history.future.length}
            onClick={() => travel('redo')}
          >
            <Redo2 size={17} />
          </button>
          <span className="divider" />
          <button
            className="subtle-button"
            onClick={() =>
              window.fourpatakaDesktop?.openProject
                ? void openNativeProject()
                : fileInput.current?.click()
            }
          >
            <Upload size={15} />
            <span>{window.fourpatakaDesktop ? 'Open project' : 'Import'}</span>
          </button>
          <button className="subtle-button" onClick={exportJson}>
            <ArrowDownToLine size={15} />
            <span>{window.fourpatakaDesktop ? 'Save project' : 'Export JSON'}</span>
          </button>
          <input
            type="file"
            ref={fileInput}
            accept=".json,application/json"
            hidden
            onChange={(e) => void readFile(e.target.files?.[0])}
          />
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="sidebar-section-label">WORKSPACE</div>
          <nav aria-label="Studio views">
            {[
              {
                id: 'instrument' as const,
                name: 'Instrument',
                icon: SlidersHorizontal,
              },
              {
                id: 'compose' as const,
                name: 'Compose',
                icon: FileMusic,
              },
            ].map((item) => (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? 'active' : ''}`}
                onClick={() => setView(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
                {view === item.id && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <button
            className={`learn-link ${view === 'learn' ? 'active' : ''}`}
            onClick={() => setView('learn')}
            aria-current={view === 'learn' ? 'page' : undefined}
            aria-label="Learn"
          >
            <BookOpen size={14} /> Learn
          </button>
          <div className="library-title">
            <span className="sidebar-section-label">INSTRUMENT LIBRARY</span>
            <button
              className="icon-button"
              aria-label="Save sound as new preset"
              title="Save as new"
              onClick={() => {
                setPresetLabel('');
                setPresetKey('');
                setModalError('');
                setNewPreset(true);
              }}
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="preset-list">
            {instruments.map((i) => (
              <button
                key={i.id}
                onClick={() => {
                  selectPreset(i.id);
                  setView('instrument');
                }}
                className={`preset-item ${preset.id === i.id ? 'selected' : ''}`}
              >
                <span className="preset-mini">
                  <MiniWave kind={i.key} />
                </span>
                <span>
                  {i.label}
                  <small>{i.key}</small>
                </span>
                {preset.id === i.id && <span className="preset-dot" />}
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <span className="version-label">FourPataka · v{version}</span>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-heading">
            <h1>
              {view === 'instrument' ? 'Instrument' : view === 'compose' ? 'Compose' : 'Learn'}
            </h1>
            <span className="page-metadata">
              {view === 'instrument'
                ? `${referenceNote} · ${fundamental.toFixed(2)} Hz${material.kind === 'phrase' ? ' · phrase reference' : ''} · ${sampleRate / 1000} kHz`
                : view === 'compose'
                  ? `${score.tracks.length} tracks · ${score.tempo} BPM · ${score.seconds.toFixed(2)} s`
                  : 'Source model · Fourier coefficients'}
            </span>
          </div>

          {view === 'instrument' && (
            <>
              <section className="panel instrument-panel">
                <div className="panel-header instrument-header">
                  <div className="instrument-title">
                    <span className="title-wave">
                      <MiniWave kind={preset.key} />
                    </span>
                    <div>
                      <div className="context-label">
                        EDITING SNAPSHOT {active} · LIBRARY: {preset.key}
                      </div>
                      <h2>
                        {preset.label}
                        <span className={`tag ${isCustom ? 'custom' : ''}`}>
                          {isCustom ? 'CUSTOM' : 'PRESET'}
                        </span>
                      </h2>
                    </div>
                  </div>
                  <div className="button-group">
                    <button className="secondary-button" onClick={savePreset} disabled={!isCustom}>
                      <Save size={14} />
                      Save preset
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setPresetLabel('');
                        setPresetKey('');
                        setModalError('');
                        setNewPreset(true);
                      }}
                    >
                      <Plus size={14} />
                      Save as new
                    </button>
                  </div>
                </div>
                <FourierWorkspace
                  sound={sound}
                  onChange={(next, group) => changeSound(() => next, group)}
                >
                  <div className="harmonics-heading">
                    <div>
                      <h3>
                        Harmonic mixer <span>16 partials</span>
                      </h3>
                      <p>Each bar adds a sine wave at a multiple of your note.</p>
                    </div>
                    <span className="small-label">MAGNITUDE 0—1</span>
                  </div>
                  <div className="harmonic-mixer">
                    <div className="mixer-axis">
                      <span>1.0</span>
                      <span>0.5</span>
                      <span>0.0</span>
                    </div>
                    <div className="harmonic-bars">
                      {sound.harmonics.map((magnitude, i) => {
                        const component = components(sound, fundamental, sampleRate)[i];
                        const selected = selectedPartial === component.label;
                        return (
                          <div
                            key={i}
                            className={`harmonic-column ${selected ? 'selected' : ''} ${!component.available ? 'unavailable' : ''}`}
                          >
                            <input
                              className="harmonic-number"
                              aria-label={`H${i + 1} exact magnitude`}
                              type="number"
                              min="0"
                              max="1"
                              step=".01"
                              value={Number(magnitude.toFixed(3))}
                              onFocus={() => setSelectedPartial(component.label)}
                              onChange={(e) => {
                                if (e.target.value !== '')
                                  changeSound(
                                    (s) => ({
                                      ...s,
                                      harmonics: s.harmonics.map((v, index) =>
                                        index === i ? clamp(Number(e.target.value), 0, 1) : v,
                                      ),
                                    }),
                                    `harmonic:${i}`,
                                  );
                              }}
                            />
                            <div className="bar-track">
                              <div className="bar-fill" style={{ height: `${magnitude * 100}%` }} />
                              <div
                                className="bar-handle"
                                style={{ bottom: `${magnitude * 100}%` }}
                              />
                              <input
                                type="range"
                                className="vertical-range"
                                aria-label={`H${i + 1} magnitude`}
                                min="0"
                                max="1"
                                step=".01"
                                value={magnitude}
                                onFocus={() => setSelectedPartial(component.label)}
                                onPointerDown={() => setSelectedPartial(component.label)}
                                onChange={(e) =>
                                  changeSound(
                                    (s) => ({
                                      ...s,
                                      harmonics: s.harmonics.map((v, index) =>
                                        index === i ? Number(e.target.value) : v,
                                      ),
                                    }),
                                    `harmonic:${i}`,
                                  )
                                }
                              />
                            </div>
                            <button
                              className="harmonic-label"
                              onClick={() => setSelectedPartial(component.label)}
                              aria-pressed={selected}
                            >
                              H{i + 1}
                              {sound.polarity[i] === -1 && <sup>−</sup>}
                            </button>
                            <span className="partial-frequency">
                              {component.frequency >= 1000
                                ? `${(component.frequency / 1000).toFixed(1)}k`
                                : Math.round(component.frequency)}
                              <small>Hz</small>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mixer-bottom">
                    <span>
                      <span className="orange-dot" />
                      H1 = f₀ · H2–H16 = 2f₀–16f₀
                    </span>
                    <button
                      className="text-button"
                      onClick={() => {
                        changeSound(() => mathematicalPreset('sine'));
                        setToast('Reset to a pure sine. Undo brings back your sound.');
                      }}
                    >
                      <RotateCcw size={13} />
                      Reset to sine
                    </button>
                  </div>
                </FourierWorkspace>
                <div className="undertone-section">
                  <div className="disclosure-row">
                    <button
                      className="disclosure-button"
                      onClick={() => setUndertonesOpen(!undertonesOpen)}
                      aria-expanded={undertonesOpen}
                    >
                      {undertonesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span>Undertones</span>
                      <span className="tag pink">OPTIONAL</span>
                      <span className="disclosure-detail">Explore below the fundamental</span>
                    </button>
                    <button
                      className={`toggle ${sound.undertonesEnabled ? 'on pink-toggle' : ''}`}
                      aria-label="Enable undertone bank"
                      role="switch"
                      aria-checked={sound.undertonesEnabled}
                      onClick={() =>
                        changeSound((s) => ({ ...s, undertonesEnabled: !s.undertonesEnabled }))
                      }
                    >
                      <span />
                    </button>
                  </div>
                  {undertonesOpen && (
                    <div className="undertone-controls">
                      {sound.undertones.map((value, i) => (
                        <div key={i}>
                          <button
                            className={`text-button pink-text ${selectedPartial === `f₀/${i + 2}` ? 'selected' : ''}`}
                            onClick={() => setSelectedPartial(`f₀/${i + 2}`)}
                          >
                            f₀/{i + 2} · {(fundamental / (i + 2)).toFixed(2)} Hz
                          </button>
                          <RangeControl
                            label={`Undertone ${i + 2}`}
                            value={value}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={(n) =>
                              changeSound(
                                (s) => ({
                                  ...s,
                                  undertones: s.undertones.map((v, j) => (i === j ? n : v)),
                                }),
                                `sub:${i}`,
                              )
                            }
                          />
                        </div>
                      ))}
                      <p className="footnote">
                        {sound.undertonesEnabled
                          ? 'Bank enabled. These lower components may change the perceived pitch.'
                          : 'Bank disabled. Saved slider values are preserved and produce no sound.'}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <Pedalboard
                processing={project.processing}
                trackKeys={project.tracks.map((t) => t.key)}
                active={active}
                destination={pedalDestination}
                onDestination={setPedalDestination}
                onChange={(processing, group) => change((p) => ({ ...p, processing }), group)}
                pending={engine.current.processingPending(project.processing, active)}
                onReplay={() => void audition()}
              />
              <ProcessedGraphs
                analyser={engine.current.outputAnalyser(pedalDestination)}
                sampleRate={sampleRate}
                label={
                  pedalDestination === 'audition'
                    ? `audition ${active}, before mix gain`
                    : pedalDestination === 'master'
                      ? 'master, before mix gain'
                      : `${pedalDestination}, before track level`
                }
              />
              <ComparisonPanel
                material={material}
                score={score}
                phrase={comparison.phrase}
                error={comparison.error}
                active={active}
                elapsed={playback === 'audition' ? elapsed : 0}
                onChange={(next) => change((p) => ({ ...p, comparisonMaterial: next }))}
                onCopy={copyAB}
                onReplay={() => void audition()}
              />
              <div className="instrument-lower">
                <div className="lower-main">
                  <SourceGraphs
                    sound={sound}
                    frequency={fundamental}
                    sampleRate={sampleRate}
                    selected={selectedPartial}
                    onSelect={setSelectedPartial}
                  />
                  <section className="panel shaping-panel">
                    <div className="section-title">
                      <h3>Envelope & level</h3>
                    </div>
                    <div className="envelope-controls">
                      <RangeControl
                        label="Attack"
                        value={sound.attack * 1000}
                        min={5}
                        max={2000}
                        step={5}
                        unit="ms"
                        onChange={(n) => changeSound((s) => ({ ...s, attack: n / 1000 }), 'attack')}
                      />
                      <RangeControl
                        label="Release"
                        value={sound.release * 1000}
                        min={10}
                        max={3000}
                        step={10}
                        unit="ms"
                        onChange={(n) =>
                          changeSound((s) => ({ ...s, release: n / 1000 }), 'release')
                        }
                      />
                      <RangeControl
                        label="Output trim"
                        value={sound.trim}
                        min={-36}
                        max={0}
                        step={1}
                        unit="dB"
                        onChange={(n) => changeSound((s) => ({ ...s, trim: n }), 'trim')}
                      />
                    </div>
                  </section>
                  <section className="panel macro-panel">
                    <button
                      className="disclosure-button"
                      onClick={() => setMacrosOpen(!macrosOpen)}
                      aria-expanded={macrosOpen}
                    >
                      {macrosOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span>Coefficient macros</span>
                    </button>
                    {macrosOpen && (
                      <div className="macro-controls">
                        <RangeControl
                          label="Falloff"
                          value={macros.falloff}
                          min={0}
                          max={2}
                          step={0.05}
                          onChange={(n) => updateMacro('falloff', n)}
                        />
                        <RangeControl
                          label="Brightness"
                          value={macros.brightness}
                          min={-1}
                          max={1}
                          step={0.05}
                          onChange={(n) => updateMacro('brightness', n)}
                        />
                        <RangeControl
                          label="Odd / even"
                          value={macros.oddEven}
                          min={-1}
                          max={1}
                          step={0.05}
                          onChange={(n) => updateMacro('oddEven', n)}
                        />
                        <RangeControl
                          label="Sub weight"
                          value={macros.subWeight}
                          min={0}
                          max={2}
                          step={0.05}
                          onChange={(n) => updateMacro('subWeight', n)}
                        />
                        <button
                          className="text-button"
                          onClick={() => {
                            setMacros({ ...NEUTRAL_MACROS });
                            changeSound(() => structuredClone(macroBaseline.current), '', false);
                          }}
                        >
                          <RotateCcw size={13} />
                          Reset macros
                        </button>
                        <p className="footnote">
                          Transforms use a stable baseline. A manual edit captures a new baseline;
                          zero partials stay zero.
                        </p>
                      </div>
                    )}
                  </section>
                </div>
                <aside className="inspector-stack">
                  <section className="panel partial-inspector">
                    <div className="section-title">
                      <h3>Partial inspector</h3>
                      <CircleHelp size={14} />
                    </div>
                    <div className="inspector-symbol">
                      {partial.label}
                      <span>
                        {partial.kind === 'harmonic'
                          ? partial.index === 0
                            ? 'FUNDAMENTAL'
                            : 'OVERTONE'
                          : 'SUBHARMONIC'}
                      </span>
                    </div>
                    <div className="frequency-equation">
                      {fundamental.toFixed(2)}{' '}
                      {partial.kind === 'harmonic'
                        ? `× ${partial.index + 1}`
                        : `÷ ${partial.index + 2}`}
                      <strong>
                        {partial.frequency.toFixed(2)} <small>Hz</small>
                      </strong>
                    </div>
                    <dl>
                      <div>
                        <dt>Magnitude</dt>
                        <dd>{partial.magnitude.toFixed(3)}</dd>
                      </div>
                      <div>
                        <dt>Coefficient level</dt>
                        <dd>{coefficientDb(partial.magnitude)} dB</dd>
                      </div>
                      <div>
                        <dt>Polarity</dt>
                        <dd>{partial.polarity === 1 ? 'Normal (+)' : 'Inverted (−)'}</dd>
                      </div>
                    </dl>
                    <p className="footnote">
                      dB relative to magnitude 1, before trim.{' '}
                      {partial.frequency < 20
                        ? 'Below the ordinary audible range.'
                        : !partial.available
                          ? 'Above Nyquist: excluded from playback at this pitch.'
                          : ''}
                    </p>
                    <button
                      className={`secondary-button full-width ${solo ? 'solo-active' : ''}`}
                      onClick={() => {
                        setSolo(!solo);
                        if (playback !== 'audition' && comparison.phrase) {
                          auditionRequested.current = true;
                          void engine.current
                            .auditionPhrase(
                              sound,
                              comparison.phrase,
                              !solo ? selectedPartial : undefined,
                              project.processing.audition[active],
                            )
                            .catch((e) => {
                              auditionRequested.current = false;
                              setToast(e.message);
                            });
                        }
                      }}
                      disabled={!solo && !!comparison.error}
                    >
                      <Headphones size={14} />
                      {solo ? 'Solo on · return to instrument' : `Solo ${partial.label}`}
                    </button>
                  </section>
                  <section className="apply-card">
                    <div className="eyebrow">APPLY SOUND</div>
                    <label className="track-select-label">
                      Destination
                      <select
                        aria-label="Apply destination"
                        value={track?.key ?? ''}
                        onChange={(e) => setSelectedTrack(e.target.value)}
                      >
                        {project.tracks.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.key}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="primary-button full-width"
                      disabled={!track || !!score.diagnostics.length || playback === 'score'}
                      onClick={() => apply(false)}
                    >
                      Apply to {track?.key ?? 'track'}
                      <ArrowRight size={14} />
                    </button>
                    <button
                      className="text-button full-width"
                      disabled={
                        !associated.length || !!score.diagnostics.length || playback === 'score'
                      }
                      onClick={() => apply(true)}
                    >
                      Apply to all using this preset
                    </button>
                    <p className="footnote">
                      Affected: {associated.map((t) => t.key).join(', ') || 'no associated tracks'}.
                      Each application is undoable.{' '}
                      {score.diagnostics.length
                        ? 'Fix the score before applying.'
                        : playback === 'score'
                          ? 'Stop playback before changing assignments.'
                          : ''}
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}

          {view === 'compose' && (
            <>
              <div className="compose-layout">
                <section className="panel editor-panel">
                  <div className="panel-header">
                    <div>
                      <h2>
                        Score <span className="tag">.fourier</span>
                      </h2>
                    </div>
                    <div className="editor-options">
                      <button
                        className="primary-button"
                        disabled={
                          playback === 'score' ||
                          score.diagnostics.some(
                            (d) => d.message !== 'Add a track to start composing.',
                          )
                        }
                        onClick={() => setTrackMakerOpen(true)}
                      >
                        <Plus size={14} />
                        Make a track
                      </button>
                      <label>
                        Autocomplete
                        <button
                          className={`toggle ${preferences.autocomplete ? 'on' : ''}`}
                          aria-label="Autocomplete"
                          role="switch"
                          aria-checked={preferences.autocomplete}
                          onClick={() =>
                            setPreferences((p) => ({ ...p, autocomplete: !p.autocomplete }))
                          }
                        >
                          <span />
                        </button>
                      </label>
                    </div>
                  </div>
                  <Suspense fallback={<div className="editor-loading">Opening score editor…</div>}>
                    <ScoreEditor
                      value={project.scoreText}
                      onChange={(text) => {
                        if (projectRef.current.scoreText !== text)
                          change((p) => ({ ...p, scoreText: text }), 'score-text');
                      }}
                      diagnostics={score.diagnostics}
                      autocomplete={preferences.autocomplete}
                      presetKeys={instruments.map((i) => i.key)}
                      lines={highlightedLines}
                      onUndo={() => travel('undo')}
                      onRedo={() => travel('redo')}
                    />
                  </Suspense>
                  <div className={`editor-status ${score.diagnostics.length ? 'invalid' : ''}`}>
                    <span>
                      {score.diagnostics.length ? (
                        <>
                          <X size={13} />
                          {score.diagnostics.length}{' '}
                          {score.diagnostics.length === 1 ? 'diagnostic' : 'diagnostics'}
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          Ready to play
                        </>
                      )}
                    </span>
                    <span>
                      {stale
                        ? 'Playing previous version · replay to hear edits'
                        : `${score.tracks.length} tracks · ${score.beats} beats · ${score.seconds.toFixed(2)} s`}
                    </span>
                  </div>
                  {score.diagnostics.length > 0 && (
                    <div className="diagnostics-list">
                      {score.diagnostics.map((d, i) => (
                        <div key={i}>
                          <span>LINE {d.line}</span>
                          {d.message}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <div className="composition-right">
                  <section className="panel timeline-panel">
                    <div className="panel-header">
                      <div>
                        <h2>Timeline</h2>
                      </div>
                      <span className="tag">4/4</span>
                    </div>
                    <div className="timeline">
                      <div className="timeline-ruler">
                        {Array.from({ length: Math.ceil(timelineScore.beats / 4) + 1 }, (_, i) => (
                          <span key={i}>BAR {i + 1}</span>
                        ))}
                      </div>
                      {timelineScore.tracks.map((t) => (
                        <div className="timeline-track" key={t.key}>
                          <div className="timeline-track-name">
                            {t.key}
                            <span>{t.instrumentKey}</span>
                          </div>
                          <div className="timeline-lane">
                            {Array.from({ length: Math.ceil(timelineScore.beats) }, (_, i) => (
                              <span
                                className="beat-line"
                                key={i}
                                style={{ left: `${(i / Math.max(timelineScore.beats, 4)) * 100}%` }}
                              />
                            ))}
                            {t.events.map((e) => (
                              <button
                                key={e.id}
                                aria-label={`${e.track} ${e.notes.join(' ') || 'rest'}, beat ${e.beat + 1}`}
                                className={`timeline-event ${e.notes.length ? '' : 'rest-event'} ${activeEvents.some((a) => a.id === e.id) ? 'playing' : ''} ${selectedEvent?.id === e.id ? 'selected' : ''}`}
                                style={{
                                  left: `${(e.beat / Math.max(timelineScore.beats, 4)) * 100}%`,
                                  width: `calc(${(e.duration / Math.max(timelineScore.beats, 4)) * 100}% - 3px)`,
                                }}
                                onClick={() => setSelectedEvent(e)}
                              >
                                {e.notes.join(' · ') || 'rest'}
                              </button>
                            ))}
                            {playback === 'score' && (
                              <span
                                className="playhead"
                                style={{
                                  left: `${Math.min(100, (beat / Math.max(timelineScore.beats, 4)) * 100)}%`,
                                }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="footnote">
                      Tracks start together. Select an event to inspect its pitch and timing.
                    </p>
                  </section>
                  <section className="panel track-instances">
                    <div className="section-title">
                      <h3>Independent track sounds</h3>
                      <Layers3 size={15} />
                    </div>
                    <ChainBypass
                      name="master"
                      chain={project.processing.master}
                      onChange={(chain) =>
                        change((p) => ({ ...p, processing: { ...p.processing, master: chain } }))
                      }
                      onEdit={() => {
                        setPedalDestination('master');
                        setView('instrument');
                      }}
                    />
                    {project.tracks.map((t) => {
                      const library = instruments.find((i) => i.id === t.presetId)!;
                      const custom = JSON.stringify(t.sound) !== JSON.stringify(library.sound);
                      return (
                        <div className="track-instance" key={t.key}>
                          <div>
                            <Music2 size={16} />
                            <strong>{t.key}</strong>
                            <span className="tag">{custom ? 'CUSTOM' : library.label}</span>
                          </div>
                          <RangeControl
                            label={`${t.key} level`}
                            value={t.level * 100}
                            min={0}
                            max={100}
                            step={1}
                            unit="%"
                            onChange={(n) =>
                              change(
                                (p) => ({
                                  ...p,
                                  tracks: p.tracks.map((track) =>
                                    track.key === t.key ? { ...track, level: n / 100 } : track,
                                  ),
                                }),
                                `track-level:${t.key}`,
                              )
                            }
                          />
                          <button
                            className="text-button"
                            onClick={() => {
                              resetMacros(t.sound);
                              change((p) => ({
                                ...p,
                                editorPresetId: t.presetId,
                                comparison: {
                                  ...p.comparison,
                                  [p.comparison.active]: structuredClone(t.sound),
                                },
                                processing: {
                                  ...p.processing,
                                  audition: {
                                    ...p.processing.audition,
                                    [p.comparison.active]: structuredClone(
                                      p.processing.tracks[t.key],
                                    ),
                                  },
                                },
                              }));
                              setSelectedTrack(t.key);
                              setView('instrument');
                            }}
                          >
                            Load copy into editor
                            <ArrowRight size={12} />
                          </button>
                          <ChainBypass
                            name={`track ${t.key}`}
                            chain={project.processing.tracks[t.key]}
                            onChange={(chain) =>
                              change((p) => ({
                                ...p,
                                processing: {
                                  ...p.processing,
                                  tracks: { ...p.processing.tracks, [t.key]: chain },
                                },
                              }))
                            }
                            onEdit={() => {
                              setPedalDestination(`track:${t.key}`);
                              setView('instrument');
                            }}
                          />
                          {t.appliedVersion < library.version && (
                            <span className="footnote">
                              Library v{library.version} available · this copy keeps v
                              {t.appliedVersion}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <p className="footnote">
                      Preset changes never overwrite a track. Load, edit, and explicitly Apply to
                      update a destination.
                    </p>
                  </section>
                  {selectedEvent && (
                    <section className="panel event-inspector">
                      <div className="section-title">
                        <h3>Event inspector</h3>
                        <button
                          className="icon-button"
                          aria-label="Close event inspector"
                          onClick={() => setSelectedEvent(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <strong>{selectedEvent.notes.join(' · ') || 'Rest'}</strong>
                      <p>
                        {selectedEvent.track} · line {selectedEvent.line}
                      </p>
                      <dl>
                        <div>
                          <dt>Start</dt>
                          <dd>Beat {selectedEvent.beat + 1}</dd>
                        </div>
                        <div>
                          <dt>Duration</dt>
                          <dd>{selectedEvent.duration} beats</dd>
                        </div>
                        <div>
                          <dt>Frequencies</dt>
                          <dd>
                            {selectedEvent.frequencies
                              .map((f) => `${f.toFixed(2)} Hz`)
                              .join(', ') || 'No new voice'}
                          </dd>
                        </div>
                      </dl>
                    </section>
                  )}
                </div>
              </div>
              <section className="panel commands-panel">
                <div className="commands-header">
                  <button
                    className="disclosure-button"
                    onClick={() => setCommandsOpen(!commandsOpen)}
                    aria-expanded={commandsOpen}
                  >
                    {commandsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <h3>Command reference</h3>
                    <span className="tag">8 COMMANDS</span>
                  </button>
                  <label className="search-box">
                    <Search size={14} />
                    <input
                      aria-label="Search commands"
                      placeholder="Find a command…"
                      value={commandSearch}
                      onChange={(e) => setCommandSearch(e.target.value)}
                    />
                  </label>
                </div>
                {commandsOpen && (
                  <>
                    <div className="command-destination">
                      <label>
                        Insert events into
                        <select
                          aria-label="Command insertion track"
                          value={track?.key ?? ''}
                          onChange={(e) => setSelectedTrack(e.target.value)}
                        >
                          {project.tracks.map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.key}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span>
                        {playback === 'score'
                          ? 'Stop playback to insert commands.'
                          : 'Click a card to insert. Events go to the selected track.'}
                      </span>
                    </div>
                    <div className="command-grid">
                      {COMMANDS.filter((c) =>
                        `${c.name} ${c.description}`
                          .toLowerCase()
                          .includes(commandSearch.toLowerCase()),
                      ).map((c) => (
                        <button
                          className="command-item"
                          key={c.name}
                          title={`Insert ${c.name}`}
                          aria-label={`Insert ${c.name} command`}
                          disabled={
                            playback === 'score' ||
                            score.diagnostics.some(
                              (d) => d.message !== 'Add a track to start composing.',
                            )
                          }
                          onClick={() => {
                            try {
                              const text = insertCommand(
                                project.scoreText,
                                instruments.map((i) => i.key),
                                c.name,
                                track?.key ?? '',
                                preset.key,
                              );
                              change((p) => ({ ...p, scoreText: text }));
                              setToast(
                                `Inserted ${c.name}${['tempo', 'time', 'track'].includes(c.name) ? '' : ` into ${track?.key}`}.`,
                              );
                            } catch (e) {
                              setToast((e as Error).message);
                            }
                          }}
                        >
                          <div>
                            <code>{c.snippet}</code>
                            <Plus size={13} />
                          </div>
                          <p>{c.description}</p>
                        </button>
                      ))}
                    </div>
                    <div className="commands-footer">
                      Durations: whole · half · quarter · 8th · 16th
                    </div>
                  </>
                )}
              </section>
            </>
          )}

          {view === 'learn' && (
            <>
              <section className="learn-intro">
                <span className="learn-equation">
                  x(t) = <span>Σ</span> aₕ sin(2πhf₀t)
                </span>
                <div>
                  <h2>Fourier source</h2>
                  <p>
                    Every harmonic is a sine wave. Its frequency decides where it sits; its
                    magnitude decides how much it contributes. Combine a handful and a new timbre
                    appears.
                  </p>
                  <button className="text-button" onClick={() => setView('instrument')}>
                    Open instrument
                    <ArrowRight size={15} />
                  </button>
                </div>
              </section>
              <div className="experiment-grid">
                {[
                  {
                    n: '01',
                    title: 'Build a square',
                    detail:
                      'Keep only odd harmonics, with magnitudes 1/h. Listen to how sixteen terms approximate the sharp edges.',
                    kind: 'square' as WavePreset,
                    action: (s: Sound) => s,
                  },
                  {
                    n: '02',
                    title: 'Soften the edges',
                    detail:
                      'The triangle uses 1/h² and alternating signs. Higher partials fade much faster than in a square.',
                    kind: 'triangle' as WavePreset,
                    action: (s: Sound) => s,
                  },
                  {
                    n: '03',
                    title: 'The missing fundamental',
                    detail:
                      'Remove H1 from a square approximation. The remaining pattern can still suggest the original pitch.',
                    kind: 'square' as WavePreset,
                    action: (s: Sound) => ({
                      ...s,
                      harmonics: s.harmonics.map((v, i) => (i === 0 ? 0 : v)),
                    }),
                  },
                  {
                    n: '04',
                    title: 'Go an octave below',
                    detail:
                      'Add a quiet f₀/2 beneath a sine. Compare with the bank disabled: this component sits below the reference note.',
                    kind: 'sine' as WavePreset,
                    action: (s: Sound) => ({
                      ...s,
                      undertonesEnabled: true,
                      undertones: [0.25, 0, 0, 0, 0],
                    }),
                  },
                ].map((experiment) => (
                  <section className="panel experiment-card" key={experiment.n}>
                    <div className="experiment-top">
                      <span>{experiment.n}</span>
                      <MiniWave kind={experiment.kind} />
                    </div>
                    <h3>{experiment.title}</h3>
                    <p>{experiment.detail}</p>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        const next = experiment.action(mathematicalPreset(experiment.kind));
                        resetMacros(next);
                        change((p) => ({
                          ...p,
                          comparison: { ...p.comparison, [p.comparison.active]: next },
                        }));
                        setView('instrument');
                        if (experiment.n === '04') setUndertonesOpen(true);
                        setToast(
                          'Experiment loaded. All controls are editable; Undo restores your previous sound.',
                        );
                      }}
                    >
                      Load experiment
                      <ArrowRight size={14} />
                    </button>
                  </section>
                ))}
              </div>
              <section className="panel analysis-panel">
                <div className="section-title">
                  <h3>Your source, measured</h3>
                  <span className="tag">STEADY MODEL · {referenceNote}</span>
                </div>
                {metrics.power ? (
                  <div className="analysis-metrics">
                    <div>
                      <span>Power-weighted centroid</span>
                      <strong>
                        {Math.round(metrics.centroid!)}
                        <small> Hz</small>
                      </strong>
                    </div>
                    <div>
                      <span>Odd harmonic power · includes H1</span>
                      <strong>
                        {Math.round(metrics.oddShare * 100)}
                        <small>%</small>
                      </strong>
                    </div>
                    <div>
                      <span>Subharmonic power share</span>
                      <strong>
                        {Math.round(metrics.subShare * 100)}
                        <small>%</small>
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="silence-state">
                    Silence · no effective components. Centroid and power shares are undefined.
                  </p>
                )}
                <p className="footnote">
                  Computed from available source coefficients before trim and envelope. These
                  describe the mathematical source, not measured loudness or a processed recording.
                </p>
              </section>
              <div className="learn-note">
                <BookOpen size={18} />
                <p>
                  FourPataka starts with finite Fourier approximations. Sixteen partials suggest a
                  shape; they don’t reproduce an ideal discontinuity or an acoustic instrument
                  exactly.
                </p>
              </div>
            </>
          )}

          <footer className="workspace-footer">
            <span>
              <span className="status-dot" />
              {project.instruments.length} instrument presets
            </span>
            <span>
              {sampleRate / 1000} kHz · {32} voice cap
            </span>
          </footer>
        </main>
      </div>

      <div className="transport">
        <div className="main-transport">
          <button
            className="play-button"
            aria-label={playback === 'score' ? 'Stop score' : 'Play score'}
            disabled={score.diagnostics.length > 0 && playback !== 'score'}
            onClick={() => (playback === 'score' ? stop() : void playScore())}
          >
            {playback === 'score' ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
          </button>
          <button
            className="stop-button"
            aria-label="Stop all sound"
            title="Stop (Escape)"
            onClick={stop}
          >
            <Square size={15} fill="currentColor" />
          </button>
          <div className="transport-time">
            <strong>
              {playback
                ? `${Math.floor(elapsed / 60)
                    .toString()
                    .padStart(2, '0')}:${Math.floor(elapsed % 60)
                    .toString()
                    .padStart(2, '0')}`
                : '00:00'}
              <span>
                {playback === 'score'
                  ? 'PLAYING'
                  : playback === 'audition'
                    ? `COMPARE ${active}`
                    : 'READY'}
              </span>
            </strong>
            <span>
              {score.tempo} <small>BPM</small>
              <span className="footer-separator">/</span>4/4
            </span>
          </div>
        </div>
        <div className="audition-transport">
          <span className="small-label">AUDITION</span>
          <select
            aria-label="Audition pitch"
            value={auditionPitch}
            onChange={(e) =>
              change((p) => ({
                ...p,
                comparisonMaterial: {
                  ...p.comparisonMaterial,
                  kind:
                    e.target.value === 'phrase'
                      ? 'phrase'
                      : e.target.value === 'chord'
                        ? 'chord'
                        : 'note',
                  note: ['phrase', 'chord'].includes(e.target.value)
                    ? p.comparisonMaterial.note
                    : e.target.value,
                },
              }))
            }
          >
            {Array.from(
              new Set([
                'C2',
                'C3',
                'C4',
                'A4',
                'C5',
                'C6',
                'C7',
                'C8',
                material.note,
                'chord',
                'phrase',
              ]),
            ).map((note) => (
              <option key={note} value={note}>
                {note === 'phrase'
                  ? `Phrase · ${material.trackKey}`
                  : note === 'chord'
                    ? 'Bb4 · D5 · F5'
                    : `${note} · ${pitch(note).frequency.toFixed(1)} Hz`}
              </option>
            ))}
          </select>
          <button
            className={`audition-button ${playback === 'audition' ? 'playing' : ''}`}
            onClick={() => void audition()}
            disabled={!!comparison.error}
          >
            <Headphones size={15} />
            <span>{solo ? `Solo ${selectedPartial}` : 'Listen'}</span>
          </button>
          <div className="ab-switch" role="group" aria-label="Comparison snapshot">
            <button
              className={active === 'A' ? 'active' : ''}
              aria-pressed={active === 'A'}
              onClick={() => selectAB('A')}
            >
              A
            </button>
            <button
              className={active === 'B' ? 'active' : ''}
              aria-pressed={active === 'B'}
              onClick={() => selectAB('B')}
            >
              B
            </button>
          </div>
          <button
            className="icon-button copy-ab"
            title="Replay comparison"
            aria-label="Replay comparison"
            disabled={!!comparison.error}
            onClick={() => void audition()}
          >
            <RotateCcw size={15} />
          </button>
        </div>
        <div className="monitor-transport">
          <label className="mix-level">
            Mix
            <input
              aria-label="Project mix gain"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={project.mixGain}
              onChange={(e) =>
                change((p) => ({ ...p, mixGain: Number(e.target.value) }), 'mix-gain')
              }
            />
          </label>
          <label className="monitor-level">
            <Volume2 size={17} />
            <input
              aria-label="Monitor volume"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={preferences.monitor}
              onChange={(e) => setPreferences((p) => ({ ...p, monitor: Number(e.target.value) }))}
            />
          </label>
          <div className="output-meter" title="Peak before monitor volume">
            <div className="meter-bars">
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className={peak > (i + 1) / 14 ? (i > 10 ? 'hot' : 'lit') : ''} />
              ))}
            </div>
            <span className={peak > 1 ? 'clip-label' : ''}>
              {peak > 1
                ? 'CLIPPING'
                : peak > 0.0001
                  ? `${(20 * Math.log10(peak)).toFixed(1)} dBFS`
                  : 'OUTPUT · −∞'}
            </span>
          </div>
        </div>
      </div>
      {playback === 'score' && view !== 'compose' && (
        <div className="playback-note">
          {stale ? 'Playing previous version.' : 'Instrument changes are saved for the next Play.'}
          <button onClick={() => setView('compose')}>
            View score
            <ArrowRight size={12} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="preset-dialog"
        onCancel={() => setNewPreset(false)}
        onClose={() => setNewPreset(false)}
      >
        <form onSubmit={createPreset}>
          <div className="panel-header">
            <h2>Save your sound</h2>
            <button
              className="icon-button"
              type="button"
              aria-label="Close save preset"
              onClick={() => setNewPreset(false)}
            >
              <X size={18} />
            </button>
          </div>
          <p>Give this instrument a name and a unique key to use in your score.</p>
          <label>
            Display name
            <input
              autoFocus
              required
              maxLength={100}
              value={presetLabel}
              onChange={(e) => setPresetLabel(e.target.value)}
              placeholder="Midnight reed"
            />
          </label>
          <label>
            Score key
            <input
              required
              maxLength={100}
              value={presetKey}
              onChange={(e) => setPresetKey(e.target.value)}
              placeholder="midnightReed"
            />
          </label>
          <p className="footnote">
            Score keys are case-sensitive and permanent. Letters, numbers, and underscores; start
            with a letter.
          </p>
          {modalError && (
            <p className="form-error" role="alert">
              {modalError}
            </p>
          )}
          <button className="primary-button full-width" type="submit">
            <Save size={15} />
            Save as new instrument
          </button>
        </form>
      </dialog>
      {trackMakerOpen && (
        <TrackMaker
          initialKey={nextTrackKey(
            project.scoreText,
            instruments.map((i) => i.key),
          )}
          instruments={instruments}
          instrumentKey={preset.key}
          onClose={() => setTrackMakerOpen(false)}
          onCreate={(key, instrument, events) => {
            const text = appendTrack(
              project.scoreText,
              instruments.map((i) => i.key),
              key,
              instrument,
              events,
            );
            change((p) => ({ ...p, scoreText: text }));
            setSelectedTrack(key);
            setTrackMakerOpen(false);
            setToast(
              `Added ${key}. Its notes and instrument assignment are in the score; Undo removes the whole track.`,
            );
          }}
        />
      )}
    </div>
  );
}
