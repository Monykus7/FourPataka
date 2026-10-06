import { describe, expect, it } from 'vitest';
import {
  applyPreset,
  withExampleScore,
  createProject,
  importProject,
  reconcileTracks,
  updateProcessingAssignments,
} from '../../src/core/project';
import { parseScore } from '../../src/core/parser';
import { mathematicalPreset } from '../../src/core/music';
import { makePedal } from '../../src/core/pedals';

const reparse = (project: ReturnType<typeof createProject>) =>
  reconcileTracks(
    project,
    parseScore(
      project.scoreText,
      project.instruments.map((p) => p.key),
      project.processing.library.map((p) => p.key),
    ),
  );
describe('independent project state', () => {
  it('reapplying the same preset retains destination markers rather than a copied sandbox marker', () => {
    let p = createProject();
    p.scoreText = p.scoreText.replace('using brightReed', 'using brightReed through warmDrive');
    p = reparse(p);
    const processing = structuredClone(p.processing);
    processing.tracks.melody.assignmentKey = 'cleanGlue';
    processing.tracks.melody.pedals[0].params.drive = 18;
    const applied = reparse(updateProcessingAssignments(p, processing));
    expect(applied.scoreText).toBe(p.scoreText);
    expect(applied.processing.tracks.melody.assignmentKey).toBe('warmDrive');
    expect(applied.processing.tracks.melody.pedals[0].params.drive).toBe(18);
    // Legacy destinations have no marker: foreign source history must not
    // make an unassigned manual board look like a removed source directive.
    const legacy = createProject(),
      next = structuredClone(legacy.processing);
    next.master.assignmentKey = 'warmDrive';
    next.master.pedals = [makePedal('eq')];
    const retained = reparse(updateProcessingAssignments(legacy, next));
    expect(retained.processing.master.pedals[0].kind).toBe('eq');
    expect(retained.processing.master.assignmentKey).toBeUndefined();
  });
  it('pedalboard Apply writes source assignments and preserves the exact edited applied copies', () => {
    const p = createProject(),
      processing = structuredClone(p.processing);
    const preset = processing.library.find((p) => p.key === 'warmDrive')!;
    processing.tracks.melody = { ...structuredClone(preset.chain), presetId: preset.id };
    processing.tracks.melody.pedals[0].params.drive = 12;
    processing.master = structuredClone(processing.tracks.melody);
    const applied = reparse(updateProcessingAssignments(p, processing));
    expect(applied.scoreText).toContain('master through warmDrive');
    expect(applied.scoreText).toContain('melody using brightReed through warmDrive');
    expect(applied.processing.master.pedals[0].params.drive).toBe(12);
    expect(applied.processing.tracks.melody.pedals[0].params.drive).toBe(12);
    expect(applied.processing.tracks.bass.pedals).toEqual([]);
    expect(importProject(JSON.stringify(applied))).toEqual(applied);
  });
  it('reconciles track/master assignments once, keeps edited copies and clears removed directives', () => {
    const p = createProject();
    p.scoreText =
      'master through cleanGlue\ntrack melody using brightReed through warmDrive {\n C4 quarter\n}\ntrack bass using softBass through warmDrive {\n C2 quarter\n}';
    const assigned = reparse(p);
    const melody = assigned.processing.tracks.melody,
      bass = assigned.processing.tracks.bass;
    expect(melody.presetId).toBe('warm-drive');
    expect(assigned.processing.master.presetId).toBe('clean-glue');
    expect(melody.pedals).not.toBe(bass.pedals);
    melody.pedals[0].params.drive = 12;
    melody.bypassed = true;
    assigned.processing.library.find((p) => p.key === 'warmDrive')!.chain.pedals[0].params.drive =
      3;
    const again = reparse(assigned);
    expect(again.processing.tracks.melody.pedals[0].params.drive).toBe(12);
    expect(bass.pedals[0].params.drive).toBe(6);
    expect(importProject(JSON.stringify(again))).toEqual(again);
    const removed = reparse({
      ...again,
      scoreText: again.scoreText
        .replace('master through cleanGlue\n', '')
        .replace(' through warmDrive', ''),
    });
    expect(removed.processing.master.pedals).toEqual([]);
    expect(removed.processing.tracks.melody.pedals).toEqual([]);
    expect(removed.processing.tracks.bass.pedals).toHaveLength(1);
  });
  it('retains legacy unassigned boards, ignores invalid score reconciliation and copies newly changed keys', () => {
    const p = createProject();
    p.processing.master.pedals = [makePedal('delay')];
    p.processing.tracks.melody.pedals = [makePedal('eq')];
    expect(reparse(p).processing).toEqual(p.processing);
    const bad = {
      ...p,
      scoreText: p.scoreText.replace('using brightReed', 'using brightReed through missing'),
    };
    expect(reparse(bad)).toBe(bad);
    const next = reparse({
      ...p,
      scoreText: p.scoreText.replace('using brightReed', 'using brightReed through warmDrive'),
    });
    expect(next.processing.tracks.melody.pedals[0].kind).toBe('overdrive');
    expect(next.processing.master.pedals[0].kind).toBe('delay');
    const changed = reparse({
      ...next,
      scoreText: next.scoreText.replace('through warmDrive', 'through cleanGlue'),
    });
    expect(changed.processing.tracks.melody.pedals[0].kind).toBe('compressor');
  });
  it('composition reassignment preserves mix, pedals and other copies through save/reload', () => {
    const p = createProject();
    p.tracks[0].level = 0.37;
    p.processing.tracks.melody.bypassed = true;
    p.scoreText = p.scoreText.replace('time 4/4', 'time 7/8 // odd meter');
    const sine = p.instruments.find((i) => i.key === 'sine')!;
    const assigned = reparse(applyPreset(p, sine.id, sine.sound, ['melody']));
    expect(assigned.tracks[0].level).toBe(0.37);
    expect(assigned.processing).toEqual(p.processing);
    expect(assigned.tracks[1]).toEqual(p.tracks[1]);
    expect(assigned.tracks[0].sound).not.toBe(sine.sound);
    const restored = importProject(JSON.stringify(assigned));
    expect(restored).toEqual(assigned);
    expect(
      parseScore(
        restored.scoreText,
        restored.instruments.map((i) => i.key),
      ).meter,
    ).toEqual({ numerator: 7, denominator: 8 });
  });
  it('round-trips the editable project through JSON', () => {
    const p = createProject();
    expect(importProject(JSON.stringify(p))).toEqual(p);
  });
  it('preserves an empty, unfinished score through save and import', () => {
    const p = createProject();
    p.scoreText = '';
    const restored = importProject(JSON.stringify(p));
    expect(restored.scoreText).toBe('');
    expect(restored.instruments).toEqual(p.instruments);
    expect(restored.tracks).toEqual(p.tracks);
  });
  it('library saves leave existing tracks and snapshots unchanged', () => {
    const p = createProject();
    const before = structuredClone(p.tracks[0].sound);
    p.instruments.find((i) => i.id === p.tracks[0].presetId)!.sound.harmonics[0] = 0.1;
    p.instruments.find((i) => i.id === p.tracks[0].presetId)!.version++;
    expect(reparse(p).tracks[0].sound).toEqual(before);
    expect(p.comparison.A.harmonics[0]).toBe(1);
  });
  it('updates only selected associated tracks and deep-copies each destination', () => {
    const p = createProject();
    const sound = mathematicalPreset('saw');
    const applied = applyPreset(p, 'bright-reed', sound, ['melody']);
    expect(applied.tracks[1]).toEqual(p.tracks[1]);
    expect(applied.tracks[0].sound).toEqual(sound);
    applied.tracks[0].sound.harmonics[0] = 0.2;
    expect(sound.harmonics[0]).toBe(1);
  });
  it('Apply edits the score assignment narrowly and survives re-parsing', () => {
    const p = createProject();
    const triangle = p.instruments.find((i) => i.id === 'triangle')!;
    const applied = reparse(applyPreset(p, triangle.id, triangle.sound, ['melody']));
    expect(applied.scoreText).toBe(
      p.scoreText.replace('melody using brightReed', 'melody using triangle'),
    );
    expect(applied.tracks[0].sound).toEqual(triangle.sound);
    expect(applied.tracks[0].presetId).toBe('triangle');
  });
  it('unchanged assignments preserve copies, while changed assignments copy the new library', () => {
    const p = createProject();
    p.tracks[0].sound.harmonics[0] = 0.25;
    expect(reparse(p).tracks[0].sound.harmonics[0]).toBe(0.25);
    p.scoreText = p.scoreText.replace('melody using brightReed', 'melody using sine');
    expect(reparse(p).tracks[0].sound.harmonics[0]).toBe(1);
  });
  it('snapshot B is isolated from A, library, and track copies', () => {
    const p = createProject();
    p.comparison.B = structuredClone(p.comparison.A);
    p.comparison.B.harmonics[0] = 0.5;
    expect(p.comparison.A.harmonics[0]).toBe(1);
    expect(p.tracks[0].sound.harmonics[0]).toBe(1);
  });
  it.each([
    (p: any) => {
      p.schemaVersion = 9;
    },
    (p: any) => {
      p.comparison.A.harmonics = [1];
    },
    (p: any) => {
      p.comparison.A.trim = 100;
    },
    (p: any) => {
      p.comparison.B.polarity[2] = 0;
    },
    (p: any) => {
      p.instruments[1].key = p.instruments[0].key;
    },
    (p: any) => {
      p.tracks[0].presetId = 'missing';
    },
    (p: any) => {
      p.tracks[0].level = null;
    },
    (p: any) => {
      p.instruments[0].version = 1.2;
    },
  ])('rejects corrupt or unsupported import without touching the original', (mutate) => {
    const original = createProject();
    const candidate = structuredClone(original);
    mutate(candidate);
    expect(() => importProject(JSON.stringify(candidate))).toThrow();
    expect(original.comparison.A.harmonics[0]).toBe(1);
  });
});

