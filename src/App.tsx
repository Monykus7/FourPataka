import { measurePositionAt, meterLabel, nextMeterBoundary } from './core/meter';
import Timeline from './components/Timeline';
import { keepMatchingWavePoints } from './core/waveform';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Cable,
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
  setHarmonicPolarity,
  NEUTRAL_MACROS,
  pitch,
  SCORE_KEY,
  transform,
  type Macros,
  type Sound,
  type WavePreset,
} from './core/music';
import { parseScore, type CompiledScore, type ScoreEvent } from './core/parser';
import {
  applyPreset,
  createProject,
  withExampleScore,
  withPercussionPresets,
  importProject,
  PREFERENCES_KEY,
  reconcileTracks,
  updateProcessingAssignments,
  type Project,
} from './core/project';
import {
  loadProject,
  readRecoveryCopies,
  saveLocalProject,
  type RecoveryCopy,
} from './core/localSave';
import { commit, redo, undo, type History } from './core/history';
import SourceGraphs from './components/SourceGraphs';
import FourierWorkspace from './components/FourierWorkspace';
import Pedalboard from './components/Pedalboard';
import ChainBypass from './components/ChainBypass';
import ChainAssignment from './components/ChainAssignment';
import ProcessedGraphs from './components/ProcessedGraphs';
import TrackMaker from './components/TrackMaker';
import CommandReference from './components/CommandReference';
import WavExport from './components/WavExport';
import HarmonicPolarity from './components/HarmonicPolarity';
import RecoveryDialog from './components/RecoveryDialog';
import { appendTrack, insertCommand, nextTrackKey, setScoreChain } from './core/scoreTools';
import { moveTrackOwnership, removeTrackOwnership } from './core/scoreWorkspace';
import { comparisonPhrase, type AuditionPhrase } from './core/comparison';
import { PERCUSSION_PRESETS } from './core/instrumentPresets';
import ComparisonPanel from './components/ComparisonPanel';
import InstrumentLibrary from './components/InstrumentLibrary';
import {
  createInstrumentFolder,
  moveInstrumentToFolder,
  removeInstrumentFolder,
  renameInstrumentFolder,
} from './core/instrumentFolders';
import { version } from '../package.json';
import { applyTheme, resolveTheme, THEMES } from './core/themes';
const ScoreWorkspace = lazy(() => import('./components/ScoreWorkspace'));

