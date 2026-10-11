import { expect, it } from 'vitest';
import {
  kickPreset,
  createPercussionPresets,
  softBassPreset,
  legacySoftBassPreset,
  upgradeSoftBassTemplate,
} from '../../src/core/instrumentPresets';
import { dbToGain, mathematicalPreset, sourceSamples } from '../../src/core/music';
import { parseScore } from '../../src/core/parser';
import {
  createProject,
  importProject,
  validateSound,
  withPercussionPresets,
} from '../../src/core/project';

it('kick has a low body with audible beater partials and fresh editable banks', () => {
  const kick = kickPreset();
  validateSound(kick);
  expect(kick.attack).toBeLessThan(softBassPreset().attack);
  expect(kick.release).toBeLessThan(softBassPreset().release);
  expect(kick.harmonics[0]).toBeGreaterThan(kick.harmonics.slice(1).reduce((a, b) => a + b, 0));
  expect(sourceSamples(kick, 65).values).not.toEqual(sourceSamples(softBassPreset(), 65).values);
  kick.harmonics[0] = 0;
  kick.polarity[0] = -1;
  kick.undertones[0] = 1;
  expect(kickPreset()).toMatchObject({
    harmonics: expect.arrayContaining([1]),
    undertonesEnabled: false,
  });
  expect(kickPreset().polarity[0]).toBe(1);
  expect(kickPreset().undertones[0]).toBe(0);
});

it('percussion has distinct low, sparse-high and dense-high spectra with bounded gain', () => {
  const presets = createPercussionPresets();
  const [kick, hat, snare] = presets.map((p) => p.sound);
  expect(hat.harmonics.slice(0, 12).every((v) => v === 0)).toBe(true);
  expect(hat.harmonics.filter((v) => v > 0)).toHaveLength(6);
  expect(snare.harmonics.slice(8).filter((v) => v > 0)).toHaveLength(24);
  expect(snare.harmonics[0]).toBeGreaterThan(0);
  expect(new Set(presets.map((p) => JSON.stringify(p.sound.harmonics))).size).toBe(3);
  for (const preset of presets) {
    validateSound(preset.sound);
    // Sum of absolute coefficients bounds any phase/pitch peak, including
    // Nyquist exclusions. This is headroom, not automatic gain normalization.
    expect(
      preset.sound.harmonics.reduce((a, b) => a + b, 0) * dbToGain(preset.sound.trim),
    ).toBeLessThan(0.65);
  }
  expect(hat.release).toBeLessThan(snare.release);
  expect(snare.release).toBeLessThan(kick.release);
  presets[0].sound.harmonics[0] = 0;
  expect(createPercussionPresets()[0].sound.harmonics[0]).toBe(1);
  expect(presets[1].sound.harmonics).not.toBe(presets[2].sound.harmonics);
});

it('existing projects gain missing bundled percussion before parser key discovery without replacing owned sounds', () => {
  const old = createProject();
  old.instruments = old.instruments.filter((p) => !['kick', 'hiHat', 'snare'].includes(p.key));
  const before = structuredClone(old);
  const restored = importProject(JSON.stringify(old));
  expect(restored.instruments.map((p) => p.key)).toEqual([
    ...old.instruments.map((p) => p.key),
    'kick',
    'hiHat',
    'snare',
  ]);
  expect(restored.tracks).toEqual(old.tracks);
  expect(restored.comparison).toEqual(old.comparison);
  expect(restored.scoreText).toBe(old.scoreText);
  expect(restored.editorPresetId).toBe(old.editorPresetId);
  expect(importProject(JSON.stringify(restored))).toEqual(restored);
  const next = withPercussionPresets(old);
  expect(next.instruments).toHaveLength(9);
  expect(next.scoreText).toBe(old.scoreText);
  expect(next.tracks).toBe(old.tracks);
  expect(next.comparison).toBe(old.comparison);
  expect(next.processing).toBe(old.processing);
  expect(next.comparisonMaterial).toBe(old.comparisonMaterial);
  expect(next.editorPresetId).toBe(old.editorPresetId);
  expect(old).toEqual(before);
  expect(importProject(JSON.stringify(next))).toEqual(next);
  expect(withPercussionPresets(next)).toBe(next);
});

it('explicit percussion import preserves colliding keys, resolves IDs, and is atomic at capacity', () => {
  const project = createProject();
  project.instruments = project.instruments.filter((p) => !['hiHat', 'snare'].includes(p.key));
  const custom = project.instruments.find((p) => p.key === 'kick')!;
  custom.label = 'My kick';
  custom.sound.harmonics[0] = 0.123;
  project.instruments[0].id = 'hi-hat';
  const next = withPercussionPresets(project);
  expect(next.instruments.find((p) => p.key === 'kick')).toBe(custom);
  expect(next.instruments.find((p) => p.key === 'hiHat')!.id).toBe('hi-hat-2');
  const full = {
    ...project,
    instruments: Array.from({ length: 127 }, (_, i) => ({ ...custom, id: `p${i}`, key: `p${i}` })),
  };
  const before = JSON.stringify(full);
  expect(() => withPercussionPresets(full)).toThrow('128-preset limit');
  expect(JSON.stringify(full)).toBe(before);
});

