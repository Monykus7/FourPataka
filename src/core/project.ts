import {
  defaultProcessing,
  importProcessing,
  emptyChain,
  type Processing,
  type ChainInstance,
} from './pedals';
import { validateWavePoints } from './waveform';
import {
  HARMONIC_COUNT,
  LEGACY_HARMONIC_COUNT,
  mathematicalPreset,
  pitch,
  SCORE_KEY,
  type Sound,
} from './music';
import { parseScore, type CompiledScore } from './parser';
import { DEFAULT_MATERIAL, type ComparisonMaterial } from './comparison';
import { setScoreChain } from './scoreTools';
import { softBassPreset, upgradeSoftBassTemplate } from './instrumentPresets';

export interface InstrumentPreset {
  id: string;
  key: string;
  label: string;
  version: number;
  sound: Sound;
}
export interface TrackInstance {
  key: string;
  presetId: string;
  appliedVersion: number;
  sound: Sound;
  level: number;
}
export interface Project {
  processing: Processing;
  schemaVersion: 2;
  id: string;
  name: string;
  scoreText: string;
  instruments: InstrumentPreset[];
  tracks: TrackInstance[];
  editorPresetId: string;
  comparison: { active: 'A' | 'B'; A: Sound; B: Sound };
  comparisonMaterial: ComparisonMaterial;
  mixGain: number;
}
export const STORAGE_KEY = 'fourpataka.project.v1';
export const RECOVERY_KEY = 'fourpataka.project.recovery.v1';
export const UNREADABLE_KEY = 'fourpataka.project.unreadable.v1';
export const PREFERENCES_KEY = 'fourpataka.preferences.v1';
export const EXAMPLE_SCORE = `// Rhythm demo: quarter-note tempo stays constant through meter changes.
tempo 116
time 4/4
time 7/8 at 4*2
time 1/2 at 4*2 + 7*2

track melody using sine through clean{
  //Bar 1
  staccato[ Cmaj@5 quarter ]
  chord:Bdim7@5 quarter
  rest 8th
  staccato[chord:(G6 D6)  quarter.]

  // Bar 2
  staccato[
    G5 quarter.
    G5 8th
    F#5 8th
    Gmaj7@5 8th
  ]
  legato[
    D5 quarter..
    rest 16th

  // Bar 3
    tuplet:4:3[
      repeat  {
        F5 16th
        A5 16th
        C5 16th
        E5 16th
      }
    ]
  ]
  Fmaj7@4 quarter
  staccato[ G5 8th ]
  rest 8th

  // Bar 4
  staccato[ chord:(G4 B4 D5) quarter ]
  legato[
    A5 8th
    G5 8th
    Eb5 8th
  ]
  E5 half
}

track bass using softBass {
  // Bars 1–2, 4/4.
  staccato[
    C3 quarter
    F3 quarter
  ]
  legato[
    A3 half
    G3 half
    staccato[F#3 8th]
    G3 quarter.
  ]

  // Bars 3–4, 7/8.
   C2 quarter
   F2 quarter
   E2 quarter.
   C2 quarter
   Eb2 quarter
   staccato[
     D2 8th 
     C2 8th 
     Bb2 8th 
   ]
   C2 half
}
`;
export function createProject(): Project {
  const bright = mathematicalPreset('square');
  bright.harmonics = bright.harmonics.map((m, i) => (i === 0 ? 1 : m * 0.78));
  const bass = softBassPreset();
  const instruments: InstrumentPreset[] = [
    ...(['sine', 'square', 'saw', 'triangle'] as const).map((key) => ({
      id: key,
      key,
      label: { sine: 'Pure sine', square: 'Square', saw: 'Sawtooth', triangle: 'Triangle' }[key],
      version: 1,
      sound: mathematicalPreset(key),
    })),
    { id: 'bright-reed', key: 'brightReed', label: 'Bright reed', version: 1, sound: bright },
    { id: 'soft-bass', key: 'softBass', label: 'Soft bass', version: 2, sound: bass },
  ];
  const project: Project = {
    processing: defaultProcessing(),
    schemaVersion: 2,
    id: crypto.randomUUID(),
    name: 'Untitled session',
    scoreText: EXAMPLE_SCORE,
    instruments,
    tracks: [],
    editorPresetId: 'bright-reed',
    comparison: { active: 'A', A: structuredClone(bright), B: mathematicalPreset('sine') },
    comparisonMaterial: structuredClone(DEFAULT_MATERIAL),
    mixGain: 0.8,
  };
  return reconcileTracks(
    project,
    parseScore(
      project.scoreText,
      instruments.map((i) => i.key),
      project.processing.library.map((p) => p.key),
    ),
  );
}

