import { expect, it } from 'vitest';
import { defineEngine, createEngineRegistry, type EngineDefinition } from '../../src/modules';
const definition: EngineDefinition<{ gain: number }> = {
  id: 'test:engine/tone',
  apiVersion: 1,
  dataVersion: 1,
  label: 'Tone',
  author: 'Test',
  attribution: 'Test source',
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  supportsLive: true,
  supportsOffline: true,
  randomness: 'none',
  capabilities: {
    fourier: false,
    dotEditor: false,
    partialSolo: false,
    update: 'phase-continuous',
  },
  resources: { estimatedNodesPerVoice: 3, estimatedBytesPerVoice: 0 },
  defaults: () => ({ gain: 0.5 }),
  validateSettings(v: any) {
    if (!v || !Number.isFinite(v.gain) || v.gain < 0 || v.gain > 1) throw new Error('Invalid gain');
  },
  create() {
    throw new Error('Test-only factory');
  },
};
it('validates immutable contracts reserved identities duplicate IDs and independent defaults', () => {
  const engine = defineEngine(definition),
    a = engine.defaults(),
    b = engine.defaults();
  a.gain = 0;
  expect(b.gain).toBe(0.5);
  expect(Object.isFrozen(engine.capabilities)).toBe(true);
  expect(createEngineRegistry([engine]).get(engine.id).defaults()).toEqual({ gain: 0.5 });
  expect(() => createEngineRegistry([engine, engine])).toThrow('Duplicate');
  expect(() => createEngineRegistry([{ ...engine, id: 'fourpataka:engine/tone' }])).toThrow(
    'Reserved',
  );
  for (const patch of [
    { apiVersion: 2 },
    { dataVersion: 0 },
    { capabilities: { ...engine.capabilities, dotEditor: true } },
    { resources: { ...engine.resources, estimatedNodesPerVoice: 0 } },
    { defaults: () => ({ gain: 2 }) },
  ])
    expect(() => defineEngine({ ...engine, ...patch })).toThrow();
});
it('validates settings and audio-clock requests before allocation and disposes once', () => {
  let allocated = 0,
    disposed = 0,
    seen = 0;
  const engine = defineEngine({
    ...definition,
    create(note) {
      allocated++;
      seen = note.settings.gain;
      return {
        end: note.startSeconds + note.durationSeconds,
        update(v) {
          seen = v.gain;
        },
        steal() {},
        dispose() {
          disposed++;
        },
      };
    },
  });
  const note: any = {
    context: { sampleRate: 48000, startRendering() {} },
    destination: {},
    settings: { gain: 0.5 },
    frequencyHz: 440,
    startSeconds: 2,
    durationSeconds: 0.5,
    seed: 7,
  };
  expect(() => engine.create({ ...note, frequencyHz: NaN })).toThrow('note');
  expect(() => engine.create({ ...note, settings: { gain: 2 } })).toThrow('gain');
  expect(() => engine.create({ ...note, solo: 'H1' })).toThrow('solo');
  expect(allocated).toBe(0);
  const voice = engine.create(note);
  note.settings.gain = 0;
  expect(seen).toBe(0.5);
  voice.update({ gain: 0.7 });
  expect(seen).toBe(0.7);
  voice.dispose();
  voice.dispose();
  expect(disposed).toBe(1);
});

it('captures contract guards and cleans up malformed factory results', () => {
  let disposed = 0;
  const raw = {
    ...definition,
    capabilities: { ...definition.capabilities },
    create: () => ({
      end: NaN,
      update() {},
      steal() {},
      dispose() {
        disposed++;
      },
    }),
  };
  const engine = defineEngine(raw);
  raw.capabilities.partialSolo = true;
  raw.supportsOffline = false;
  const note: any = {
    context: { sampleRate: 48000, startRendering() {} },
    destination: {},
    settings: { gain: 0.5 },
    frequencyHz: 440,
    startSeconds: 0,
    durationSeconds: 1,
    seed: 0,
  };
  expect(() => engine.create({ ...note, solo: 'H1' })).toThrow('solo');
  expect(() => engine.create(note)).toThrow('voice');
  expect(disposed).toBe(1);
});
it('rejects unavailable modes rates invalid seeds and replay-only edits before allocation', () => {
  let allocated = 0;
  const engine = defineEngine({
    ...definition,
    supportsLive: false,
    capabilities: { ...definition.capabilities, update: 'replay' },
    create() {
      allocated++;
      return { end: 1, update() {}, steal() {}, dispose() {} };
    },
  });
  const note: any = {
    context: { sampleRate: 48000, startRendering() {} },
    destination: {},
    settings: { gain: 0.5 },
    frequencyHz: 440,
    startSeconds: 0,
    durationSeconds: 1,
    seed: 0,
  };
  expect(() => engine.create({ ...note, context: { sampleRate: 48000 } })).toThrow('context');
  expect(() =>
    engine.create({ ...note, context: { sampleRate: 2000, startRendering() {} } }),
  ).toThrow('context');
  expect(() => engine.create({ ...note, seed: -1 })).toThrow('note');
  expect(() => engine.create({ ...note, settings: { gain: 0.5, bad: Infinity } })).toThrow('JSON');
  expect(allocated).toBe(0);
  const voice = engine.create(note);
  expect(() => voice.update({ gain: 0.4 })).toThrow('Replay');
  expect(() => voice.steal(NaN)).toThrow('time');
});
