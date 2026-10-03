import { expect, it } from 'vitest';
import {
  softBassPreset,
  legacySoftBassPreset,
  upgradeSoftBassTemplate,
} from '../../src/core/instrumentPresets';
import { mathematicalPreset, sourceSamples } from '../../src/core/music';
import { createProject, importProject } from '../../src/core/project';

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