it('old score files resolve kick hiHat and snare into distinct owned tracks after loading', () => {
  const old = createProject();
  old.instruments = old.instruments.filter((p) => !['kick', 'hiHat', 'snare'].includes(p.key));
  old.scoreText =
    'tempo 120\ntrack drums using kick {\n C2 16th\n}\ntrack hats using hiHat {\n C4 64th\n}\ntrack snares using snare {\n D3 32nd\n}';
  const restored = importProject(JSON.stringify(old));
  const score = parseScore(
    restored.scoreText,
    restored.instruments.map((p) => p.key),
  );
  expect(score.diagnostics).toEqual([]);
  expect(restored.tracks.map((t) => t.presetId)).toEqual(['kick', 'hi-hat', 'snare']);
  for (const track of restored.tracks) {
    const library = restored.instruments.find((p) => p.id === track.presetId)!;
    expect(track.sound).toEqual(library.sound);
    expect(track.sound).not.toBe(library.sound);
  }
});

it('a full old library remains valid and customized percussion keys/IDs survive automatic loading', () => {
  const old = createProject();
  old.instruments = old.instruments.filter((p) => !['hiHat', 'snare'].includes(p.key));
  const kick = old.instruments.find((p) => p.key === 'kick')!;
  kick.sound.trim = -23;
  old.instruments[1].id = 'hi-hat';
  const restored = importProject(JSON.stringify(old));
  expect(restored.instruments.find((p) => p.key === 'kick')!.sound.trim).toBe(-23);
  expect(restored.instruments.find((p) => p.key === 'hiHat')!.id).toBe('hi-hat-2');
  const full = createProject();
  full.instruments = full.instruments.filter((p) => !['kick', 'hiHat', 'snare'].includes(p.key));
  const template = full.instruments[0];
  while (full.instruments.length < 128) {
    const suffix = full.instruments.length;
    full.instruments.push({
      ...structuredClone(template),
      id: `user${suffix}`,
      key: `user${suffix}`,
    });
  }
  expect(importProject(JSON.stringify(full))).toEqual(full);
});

it('Soft bass has a distinct signed source and retains explicit envelope/gain settings', () => {
  const bass = softBassPreset();
  const triangle = mathematicalPreset('triangle');
  expect(bass.harmonics[1]).toBe(0.22);
  expect(triangle.harmonics[1]).toBe(0);
  expect(bass.polarity[2]).toBe(1);
  expect(triangle.polarity[2]).toBe(-1);
  expect(sourceSamples(bass, 440).values).not.toEqual(sourceSamples(triangle, 440).values);
  expect(bass).toMatchObject({ attack: 0.03, release: 0.35, trim: -12, undertonesEnabled: false });
  bass.harmonics[1] = 0.9;
  expect(softBassPreset().harmonics[1]).toBe(0.22);
});

it('new projects seed version 2 Soft bass with an independent bass-track copy', () => {
  const project = createProject();
  const preset = project.instruments.find((item) => item.key === 'softBass')!;
  const track = project.tracks.find((item) => item.key === 'bass')!;
  expect(preset.version).toBe(2);
  expect(track.sound).toEqual(preset.sound);
  expect(track.sound).not.toBe(preset.sound);
});

it('upgrades only untouched legacy library templates while preserving applied tracks and snapshots', () => {
  const legacy = createProject();
  const template = legacy.instruments.find((item) => item.id === 'soft-bass')!;
  template.version = 1;
  template.sound = legacySoftBassPreset();
  const track = legacy.tracks.find((item) => item.key === 'bass')!;
  track.appliedVersion = 1;
  track.sound = structuredClone(template.sound);
  legacy.comparison.A = structuredClone(template.sound);
  legacy.comparison.B = structuredClone(template.sound);
  const restored = importProject(JSON.stringify(legacy));
  expect(restored.instruments.find((item) => item.id === 'soft-bass')).toMatchObject({
    version: 2,
    sound: softBassPreset(),
  });
  expect(restored.tracks).toEqual(legacy.tracks);
  expect(restored.comparison).toEqual(legacy.comparison);
  expect(restored.processing).toEqual(legacy.processing);
  expect(template.version).toBe(1);
  expect(importProject(JSON.stringify(restored))).toEqual(restored);
});

it('preserves customized, renamed, saved and alternate-identity templates', () => {
  const template = {
    id: 'soft-bass',
    key: 'softBass',
    label: 'Soft bass',
    version: 1,
    sound: legacySoftBassPreset(),
  };
  for (const custom of [
    { ...template, version: 2 },
    { ...template, label: 'My bass' },
    { ...template, id: 'mine' },
    { ...template, key: 'myBass' },
    { ...template, sound: { ...template.sound, trim: -18 } },
    { ...template, sound: { ...template.sound, polarity: Array(16).fill(1) } },
  ])
    expect(upgradeSoftBassTemplate(custom)).toBe(custom);
});
