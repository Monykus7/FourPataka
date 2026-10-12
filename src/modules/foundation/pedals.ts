import type { NumericModuleDefinition } from './contracts';
import { defineNumericModule, createModuleRegistry } from './registry';

export interface PedalEnvironment {
  readonly oversamplingLatency: number;
  readonly compressorLatency: number;
  readonly sampleRate: number;
}
export interface PedalRuntime {
  input: GainNode;
  output: GainNode;
  readonly latency: number;
  readonly tail: number;
  readonly tailActive: boolean;
  update: (params: Record<string, number>, bypassed: boolean) => void;
  dispose: () => void;
}
export interface PedalModule extends NumericModuleDefinition {
  readonly category: 'pedal';
  /** Only reviewed built-ins keep pre-module persisted kinds. Contributors use id. */
  readonly legacyKind?: string;
  readonly author: string;
  readonly attribution: string;
  readonly bypass: 'dry' | 'drain';
  readonly nodes: number;
  readonly memoryBytes: number;
  readonly minimumSampleRate: number;
  readonly note?: string;
  readonly reset?: { readonly label: string; readonly accessibleLabel: string };
  latency: (environment: PedalEnvironment) => number;
  tail: (params: Record<string, number>, environment: PedalEnvironment) => number;
  /** Additional musical tail; filter settling and latency remain host allowances. */
  exportTail: (params: Record<string, number>) => number;
  create: (
    context: BaseAudioContext,
    params: Record<string, number>,
    bypassed: boolean,
    environment: PedalEnvironment,
  ) => PedalRuntime;
}
export function definePedalModule(input: PedalModule): PedalModule {
  const metadata = defineNumericModule(input);
  if (
    metadata.category !== 'pedal' ||
    !input.author?.trim() ||
    !input.attribution?.trim() ||
    !['dry', 'drain'].includes(input.bypass) ||
    !Number.isSafeInteger(input.nodes) ||
    input.nodes < 1 ||
    input.nodes > 128 ||
    !Number.isSafeInteger(input.memoryBytes) ||
    input.memoryBytes < 0 ||
    input.memoryBytes > 16_777_216 ||
    !Number.isFinite(input.minimumSampleRate) ||
    input.minimumSampleRate < 3000 ||
    ![input.latency, input.tail, input.exportTail, input.create].every(
      (f) => typeof f === 'function',
    ) ||
    (input.legacyKind !== undefined && !/^[a-z][a-z-]{0,39}$/.test(input.legacyKind)) ||
    (input.reset && (!input.reset.label?.trim() || !input.reset.accessibleLabel?.trim()))
  )
    throw new Error(`Invalid pedal contract: ${metadata.id}.`);
  return Object.freeze({
    ...metadata,
    category: 'pedal',
    legacyKind: input.legacyKind,
    author: input.author,
    attribution: input.attribution,
    bypass: input.bypass,
    nodes: input.nodes,
    memoryBytes: input.memoryBytes,
    minimumSampleRate: input.minimumSampleRate,
    note: input.note,
    reset: input.reset ? Object.freeze({ ...input.reset }) : undefined,
    latency: input.latency,
    tail: input.tail,
    exportTail: input.exportTail,
    create: input.create,
  });
}
export function createPedalRegistry(
  inputs: readonly PedalModule[],
  builtInIds: readonly string[] = [],
) {
  const definitions = inputs.map(definePedalModule);
  createModuleRegistry(definitions, { builtInIds });
  const byKind = new Map<string, PedalModule>();
  for (const definition of definitions) {
    if (definition.legacyKind && !builtInIds.includes(definition.id))
      throw new Error(`Only reviewed built-ins may claim legacy kinds: ${definition.id}.`);
    const kind = definition.legacyKind ?? definition.id;
    if (byKind.has(kind)) throw new Error(`Duplicate pedal kind: ${kind}.`);
    byKind.set(kind, definition);
  }
  return Object.freeze({
    definitions: Object.freeze(definitions),
    find: (kind: string) => byKind.get(kind),
    get: (kind: string) => {
      const definition = byKind.get(kind);
      if (!definition) throw new Error(`Unavailable pedal module: ${kind}.`);
      return definition;
    },
  });
}
export const dbGain = (db: number) => 10 ** (db / 20);
export function delayTailSeconds(time: number, feedback: number) {
  const repeats = feedback > 0 ? Math.ceil(Math.log(0.001) / Math.log(feedback / 100)) : 0;
  return (time / 1000) * (1 + repeats);
}
export function checkedSeconds(value: number, moduleId: string) {
  if (!Number.isFinite(value) || value < 0 || value > 3600)
    throw new Error(`Invalid seconds estimate from ${moduleId}.`);
  return value;
}
