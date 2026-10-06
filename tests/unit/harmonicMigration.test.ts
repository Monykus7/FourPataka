import { expect, it } from 'vitest';
import { createProject, importProject } from '../../src/core/project';
import { mathematicalPreset, transform } from '../../src/core/music';
import { waveformCoefficients } from '../../src/core/waveform';

it('migrates schema 1 with silent upper partials and independent owned copies', () => {
  const old = { ...createProject(), schemaVersion: 1 };
  const sounds = [
    ...old.instruments.map((p) => p.sound),
    ...old.tracks.map((t) => t.sound),
    old.comparison.A,
    old.comparison.B,
  ];
  for (const sound of sounds) {
    sound.harmonics = sound.harmonics.slice(0, 16);
    sound.polarity = sound.polarity.slice(0, 16);
  }
  old.tracks[0].sound.harmonics[5] = 0.37;
  old.comparison.A.polarity[15] = -1;
  old.tracks[0].sound.waveformPoints = [
    { x: 0, y: 0 },
    { x: 0.5, y: 0.8 },
    { x: 1, y: 0 },
  ];
  const restored = importProject(JSON.stringify(old));
  expect(restored.schemaVersion).toBe(2);
  expect(restored.scoreText).toBe(old.scoreText);
  expect(restored.tracks[0].sound.waveformPoints).toEqual(old.tracks[0].sound.waveformPoints);
  expect(restored.tracks[0].sound.harmonics.slice(0, 16)).toEqual(old.tracks[0].sound.harmonics);
  expect(restored.tracks[0].sound.harmonics.slice(16)).toEqual(Array(16).fill(0));
  expect(restored.comparison.A.polarity.slice(0, 16)).toEqual(old.comparison.A.polarity);
  expect(restored.comparison.A.polarity.slice(16)).toEqual(Array(16).fill(1));
  const macros = { falloff: 0.2, brightness: 0.7, oddEven: 0.1, subWeight: 1 };
  expect(transform(restored.comparison.A, macros).harmonics.slice(0, 16)).toEqual(
    transform(old.comparison.A, macros).harmonics,
  );
  restored.tracks[0].sound.harmonics[31] = 0.8;
  expect(restored.comparison.A.harmonics[31]).toBe(0);
  expect(restored.instruments[0].sound.harmonics[31]).toBe(0);
  expect(importProject(JSON.stringify(restored))).toEqual(restored);
  expect(() => importProject(JSON.stringify({ ...restored, schemaVersion: 1 }))).toThrow(
    '16 values',
  );
});

it('projects the upper bank without leaking energy into lower harmonics', () => {
  const samples = Array.from(
    { length: 257 },
    (_, i) => 0.3 * Math.sin((Math.PI * 32 * i) / 256) - 0.2 * Math.sin((Math.PI * 17 * i) / 256),
  );
  const coefficients = waveformCoefficients(samples);
  expect(coefficients).toHaveLength(32);
  expect(coefficients[31]).toBeCloseTo(0.3, 10);
  expect(coefficients[16]).toBeCloseTo(-0.2, 10);
  coefficients.forEach((value, i) => {
    if (i !== 31 && i !== 16) expect(value).toBeCloseTo(0, 10);
  });
  expect(mathematicalPreset('saw').harmonics[31]).toBe(1 / 32);
  expect(mathematicalPreset('triangle').polarity[30]).toBe(-1);
});