it('round-trips point geometry and rejects malformed optional editor data', () => {
  const p = createProject();
  p.comparison.A.waveformPoints = [
    { x: 0, y: 0 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0 },
  ];
  expect(importProject(JSON.stringify(p)).comparison.A.waveformPoints).toEqual(
    p.comparison.A.waveformPoints,
  );
  p.comparison.A.waveformPoints[1].y = NaN;
  expect(() => importProject(JSON.stringify(p))).toThrow();
  p.comparison.A.waveformPoints[1].y = 1;
  p.comparison.A.waveformPoints[1].x = 0;
  expect(() => importProject(JSON.stringify(p))).toThrow();
});

it('loads the demo without replacing customized library entries or colliding restored preset IDs', () => {
  const project = createProject();
  const reed = project.instruments.find((preset) => preset.key === 'brightReed')!;
  reed.key = 'myReed';
  reed.sound.trim = -23;
  project.scoreText = 'track custom using myReed {\n C4 quarter\n}';
  const before = structuredClone(project);
  const loaded = reparse(withExampleScore(project));
  expect(project).toEqual(before);
  expect(loaded.instruments.find((preset) => preset.key === 'myReed')).toEqual(reed);
  expect(new Set(loaded.instruments.map((preset) => preset.id)).size).toBe(
    loaded.instruments.length,
  );
  expect(
    parseScore(
      loaded.scoreText,
      loaded.instruments.map((preset) => preset.key),
    ).diagnostics,
  ).toEqual([]);
  expect(importProject(JSON.stringify(loaded))).toEqual(loaded);
  expect(loaded.comparison).toEqual(before.comparison);
});
