import { MODULE_API_VERSION } from './contracts';
export interface EngineNote<S = unknown> {
  context: BaseAudioContext;
  destination: AudioNode;
  settings: S;
  frequencyHz: number;
  startSeconds: number;
  durationSeconds: number;
  releaseLimitSeconds?: number;
  solo?: string;
  seed: number;
}
export interface EngineVoice<S = unknown> {
  readonly end: number;
  update: (settings: S, solo?: string) => void;
  steal: (atSeconds: number) => void;
  dispose: () => void;
  /** Optional diagnostic ports, not requirements for synthesis algorithms. */
  envelope?: GainNode;
  oscillators?: OscillatorNode[];
}
export interface EngineDefinition<S = unknown> {
  readonly id: string;
  readonly apiVersion: number;
  readonly dataVersion: number;
  readonly label: string;
  readonly author: string;
  readonly attribution: string;
  readonly minimumSampleRate: number;
  readonly maximumSampleRate: number;
  readonly supportsLive: boolean;
  readonly supportsOffline: boolean;
  readonly randomness: 'none' | 'fixed' | 'seeded';
  readonly capabilities: {
    readonly fourier: boolean;
    readonly dotEditor: boolean;
    readonly partialSolo: boolean;
    readonly update: 'phase-continuous' | 'replay';
  };
  readonly resources: {
    readonly estimatedNodesPerVoice: number;
    readonly estimatedBytesPerVoice: number;
  };
  defaults: () => S;
  validateSettings: (settings: unknown) => void;
  create: (note: EngineNote<S>) => EngineVoice<S>;
}
function serializable(value: unknown, depth = 0): void {
  if (depth > 8) throw new Error('Engine settings exceed serialization bounds.');
  if (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return;
  if (typeof value === 'string' && value.length <= 4096) return;
  if (Array.isArray(value) && value.length <= 128) {
    for (const item of value) serializable(item, depth + 1);
    return;
  }
  if (
    value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length <= 128
  ) {
    for (const [key, item] of Object.entries(value)) {
      if (key.length > 160 || ['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('Unsafe engine settings key.');
      serializable(item, depth + 1);
    }
    return;
  }
  throw new Error('Engine settings must be bounded JSON data.');
}
const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;
export function defineEngine<S>(input: EngineDefinition<S>): EngineDefinition<S> {
  const c = input?.capabilities,
    b = input?.resources;
  if (
    !input ||
    typeof input.id !== 'string' ||
    input.id.length > 160 ||
    !/^([a-z][a-z0-9-]*):engine\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(input.id) ||
    input.apiVersion !== MODULE_API_VERSION ||
    !Number.isSafeInteger(input.dataVersion) ||
    input.dataVersion < 1 ||
    ![input.label, input.author, input.attribution].every(
      (v) => typeof v === 'string' && !!v.trim() && v.length <= 2000,
    ) ||
    !Number.isFinite(input.minimumSampleRate) ||
    input.minimumSampleRate < 3000 ||
    !Number.isFinite(input.maximumSampleRate) ||
    input.maximumSampleRate < input.minimumSampleRate ||
    input.maximumSampleRate > 384000 ||
    typeof input.supportsLive !== 'boolean' ||
    typeof input.supportsOffline !== 'boolean' ||
    (!input.supportsLive && !input.supportsOffline) ||
    !['none', 'fixed', 'seeded'].includes(input.randomness) ||
    !c ||
    ![c.fourier, c.dotEditor, c.partialSolo].every((v) => typeof v === 'boolean') ||
    ((c.dotEditor || c.partialSolo) && !c.fourier) ||
    !['phase-continuous', 'replay'].includes(c.update) ||
    !b ||
    !Number.isSafeInteger(b.estimatedNodesPerVoice) ||
    b.estimatedNodesPerVoice < 1 ||
    b.estimatedNodesPerVoice > 256 ||
    !Number.isSafeInteger(b.estimatedBytesPerVoice) ||
    b.estimatedBytesPerVoice < 0 ||
    b.estimatedBytesPerVoice > 16777216 ||
    ![input.defaults, input.validateSettings, input.create].every((f) => typeof f === 'function')
  )
    throw new Error('Invalid engine definition.');
  const snapshot = structuredClone(input.defaults());
  serializable(snapshot);
  input.validateSettings(snapshot);
  const validate = (settings: S) => {
    serializable(settings);
    input.validateSettings(settings);
  };
  return Object.freeze({
    ...input,
    capabilities: Object.freeze({ ...c }),
    resources: Object.freeze({ ...b }),
    defaults: () => structuredClone(snapshot),
    create(note: EngineNote<S>) {
      if (
        !note.context ||
        !note.destination ||
        !Number.isFinite(note.frequencyHz) ||
        note.frequencyHz <= 0 ||
        note.frequencyHz > 1000000 ||
        !nonnegative(note.startSeconds) ||
        !nonnegative(note.durationSeconds) ||
        (note.releaseLimitSeconds !== undefined && !nonnegative(note.releaseLimitSeconds)) ||
        !Number.isSafeInteger(note.seed) ||
        note.seed < 0 ||
        note.seed > 0xffffffff
      )
        throw new Error('Invalid engine note or audio-clock units.');
      const offline = 'startRendering' in note.context;
      if (
        (offline && !input.supportsOffline) ||
        (!offline && !input.supportsLive) ||
        note.context.sampleRate < input.minimumSampleRate ||
        note.context.sampleRate > input.maximumSampleRate
      )
        throw new Error(`Unsupported engine context: ${input.id}.`);
      if (note.solo && !c.partialSolo)
        throw new Error(`Partial solo is unavailable for ${input.id}.`);
      const settings = structuredClone(note.settings);
      validate(settings);
      const voice = input.create({ ...note, settings });
      if (
        !voice ||
        !nonnegative(voice.end) ||
        ![voice.update, voice.steal, voice.dispose].every((f) => typeof f === 'function')
      ) {
        voice?.dispose?.();
        throw new Error(`Invalid engine voice: ${input.id}.`);
      }
      let disposed = false;
      return {
        envelope: voice.envelope,
        oscillators: voice.oscillators,
        get end() {
          return voice.end;
        },
        update(next: S, solo?: string) {
          if (disposed) return;
          if (c.update === 'replay') throw new Error(`Replay required for ${input.id}.`);
          if (solo && !c.partialSolo) throw new Error('Partial solo unavailable.');
          const copy = structuredClone(next);
          validate(copy);
          voice.update(copy, solo);
        },
        steal(at: number) {
          if (disposed) return;
          if (!nonnegative(at)) throw new Error('Invalid retirement time.');
          voice.steal(at);
        },
        dispose() {
          if (disposed) return;
          disposed = true;
          voice.dispose();
        },
      };
    },
  });
}
/** Heterogeneous lookup is erased only here; factories retain runtime settings validation. */
export function createEngineRegistry(
  inputs: readonly EngineDefinition<any>[],
  builtInIds: readonly string[] = [],
) {
  const definitions = inputs.map((d) => defineEngine(d)),
    map = new Map<string, EngineDefinition<unknown>>();
  for (const definition of definitions) {
    if (definition.id.startsWith('fourpataka:') && !builtInIds.includes(definition.id))
      throw new Error('Reserved engine ID.');
    if (map.has(definition.id)) throw new Error('Duplicate engine ID.');
    map.set(definition.id, definition);
  }
  return Object.freeze({
    definitions: Object.freeze(definitions),
    get(id: string) {
      const definition = map.get(id);
      if (!definition) throw new Error(`Unavailable engine: ${id}.`);
      return definition;
    },
  });
}
