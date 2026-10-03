import { expect, it } from 'vitest';
import { softBassPreset } from '../../src/core/instrumentPresets';
import { mathematicalPreset, sourceSamples } from '../../src/core/music';
import { createProject } from '../../src/core/project';

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