export function reconcileTracks(project: Project, score: CompiledScore): Project {
  if (score.diagnostics.length) return project;
  const tracks = score.tracks.map((track) => {
    const preset = project.instruments.find((i) => i.key === track.instrumentKey)!;
    const existing = project.tracks.find((t) => t.key === track.key);
    // Reparse preserves independently edited sounds when the preset association
    // is unchanged. A new library version requires an explicit Apply operation.
    return existing?.presetId === preset.id
      ? existing
      : {
          key: track.key,
          presetId: preset.id,
          appliedVersion: preset.version,
          sound: structuredClone(preset.sound),
          level: 0.75,
        };
  });
  const reconcileChain = (
    existing: ChainInstance | undefined,
    key: string | null,
  ): ChainInstance => {
    const preset = key ? project.processing.library.find((p) => p.key === key) : undefined;
    if (!existing)
      return preset
        ? { ...structuredClone(preset.chain), presetId: preset.id, assignmentKey: key }
        : emptyChain();
    // The marker records the source assignment, not the edited copy's current
    // association. Unchanged source must preserve knobs, bypass and placement.
    if (
      existing?.assignmentKey === key ||
      (existing?.assignmentKey === undefined && (!key || existing.presetId === preset?.id))
    )
      return key ? { ...existing, assignmentKey: key } : existing;
    if (!key) return { ...emptyChain(), assignmentKey: null };
    if (!preset) return existing ?? emptyChain();
    return { ...structuredClone(preset.chain), presetId: preset.id, assignmentKey: key };
  };
  return {
    ...project,
    tracks,
    processing: {
      ...project.processing,
      master: reconcileChain(project.processing.master, score.master?.key ?? null),
      tracks: Object.fromEntries(
        score.tracks.map((t) => [
          t.key,
          reconcileChain(project.processing.tracks[t.key], t.chainKey),
        ]),
      ),
    },
  };
}

export function applyPreset(
  project: Project,
  presetId: string,
  sound: Sound,
  targets: string[],
): Project {
  const preset = project.instruments.find((p) => p.id === presetId)!;
  const parsed = parseScore(
    project.scoreText,
    project.instruments.map((p) => p.key),
    project.processing.library.map((p) => p.key),
  );
  if (parsed.diagnostics.length) return project;
  let scoreText = project.scoreText;
  parsed.tracks
    .filter((t) => targets.includes(t.key))
    .sort((a, b) => b.instrumentFrom - a.instrumentFrom)
    .forEach((t) => {
      scoreText =
        scoreText.slice(0, t.instrumentFrom) + preset.key + scoreText.slice(t.instrumentTo);
    });
  return {
    ...project,
    scoreText,
    tracks: project.tracks.map((t) =>
      targets.includes(t.key)
        ? { ...t, presetId, appliedVersion: preset.version, sound: structuredClone(sound) }
        : t,
    ),
  };
}

export function updateProcessingAssignments(project: Project, processing: Processing): Project {
  let text = project.scoreText;
  const keys = project.instruments.map((p) => p.key),
    chainKeys = processing.library.map((p) => p.key);
  const sync = (
    existing: ChainInstance | undefined,
    next: ChainInstance,
    target: string | null,
  ) => {
    // A sandbox copy can carry another destination's reconciliation marker.
    // Reapplication must retain this destination's source history, otherwise
    // the next reparse would discard the exact copied knobs for a template.
    const { assignmentKey: _sourceMarker, ...copy } = next;
    if (!existing || existing.presetId === next.presetId)
      return existing?.assignmentKey === undefined
        ? copy
        : { ...copy, assignmentKey: existing.assignmentKey };
    const preset = processing.library.find((p) => p.id === next.presetId);
    const key = preset?.key ?? null;
    text = setScoreChain(text, keys, chainKeys, target, key);
    // Applying an edited sandbox copy must preserve those exact settings;
    // reconciliation should not substitute the untouched library template.
    return { ...next, assignmentKey: key };
  };
  const master = sync(project.processing.master, processing.master, null);
  const tracks = Object.fromEntries(
    Object.entries(processing.tracks).map(([key, chain]) => [
      key,
      sync(project.processing.tracks[key], chain, key),
    ]),
  );
  return { ...project, scoreText: text, processing: { ...processing, master, tracks } };
}