type View = 'instrument' | 'pedalboard' | 'compose' | 'learn';
function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}');
    return {
      autocomplete: saved.autocomplete !== false,
      composeSide:
        saved.composeSide === 'timeline' ? ('timeline' as const) : ('reference' as const),
      theme: resolveTheme(saved.theme).id,
      monitor:
        typeof saved.monitor === 'number' && Number.isFinite(saved.monitor)
          ? clamp(saved.monitor, 0, 1)
          : 0.35,
    };
  } catch {
    return {
      autocomplete: true,
      composeSide: 'reference' as 'reference' | 'timeline',
      monitor: 0.35,
      theme: 'original',
    };
  }
}
function MiniWave({ kind, sound }: { kind: string; sound?: Sound }) {
  const shapes: Record<string, string> = {
    sine: 'M2 18 C7 0 13 0 18 18 S29 36 34 18 S45 0 50 18',
    square: 'M2 28 L2 8 L14 8 L14 28 L26 28 L26 8 L38 8 L38 28 L50 28',
    saw: 'M2 28 L14 8 L14 28 L26 8 L26 28 L38 8 L38 28 L50 8',
    triangle: 'M2 18 L8 6 L20 30 L32 6 L44 30 L50 18',
  };
  const samples = sound
    ? Array.from({ length: 129 }, (_, i) =>
        sound.harmonics.reduce(
          (sum, magnitude, h) =>
            sum + magnitude * sound.polarity[h] * Math.sin((2 * Math.PI * (h + 1) * i) / 128),
          0,
        ),
      )
    : null;
  // Normalize only this decorative drawing's scale; coefficients and audio gain
  // stay untouched. Named/custom library sounds must show their actual shape.
  const scale = samples ? Math.max(1, ...samples.map(Math.abs)) : 1;
  const actualPath = samples
    ?.map((value, i) => `${i ? 'L' : 'M'}${2 + (i * 48) / 128},${18 - (value * 12) / scale}`)
    .join(' ');
  return (
    <svg viewBox="0 0 52 36" aria-hidden="true">
      <path
        d={actualPath ?? shapes[kind] ?? shapes.sine}
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
  useEffect(() => {
    document.title = `FourPataka v${version}`;
  }, []);
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
  const [recoveryNotice, setRecoveryNotice] = useState(initial.recoveryIssue);
  const [recovery, setRecovery] = useState<ReturnType<typeof readRecoveryCopies> | null>(null);
  const [saveStatus, setSaveStatus] = useState('Saved locally');
  const [selectedPartial, setSelectedPartial] = useState('H1');
  const [solo, setSolo] = useState(false);
  const [upperHarmonicsOpen, setUpperHarmonicsOpen] = useState(false);
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
  const [wavProject, setWavProject] = useState<Project | null>(null);
  const [trackMakerOpen, setTrackMakerOpen] = useState(false);
  const [presetLabel, setPresetLabel] = useState('');
  const [presetKey, setPresetKey] = useState('');
  const [modalError, setModalError] = useState('');
  const [commandInstrument, setCommandInstrument] = useState('');
  const [commandsOpen, setCommandsOpen] = useState(true);
  const [commandFocusRequest, setCommandFocusRequest] = useState(0);
  const [commandChain, setCommandChain] = useState('warmDrive');
  const [commandSection, setCommandSection] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const scorePanel = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const engine = useRef(new AudioEngine());
  useLayoutEffect(() => {
    const panel = scorePanel.current;
    if (view !== 'compose' || !panel) return;
    // Stacked panels occupy different grid rows. Mirror the score's border
    // box there while desktop CSS stretches the reference in the shared row.
    const measure = () =>
      panel.parentElement?.style.setProperty(
        '--score-panel-height',
        `${panel.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel, { box: 'border-box' });
    return () => observer.disconnect();
  }, [view]);
  const auditionRequested = useRef(false);
  const editGroup = useRef({ key: '', time: 0 });
  const active = project.comparison.active;
  const sound = project.comparison[active];
  const macroBaseline = useRef<Sound>(structuredClone(sound));
  const instruments = project.instruments;
  const chainKeys = project.processing.library.map((p) => p.key);
  const preset = instruments.find((i) => i.id === project.editorPresetId)!;
  const missingPercussion = PERCUSSION_PRESETS.some(
    (definition) => !instruments.some((i) => i.key === definition.key),
  );
  const percussion = PERCUSSION_PRESETS.find(
    (definition) =>
      definition.key === preset.key &&
      JSON.stringify(definition.createSound()) === JSON.stringify(preset.sound),
  );
  const isCustom = JSON.stringify(sound) !== JSON.stringify(preset.sound);
  const score = useMemo(
    () =>
      parseScore(
        project.scoreText,
        instruments.map((i) => i.key),
        project.processing.library.map((p) => p.key),
      ),
    [project.scoreText, instruments, project.processing.library],
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
  const pedalPath =
    pedalDestination.startsWith('track:') &&
    !project.tracks.some((t) => t.key === pedalDestination.slice(6))
      ? 'audition'
      : pedalDestination;

  const change = useCallback((mutate: (p: Project) => Project, groupKey = '') => {
    const time = Date.now();
    // A gesture UUID identifies one complete stroke/rotation, including pauses.
    // Ordinary slider/typing groups expire; the next gesture gets a new UUID
    // so quick consecutive drags still have independent undo entries.
    const grouped =
      !!groupKey &&
      editGroup.current.key === groupKey &&
      (groupKey.startsWith('waveform:') ||
        groupKey.startsWith('rotary:') ||
        time - editGroup.current.time < 900);
    editGroup.current = { key: groupKey, time };
    setHistory((h) => {
      const updated = mutate(h.present);
      if (updated === h.present) return h;
      const parsed = parseScore(
        updated.scoreText,
        updated.instruments.map((i) => i.key),
        updated.processing.library.map((p) => p.key),
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
  const changePolarity = (index: number, polarity: 1 | -1) => {
    setSelectedPartial(`H${index + 1}`);
    // Discrete sign changes are separate undo steps; magnitude drags stay grouped.
    changeSound((current) => setHarmonicPolarity(current, index, polarity));
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
        saveLocalProject(project);
        setSaveStatus('Saved locally');
      } catch {
        setSaveStatus('Save unavailable');
        setToast('Local saving failed. Export JSON to keep your session.');
      }
    }, 400);
    const flush = () => {
      try {
        saveLocalProject(projectRef.current);
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
  useLayoutEffect(() => applyTheme(preferences.theme), [preferences.theme]);
  useLayoutEffect(() => {
    if (!commandFocusRequest) return;
    // A hidden native window may suspend animation frames. Focus after React's
    // DOM commit so the menu action also works when Compose is first mounted.
    document.querySelector('.commands-panel')?.scrollIntoView({ block: 'center' });
    document.querySelector<HTMLInputElement>('[aria-label="Search commands"]')?.focus();
  }, [commandFocusRequest]);
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
    if (newPreset) {
      dialog.current?.showModal();
      dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    } else dialog.current?.close();
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
    if (engine.current.mode !== 'audition' || previous.material !== material) {
      void actionRef.current.audition();
    } else {
      if (previous.active !== active)
        engine.current.switchAudition(
          sound,
          project.processing.audition[active],
          solo ? selectedPartial : undefined,
        );
      else {
        engine.current.updateAudition(sound, solo ? selectedPartial : undefined);
        engine.current.updateProcessing(project.processing, active);
      }
    }
  }, [active, material, preset.id, sound, solo, selectedPartial, project.processing]);
  useEffect(() => {
    if (engine.current.mode === 'score') {
      engine.current.updateProcessing(project.processing, active);
      if (engine.current.comparisonTrack)
        engine.current.updateScoreComparison(sound, selectedTrack);
    }
  }, [project.processing, active, sound, selectedTrack]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
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
  const addPercussion = () => {
    try {
      const next = withPercussionPresets(project);
      change(() => next);
      setToast(
        `Added ${next.instruments.length - instruments.length} percussion presets. Existing sounds kept.`,
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to add percussion presets.');
    }
  };
  const selectAB = (side: 'A' | 'B') => {
    if (engine.current.mode === 'score')
      engine.current.updateScoreComparison(project.comparison[side], selectedTrack);
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
  const downloadJson = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    downloadJson(
      JSON.stringify(project, null, 2),
      `${project.name.replace(/[^a-z0-9_-]/gi, '-') || 'FourPataka'}.fourpataka.json`,
    );
    setToast('Project exported, including presets, track copies, and A/B sounds.');
  };
  const acceptProject = (
    text: string,
    message = 'Project imported. Undo restores your previous session.',
  ) => {
    const imported = importProject(text);
    stop();
    resetMacros(imported.comparison[imported.comparison.active]);
    change(() => imported);
    setSelectedTrack(imported.tracks[0]?.key ?? '');
    setSelectedEvent(null);
    setToast(message);
  };
  const openRecovery = () => {
    // Capture slot bytes once. Ongoing autosaves must not silently change the
    // selection the user is inspecting or exporting.
    setRecovery(readRecoveryCopies());
  };
  const exportRecovery = async (copy: RecoveryCopy): Promise<string | null> => {
    const name = `FourPataka-${copy.key}-recovery`;
    if (window.fourpatakaDesktop?.saveRecovery) {
      const result = await window.fourpatakaDesktop.saveRecovery(copy.text, name);
      return result.canceled ? null : `Saved ${result.name}.`;
    }
    downloadJson(copy.text, `${name}.json`);
    return 'Recovery copy exported with its original contents.';
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
  const inspectedEvent = timelineScore.events.find((e) => e.id === selectedEvent?.id) ?? null;
  const beat = playback === 'score' ? (elapsed * (running?.score.tempo ?? score.tempo)) / 60 : 0;
  const activeEvents =
    playback === 'score'
      ? timelineScore.events.filter((e) => beat >= e.beat && beat < e.beat + e.duration)
      : [];
  const stale = playback === 'score' && running?.text !== project.scoreText;
  const highlightedLines = stale
    ? []
    : [
        ...new Set(
          activeEvents.flatMap((e) => [e.line, ...(e.sectionCalls ?? []).map((call) => call.line)]),
        ),
      ];
  const menuActions = useRef<(action: string) => void>(() => {});
  menuActions.current = (action) => {
    if (action === 'open') void openNativeProject();
    else if (action === 'save') void exportJson();
    else if (action === 'wav') setWavProject((existing) => existing ?? structuredClone(project));
    else if (action === 'recovery') openRecovery();
    else if (action === 'undo' || action === 'redo') travel(action);
    else if (
      action === 'instrument' ||
      action === 'pedalboard' ||
      action === 'compose' ||
      action === 'learn'
    )
      setView(action);
    else if (action === 'play') void playScore();
    else if (action === 'stop') stop();
    else if (action === 'commands') {
      setView('compose');
      setCommandsOpen(true);
      setCommandFocusRequest((request) => request + 1);
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

  const referenceTarget =
    score.tracks.find((t) => t.key === selectedTrack)?.key ?? score.tracks[0]?.key ?? '';
  const referenceSections = score.sections
    .filter((section) => section.track === referenceTarget)
    .map((section) => section.name);
  const referenceSection = referenceSections.includes(commandSection)
    ? commandSection
    : referenceSections[0];
  const referencePanel = (
    <CommandReference
      open={commandsOpen}
      onOpen={setCommandsOpen}
      context={{
        sectionNames: referenceSections,
        sectionKey: referenceSection,
        instrumentKey: instruments.some((i) => i.key === commandInstrument)
          ? commandInstrument
          : preset.key,
        chainKey: chainKeys.includes(commandChain) ? commandChain : (chainKeys[0] ?? ''),
        meterChangeBeat: nextMeterBoundary(score.beats, score.meter, score.meterChanges),
        newTrackKey: nextTrackKey(
          project.scoreText,
          instruments.map((i) => i.key),
        ),
        targetKey:
          score.tracks.find((t) => t.key === selectedTrack)?.key ?? score.tracks[0]?.key ?? '',
        playing: playback === 'score',
        invalid: score.diagnostics.some((d) => d.message !== 'Add a track to start composing.'),
      }}
      tracks={score.tracks.map((t) => t.key)}
      instruments={instruments}
      chains={project.processing.library}
      onTrack={setSelectedTrack}
      onInstrument={setCommandInstrument}
      onChain={setCommandChain}
      onSection={setCommandSection}
      onInsert={(command) => {
        try {
          const targetKey =
            score.tracks.find((t) => t.key === selectedTrack)?.key ?? score.tracks[0]?.key ?? '';
          const text = insertCommand(
            project.scoreText,
            instruments.map((i) => i.key),
            command.name,
            targetKey,
            instruments.some((i) => i.key === commandInstrument) ? commandInstrument : preset.key,
            chainKeys,
            chainKeys.includes(commandChain) ? commandChain : chainKeys[0],
            referenceSection,
          );
          change((p) => ({ ...p, scoreText: text }));
          setToast(
            command.scope === 'track'
              ? `Inserted ${command.name} into ${targetKey}.`
              : `Inserted ${command.name}.`,
          );
        } catch (error) {
          setToast((error as Error).message);
        }
      }}
    />
  );
  const timelinePanel = (
    <Timeline
      score={timelineScore}
      beat={beat}
      playing={playback === 'score'}
      activeEvents={activeEvents}
      selectedEvent={selectedEvent}
      onSelect={setSelectedEvent}
    />
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
          <button
            className="subtle-button"
            onClick={() => setWavProject((existing) => existing ?? structuredClone(project))}
          >
            <FileMusic size={15} />
            <span>Export WAV</span>
          </button>
          <button
            className="subtle-button"
            onClick={openRecovery}
            aria-label="Open local save recovery"
          >
            <RotateCcw size={15} />
            <span>Recovery</span>
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

      {recoveryNotice && (
        <aside className="recovery-notice" aria-label="Local save recovery notice">
          <span>{initial.warning}</span>
          <button className="text-button" onClick={openRecovery}>
            Review recovery copies
          </button>
          <button
            className="icon-button"
            aria-label="Dismiss recovery notice"
            onClick={() => setRecoveryNotice(false)}
          >
            <X size={14} />
          </button>
        </aside>
      )}

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
                id: 'pedalboard' as const,
                name: 'Pedalboard',
                icon: Cable,
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
          <label className="theme-picker">
            Theme
            <select
              aria-label="Theme preset"
              value={preferences.theme}
              onChange={(e) => setPreferences((p) => ({ ...p, theme: e.target.value }))}
            >
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
            <span className="theme-swatches" aria-label="Theme colors">
              {(
                resolveTheme(preferences.theme).swatches ?? [
                  resolveTheme(preferences.theme).background,
                  resolveTheme(preferences.theme).muted,
                  resolveTheme(preferences.theme).accent,
                  resolveTheme(preferences.theme).secondary,
                  resolveTheme(preferences.theme).tertiary,
                ]
              ).map((color, index) => (
                <span key={index} title={color} style={{ background: color }} />
              ))}
            </span>
          </label>
          <InstrumentLibrary
            instruments={instruments}
            folders={project.instrumentFolders ?? []}
            selectedId={preset.id}
            thumbnail={(item) => <MiniWave kind={item.key} sound={item.sound} />}
            onSelect={(id) => {
              selectPreset(id);
              setView('instrument');
            }}
            onSaveNew={() => {
              setPresetLabel('');
              setPresetKey('');
              setModalError('');
              setNewPreset(true);
            }}
            onCreateFolder={(label) => {
              const next = createInstrumentFolder(project, label, crypto.randomUUID());
              change(() => next);
            }}
            onRenameFolder={(id, label) => {
              const next = renameInstrumentFolder(project, id, label);
              change(() => next);
            }}
            onRemoveFolder={(id) => {
              const next = removeInstrumentFolder(project, id);
              change(() => next);
              setToast('Folder removed. Its instruments are now unfiled.');
            }}
            onMove={(id, folderId) => {
              const next = moveInstrumentToFolder(project, id, folderId);
              change(() => next);
            }}
          />
          <div className="sidebar-bottom">
            <span className="version-label">FourPataka · v{version}</span>
          </div>
        </aside>

        <main className="main-content">
          <div className="page-heading">
            <h1>
              {view === 'instrument'
                ? 'Instrument'
                : view === 'pedalboard'
                  ? 'Pedalboard'
                  : view === 'compose'
                    ? 'Compose'
                    : 'Learn'}
            </h1>
            <span className="page-metadata">
              {view === 'instrument'
                ? `${referenceNote} · ${fundamental.toFixed(2)} Hz${material.kind === 'phrase' ? ' · phrase reference' : ''} · ${sampleRate / 1000} kHz`
                : view === 'pedalboard'
                  ? `${pedalPath === 'audition' ? `Audition ${active}` : pedalPath === 'master' ? 'Master' : `Track ${pedalPath.slice(6)}`} · signal chain`
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
                      <MiniWave kind={preset.key} sound={sound} />
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
                    {missingPercussion && (
                      <button className="secondary-button" onClick={addPercussion}>
                        <Plus size={14} />
                        Add percussion presets
                      </button>
                    )}
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
                <label className="mobile-preset-picker">
                  Preset
                  <select
                    aria-label="Instrument preset"
                    value={preset.id}
                    onChange={(e) => selectPreset(e.target.value)}
                  >
                    {instruments.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label} · {i.key}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="instrument-folder-picker">
                  Library folder
                  <select
                    aria-label="Instrument folder"
                    value={preset.folderId ?? ''}
                    onChange={(e) => {
                      const next = moveInstrumentToFolder(
                        project,
                        preset.id,
                        e.target.value || null,
                      );
                      change(() => next);
                    }}
                  >
                    <option value="">Unfiled</option>
                    {(project.instrumentFolders ?? []).map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.label}
                      </option>
                    ))}
                  </select>
                </label>
                {percussion && (
                  <div className="percussion-hint">
                    <span>{percussion.hint}. Fourier approximation; long notes sustain.</span>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        change((p) => ({
                          ...p,
                          comparisonMaterial: {
                            ...p.comparisonMaterial,
                            kind: 'note',
                            note: percussion.note,
                            noteBeats: percussion.noteBeats,
                          },
                        }))
                      }
                    >
                      Use hit preview
                    </button>
                  </div>
                )}
                <FourierWorkspace
                  sound={sound}
                  onChange={(next, group) => changeSound(() => next, group)}
                >
                  <div className="harmonics-heading">
                    <div>
                      <h3>
                        Harmonic mixer <span>32 partials</span>
                      </h3>
                      <p>Each bar adds a sine wave at a multiple of your note.</p>
                    </div>
                    <span className="small-label">MAGNITUDE 0—1</span>
                  </div>
                  <button
                    className="secondary-button"
                    aria-expanded={upperHarmonicsOpen}
                    onClick={() => setUpperHarmonicsOpen(!upperHarmonicsOpen)}
                  >
                    {upperHarmonicsOpen ? 'Hide' : 'Show'} H17–H32 ·{' '}
                    {sound.harmonics.slice(16).filter((value) => value > 0).length} active
                  </button>
                  {[0, ...(upperHarmonicsOpen ? [16] : [])].map((bankStart) => (
                    <div
                      className="harmonic-mixer"
                      key={bankStart}
                      aria-label={`H${bankStart + 1}–H${bankStart + 16} controls`}
                    >
                      <div className="mixer-axis">
                        <span>1.0</span>
                        <span>0.5</span>
                        <span>0.0</span>
                      </div>
                      <div className="harmonic-bars">
                        {sound.harmonics
                          .slice(bankStart, bankStart + 16)
                          .map((magnitude, bankIndex) => {
                            const i = bankStart + bankIndex;
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
                                  <div
                                    className="bar-fill"
                                    style={{ height: `${magnitude * 100}%` }}
                                  />
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
                                <HarmonicPolarity
                                  harmonic={component.label}
                                  value={sound.polarity[i]}
                                  compact
                                  onChange={(polarity) => changePolarity(i, polarity)}
                                />
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
                  ))}
                  <div className="mixer-bottom">
                    <span>
                      <span className="orange-dot" />
                      H1 = f₀ · H2–H32 = 2f₀–32f₀
                      <span className="sign-guide"> · + / − changes sign</span>
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

              <ComparisonPanel
                material={material}
                score={score}
                phrase={comparison.phrase}
                error={comparison.error}
                active={active}
                elapsed={playback === 'audition' ? elapsed : 0}
                playingScore={playback === 'score'}
                scoreTrack={selectedTrack}
                onScoreTrack={setSelectedTrack}
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
                      <div>
                        <dt>Signed coefficient</dt>
                        <dd>
                          <output aria-label={`${partial.label} signed coefficient`}>
                            {partial.polarity < 0 ? '−' : '+'}
                            {partial.magnitude.toFixed(3)}
                          </output>
                        </dd>
                      </div>
                    </dl>
                    {partial.kind === 'harmonic' && (
                      <>
                        <HarmonicPolarity
                          harmonic={partial.label}
                          value={partial.polarity}
                          onChange={(polarity) => changePolarity(partial.index, polarity)}
                        />
                        <p className="footnote">
                          Sign flips this sine wave; magnitude controls its strength. A
                          zero-magnitude harmonic stays silent.
                        </p>
                      </>
                    )}
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

          {view === 'pedalboard' && (
            <>
              <Pedalboard
                processing={project.processing}
                trackKeys={project.tracks.map((t) => t.key)}
                active={active}
                destination={pedalPath}
                onDestination={setPedalDestination}
                onChange={(processing, group) => {
                  try {
                    const next = updateProcessingAssignments(projectRef.current, processing);
                    change(() => next, group);
                  } catch (e) {
                    setToast((e as Error).message);
                  }
                }}
                pending={engine.current.processingPending(project.processing, active, pedalPath)}
                activeTails={engine.current.activeTails(pedalPath)}
                playing={pedalPath === 'audition' ? playback === 'audition' : playback === 'score'}
                onCopy={copyAB}
                onReplay={() => (pedalPath === 'audition' ? void audition() : void playScore())}
              />
              <ProcessedGraphs
                analyser={engine.current.outputAnalyser(pedalPath)}
                sampleRate={sampleRate}
                label={
                  pedalPath === 'audition'
                    ? `audition ${active}, before mix gain`
                    : pedalPath === 'master'
                      ? 'master, before mix gain'
                      : `${pedalPath}, before track level`
                }
              />
            </>
          )}

          {view === 'compose' && (
            <>
              <div className="compose-layout">
                <section className="panel editor-panel" ref={scorePanel}>
                  <div className="panel-header">
                    <div>
                      <h2>
                        Score <span className="tag">.fourier</span>
                      </h2>
                    </div>
                    <label className="score-panel-choice">
                      Show beside score
                      <select
                        aria-label="Panel beside score"
                        value={preferences.composeSide}
                        onChange={(event) =>
                          setPreferences((p) => ({
                            ...p,
                            composeSide: event.target.value as 'reference' | 'timeline',
                          }))
                        }
                      >
                        <option value="reference">Command reference</option>
                        <option value="timeline">Timeline</option>
                      </select>
                      <ArrowRight className="score-panel-arrow" size={18} aria-hidden="true" />
                    </label>
                    <div className="editor-options">
                      <button
                        className="secondary-button"
                        disabled={playback === 'score'}
                        title="Replace score text with the rhythm demo; Undo restores your score."
                        onClick={() => change(withExampleScore)}
                      >
                        Load demo score
                      </button>
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
                    <ScoreWorkspace
                      value={project.scoreText}
                      score={score}
                      onChange={({ base, text, rename, operation, remove }) => {
                        if (projectRef.current.scoreText !== base) {
                          setToast('The score changed. The current version has been retained.');
                          return false;
                        }
                        change(
                          (p) =>
                            p.scoreText !== base
                              ? p
                              : {
                                  ...(rename
                                    ? moveTrackOwnership(p, rename.from, rename.to)
                                    : remove
                                      ? removeTrackOwnership(p, remove)
                                      : p),
                                  scoreText: text,
                                },
                          rename || operation ? '' : 'score-text',
                        );
                        if (rename) {
                          setSelectedTrack((key) => (key === rename.from ? rename.to : key));
                          setPedalDestination((key) =>
                            key === `track:${rename.from}` ? `track:${rename.to}` : key,
                          );
                        }
                        if (remove) {
                          setSelectedTrack((key) => (key === remove ? '' : key));
                          setPedalDestination((key) =>
                            key === `track:${remove}` ? 'audition' : key,
                          );
                        }
                        return true;
                      }}
                      autocomplete={preferences.autocomplete}
                      presetKeys={instruments.map((i) => i.key)}
                      chainKeys={chainKeys}
                      lines={highlightedLines}
                      playing={playback === 'score'}
                      onTrack={setSelectedTrack}
                      onView={() => {
                        editGroup.current = { key: '', time: 0 };
                      }}
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
                        : `${score.tracks.length} tracks · ${score.beats} quarter beats · ${score.seconds.toFixed(2)} s`}
                    </span>
                  </div>
                  {score.diagnostics.length > 0 && (
                    <div className="diagnostics-list">
                      {score.diagnostics.map((d, i) => (
                        <div key={i}>
                          <span>LINE {d.line}</span>
                          {d.message}
                          {!!d.sectionCalls?.length && (
                            <small>
                              {' '}
                              · called via{' '}
                              {d.sectionCalls
                                .map((call) => `${call.name} at line ${call.line}`)
                                .join(' → ')}
                            </small>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                {preferences.composeSide === 'timeline' ? timelinePanel : referencePanel}
              </div>
              <div className="composition-overview">
                {preferences.composeSide === 'timeline' ? referencePanel : timelinePanel}
                <section className="panel track-instances" aria-label="Independent track sounds">
                  <div className="section-title">
                    <h3>Independent track sounds</h3>
                    <Layers3 size={15} />
                  </div>
                  <div
                    className="track-instances-scroll"
                    role="region"
                    aria-label="Track sound controls"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      // Keep Space available for native scrolling, without global Play.
                      if (event.key === ' ' && event.target === event.currentTarget)
                        event.stopPropagation();
                    }}
                  >
                    <ChainAssignment
                      name="master"
                      value={score.master?.key ?? null}
                      presets={project.processing.library}
                      disabled={playback === 'score' || !!score.diagnostics.length}
                      onChange={(key) =>
                        change((p) => ({
                          ...p,
                          scoreText: setScoreChain(
                            p.scoreText,
                            p.instruments.map((i) => i.key),
                            p.processing.library.map((p) => p.key),
                            null,
                            key,
                          ),
                        }))
                      }
                    />
                    <ChainBypass
                      name="master"
                      chain={project.processing.master}
                      onChange={(chain) =>
                        change((p) => ({ ...p, processing: { ...p.processing, master: chain } }))
                      }
                      onEdit={() => {
                        setPedalDestination('master');
                        setView('pedalboard');
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
                          <label className="track-instrument-choice">
                            Instrument
                            <select
                              aria-label={`Instrument for ${t.key}`}
                              value={library.id}
                              disabled={playback === 'score' || !!score.diagnostics.length}
                              onChange={(e) => {
                                const chosen = instruments.find((i) => i.id === e.target.value)!;
                                change((p) => applyPreset(p, chosen.id, chosen.sound, [t.key]));
                              }}
                            >
                              {instruments.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <ChainAssignment
                            name={t.key}
                            value={
                              score.tracks.find((parsed) => parsed.key === t.key)?.chainKey ?? null
                            }
                            presets={project.processing.library}
                            disabled={playback === 'score' || !!score.diagnostics.length}
                            onChange={(key) =>
                              change((p) => ({
                                ...p,
                                scoreText: setScoreChain(
                                  p.scoreText,
                                  p.instruments.map((i) => i.key),
                                  p.processing.library.map((p) => p.key),
                                  t.key,
                                  key,
                                ),
                              }))
                            }
                          />
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
                              setView('pedalboard');
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
                      Changing an assignment loads a fresh preset copy. Library edits leave existing
                      track copies intact.
                    </p>
                  </div>
                </section>
                {inspectedEvent && (
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
                    <strong>{inspectedEvent.notes.join(' · ') || 'Rest'}</strong>
                    <p>
                      {inspectedEvent.track} · line {inspectedEvent.line}
                    </p>
                    {inspectedEvent.sectionCalls?.map((call) => (
                      <p key={call.id} className="event-section-context">
                        {call.name}
                        {inspectedEvent.sectionEndingOf?.includes(call.id) ? ' ending' : ''} · call
                        line {call.line} ·{' '}
                        {call.duration.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
                        quarter beats
                        {call.trimmedBeats ? ` · cut ${call.trimmedBeats}` : ''}
                        {call.endingDuration ? ` · ending ${call.endingDuration}` : ''}
                        {call.clippedByParent ? ' · clipped by enclosing section' : ''}
                      </p>
                    ))}
                    <dl>
                      <div>
                        <dt>Start</dt>
                        <dd>
                          Bar{' '}
                          {
                            measurePositionAt(
                              inspectedEvent.beat,
                              timelineScore.meter,
                              timelineScore.meterChanges,
                            ).bar
                          }{' '}
                          · beat{' '}
                          {
                            measurePositionAt(
                              inspectedEvent.beat,
                              timelineScore.meter,
                              timelineScore.meterChanges,
                            ).beat
                          }
                        </dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{inspectedEvent.duration} quarter beats</dd>
                      </div>
                      <div>
                        <dt>Frequencies</dt>
                        <dd>
                          {inspectedEvent.frequencies.map((f) => `${f.toFixed(2)} Hz`).join(', ') ||
                            'No new voice'}
                        </dd>
                      </div>
                    </dl>
                  </section>
                )}
              </div>
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
                      'Keep only odd harmonics, with magnitudes 1/h. Listen to how thirty-two terms approximate the sharp edges.',
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
                  FourPataka starts with finite Fourier approximations. Thirty-two partials suggest
                  a shape; they don’t reproduce an ideal discontinuity or an acoustic instrument
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
              {timelineScore.tempo} <small>BPM</small>
              <span className="footer-separator">/</span>
              {meterLabel(
                measurePositionAt(
                  (elapsed * timelineScore.tempo) / 60,
                  timelineScore.meter,
                  timelineScore.meterChanges,
                ).meter,
              )}
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
          {stale
            ? 'Playing previous version.'
            : engine.current.comparisonTrack
              ? `Live A/B on ${engine.current.comparisonTrack}.`
              : 'Switch A/B to compare on the selected track.'}
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
      {recovery && (
        <RecoveryDialog
          copies={recovery.copies}
          storageError={recovery.error}
          onClose={() => setRecovery(null)}
          onExport={exportRecovery}
          onRestore={(copy) => {
            // Revalidate captured bytes and reuse the import's stopped, one-step
            // history transition. Preferences and monitor settings stay separate.
            acceptProject(
              copy.text,
              `Restored ${copy.label.toLowerCase()}. Undo restores your previous session.`,
            );
            setRecoveryNotice(false);
          }}
        />
      )}
      {wavProject && <WavExport project={wavProject} onClose={() => setWavProject(null)} />}
      <dialog
        ref={dialog}
        className="preset-dialog"
        aria-labelledby="save-preset-title"
        onCancel={() => setNewPreset(false)}
        onClose={() => setNewPreset(false)}
      >
        <form onSubmit={createPreset}>
          <div className="panel-header">
            <h2 id="save-preset-title">Save your sound</h2>
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
          meter={score.meter}
          meterChanges={score.meterChanges}
          initialKey={nextTrackKey(
            project.scoreText,
            instruments.map((i) => i.key),
          )}
          instruments={instruments}
          chains={project.processing.library}
          instrumentKey={preset.key}
          onClose={() => setTrackMakerOpen(false)}
          onCreate={(key, instrument, events, chainKey) => {
            const text = appendTrack(
              project.scoreText,
              instruments.map((i) => i.key),
              key,
              instrument,
              events,
              chainKeys,
              chainKey,
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
