import { expect, it } from 'vitest';
import { createProject, importProject, applyPreset } from '../../src/core/project';
import {
  createEngineSound,
  readInstrumentSound,
  requireEngine,
  engineRelease,
} from '../../src/core/engineSound';
import { prepareExport } from '../../src/audio/export';
import { createEngineRegistry } from '../../src/modules';
import { basicTone } from '../../src/modules/examples/basicTone/index';

it('schema4 round-trips independent engine settings with owned library track and A/B copies', () => {
  const p = createProject();
  const tone = createEngineSound(basicTone.id);
  p.instruments[0].sound = tone;
  p.comparison.A = structuredClone(tone);
  const withTrack = applyPreset(p, p.instruments[0].id, tone, [p.tracks[0].key]);
  const copy = importProject(JSON.stringify(withTrack));
  expect(copy.schemaVersion).toBe(6);
  expect(copy.instruments[0].sound).toEqual(tone);
  expect(copy.tracks[0].sound).toEqual(tone);
  expect(engineRelease(tone)).toBe(0.25);
  (tone.engine.settings as any).trim = -20;
  expect(copy.comparison.A).not.toEqual(tone);
  (copy.instruments[0].sound as any).engine.settings.trim = -30;
  expect((copy.tracks[0].sound as any).engine.settings.trim).toBe(-12);
});
it('retains unknown and newer engine data and refuses playback rather than substituting Fourier', () => {
  const settings = { nested: [1, { future: 'keep' }] };
  const unknown = {
    engine: { id: 'future:engine/tone', apiVersion: 7, dataVersion: 9, settings, extra: 'retain' },
    provenance: 'original',
  };
  const parsed = readInstrumentSound(unknown) as any;
  expect(parsed.unavailable).toContain('not installed');
  expect(parsed.engine).toEqual(unknown.engine);
  expect(parsed.provenance).toBe('original');
  expect(() => requireEngine(parsed)).toThrow('Original settings');
  const newer = readInstrumentSound({
    engine: { ...createEngineSound(basicTone.id).engine, dataVersion: 2, settings },
  }) as any;
  expect(newer.unavailable).toContain('version');
  expect(newer.engine.settings).toEqual(settings);
  expect(() => createEngineRegistry([basicTone]).get(unknown.engine.id)).toThrow('Unavailable');
  const available = readInstrumentSound({
    ...createEngineSound(basicTone.id),
    unavailable: 'old marker',
  }) as any;
  expect(available.unavailable).toBeUndefined();
});
it('validates exact settings, envelope versions and engine export preflight', () => {
  const p = createProject();
  const tone = createEngineSound(basicTone.id);
  (tone.engine.settings as any).detune = Infinity;
  expect(() => readInstrumentSound(tone)).toThrow('JSON');
  (tone.engine.settings as any).detune = 2000;
  expect(() => readInstrumentSound(tone)).toThrow('detune');
  p.comparison.B = createEngineSound(basicTone.id);
  expect(() => importProject(JSON.stringify({ ...p, schemaVersion: 3 }))).toThrow('schema 4');
  p.tracks[0].sound = {
    engine: { id: 'missing:engine/test', apiVersion: 1, dataVersion: 1, settings: {} },
  };
  expect(() =>
    prepareExport(p, { sampleRate: 48000, channels: 1, bitDepth: 16, tailSeconds: 0 }),
  ).toThrow('preserved');
});