function record(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a project object.');
}
function numeric(
  value: unknown,
  low: number,
  high: number,
  label: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high)
    throw new Error(`Invalid ${label}: expected ${low}–${high}.`);
}
function stringValue(value: unknown, label: string, max = 100): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max)
    throw new Error(`Invalid ${label}.`);
}
export function validateSound(value: unknown, count = HARMONIC_COUNT): asserts value is Sound {
  record(value);
  if (value.waveformPoints !== undefined) validateWavePoints(value.waveformPoints, count);
  for (const [name, size] of [
    ['harmonics', count],
    ['undertones', 5],
    ['polarity', count],
  ] as const) {
    const array = value[name];
    if (!Array.isArray(array) || array.length !== size)
      throw new Error(`${name} must have ${size} values.`);
    array.forEach((n) =>
      name === 'polarity'
        ? n === 1 || n === -1
          ? undefined
          : (() => {
              throw new Error('Polarity must be +1 or −1.');
            })()
        : numeric(n, 0, 1, name),
    );
  }
  if (typeof value.undertonesEnabled !== 'boolean')
    throw new Error('Invalid undertone enable state.');
  numeric(value.attack, 0.005, 2, 'attack');
  numeric(value.release, 0.01, 3, 'release');
  numeric(value.trim, -36, 0, 'output trim');
}
export function importProject(text: string): Project {
  if (text.length > 2_000_000) throw new Error('Project file is too large (maximum 2 MB).');
  const data: unknown = JSON.parse(text);
  record(data);
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2)
    throw new Error(
      `Unsupported project version ${String(data.schemaVersion)}. This studio supports versions 1 and 2.`,
    );
  const sourceCount = data.schemaVersion === 1 ? LEGACY_HARMONIC_COUNT : HARMONIC_COUNT;
  // Pad owned copies independently. Migration never regenerates their timbres.
  const migrateSound = (sound: Sound): Sound => ({
    ...structuredClone(sound),
    harmonics: [...sound.harmonics, ...Array(HARMONIC_COUNT - sourceCount).fill(0)],
    polarity: [...sound.polarity, ...Array(HARMONIC_COUNT - sourceCount).fill(1)],
  });
  stringValue(data.id, 'project ID');
  stringValue(data.name, 'project name');
  if (typeof data.scoreText !== 'string' || data.scoreText.length > 200_000)
    throw new Error('Invalid score text (maximum 200,000 characters).');
  numeric(data.mixGain, 0, 1, 'mix gain');
  if (!Array.isArray(data.instruments) || !data.instruments.length || data.instruments.length > 128)
    throw new Error('Expected 1–128 instrument presets.');
  const ids = new Set<string>();
  const keys = new Set<string>();
  data.instruments.forEach((p) => {
    record(p);
    stringValue(p.id, 'preset ID');
    stringValue(p.key, 'score key');
    stringValue(p.label, 'preset label');
    if (!SCORE_KEY.test(p.key) || ids.has(p.id) || keys.has(p.key))
      throw new Error('Preset IDs and score keys must be valid and unique.');
    ids.add(p.id);
    keys.add(p.key);
    numeric(p.version, 1, 1_000_000, 'preset version');
    if (!Number.isInteger(p.version)) throw new Error('Preset version must be an integer.');
    validateSound(p.sound, sourceCount);
  });
  if (!Array.isArray(data.tracks) || data.tracks.length > 128)
    throw new Error('Invalid track instances.');
  const trackKeys = new Set<string>();
  data.tracks.forEach((t) => {
    record(t);
    stringValue(t.key, 'track key');
    if (!SCORE_KEY.test(t.key) || trackKeys.has(t.key) || !ids.has(t.presetId as string))
      throw new Error('Invalid or duplicate track reference.');
    trackKeys.add(t.key);
    numeric(t.appliedVersion, 1, 1_000_000, 'applied preset version');
    if (!Number.isInteger(t.appliedVersion)) throw new Error('Applied version must be an integer.');
    validateSound(t.sound, sourceCount);
    numeric(t.level, 0, 1, 'track level');
  });
  if (!ids.has(data.editorPresetId as string))
    throw new Error('Editor preset reference is missing.');
  record(data.comparison);
  if (data.comparison.active !== 'A' && data.comparison.active !== 'B')
    throw new Error('Invalid comparison selection.');
  validateSound(data.comparison.A, sourceCount);
  validateSound(data.comparison.B, sourceCount);
  const material = data.comparisonMaterial ?? structuredClone(DEFAULT_MATERIAL);
  record(material);
  if (!['note', 'chord', 'phrase'].includes(material.kind as string))
    throw new Error('Invalid comparison material.');
  stringValue(material.note, 'comparison note');
  // Validate the pitch even when the saved material currently uses a phrase.
  pitch(material.note);
  stringValue(material.trackKey, 'comparison track');
  if (!SCORE_KEY.test(material.trackKey)) throw new Error('Invalid comparison track key.');
  numeric(material.fromBeat, 0, 1_000_000, 'phrase start');
  if (material.toBeat !== null) {
    numeric(material.toBeat, 0, 1_000_000, 'phrase end');
    if (material.toBeat <= material.fromBeat) throw new Error('Phrase end must follow its start.');
  }
  // Rebuild a whitelisted object: imported runtime/UI/unknown fields are never trusted.
  const project = data as unknown as Project;
  const clean: Project = {
    processing: importProcessing(data.processing),
    schemaVersion: 2,
    id: project.id,
    name: project.name,
    scoreText: project.scoreText,
    mixGain: project.mixGain,
    editorPresetId: project.editorPresetId,
    comparisonMaterial: {
      kind: material.kind as ComparisonMaterial['kind'],
      note: material.note,
      trackKey: material.trackKey,
      fromBeat: material.fromBeat,
      toBeat: material.toBeat as number | null,
    },
    comparison: {
      active: project.comparison.active,
      A: migrateSound(project.comparison.A),
      B: migrateSound(project.comparison.B),
    },
    instruments: project.instruments.map((p) =>
      upgradeSoftBassTemplate({
        id: p.id,
        key: p.key,
        label: p.label,
        version: p.version,
        sound: migrateSound(p.sound),
      }),
    ),
    tracks: project.tracks.map((t) => ({
      key: t.key,
      presetId: t.presetId,
      appliedVersion: t.appliedVersion,
      sound: migrateSound(t.sound),
      level: t.level,
    })),
  };
  return reconcileTracks(
    clean,
    parseScore(
      clean.scoreText,
      clean.instruments.map((i) => i.key),
      clean.processing.library.map((p) => p.key),
    ),
  );
}

export function withExampleScore(project: Project): Project {
  // Restore only missing demo keys; owned sounds and user library edits stay independent.
  const defaults = createProject();
  const keys = new Set(
    defaults.tracks.map(
      (track) => defaults.instruments.find((preset) => preset.id === track.presetId)!.key,
    ),
  );
  const demo = parseScore(
    defaults.scoreText,
    defaults.instruments.map((p) => p.key),
    defaults.processing.library.map((p) => p.key),
  );
  const chainKeys = new Set(
    [demo.master?.key, ...demo.tracks.map((track) => track.chainKey)].filter(Boolean),
  );
  return {
    ...project,
    scoreText: EXAMPLE_SCORE,
    processing: {
      ...project.processing,
      library: [
        ...project.processing.library,
        ...defaults.processing.library
          .filter(
            (preset) =>
              chainKeys.has(preset.key) &&
              !project.processing.library.some((existing) => existing.key === preset.key),
          )
          .map((preset) => ({
            ...preset,
            id: project.processing.library.some((existing) => existing.id === preset.id)
              ? crypto.randomUUID()
              : preset.id,
          })),
      ],
    },
    instruments: [
      ...project.instruments,
      ...defaults.instruments
        .filter(
          (preset) =>
            keys.has(preset.key) &&
            !project.instruments.some((existing) => existing.key === preset.key),
        )
        .map((preset) => ({
          ...preset,
          id: project.instruments.some((existing) => existing.id === preset.id)
            ? crypto.randomUUID()
            : preset.id,
        })),
    ],
  };
}
