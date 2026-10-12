import { MODULE_API_VERSION, type NumericParameter } from './contracts';
import { defineNumericModule } from './registry';
import { validateEngineData } from './engines';
import { validateFourierSound, type FourierSound } from './fourier';

export type FeaturePlacement = 'learn' | 'instrument' | 'compose' | 'pedalboard';
export type FeatureCapability = 'instrument' | 'source' | 'measurement';
export interface FeatureSnapshot {
  readonly sourceRevision: number;
  readonly targetTrack: string;
  readonly targetFile: string;
  readonly sourceEditable: boolean;
  readonly referenceNote: string;
  readonly analysis: Readonly<{
    supported: boolean;
    power: number;
    centroidHz: number | null;
    oddShare: number;
    subShare: number;
  }>;
  readonly measurement: Readonly<{
    peak: number;
    rms: number;
    sampleRateHz: number;
    windowSamples: number;
    cadenceMs: number;
    playing: boolean;
    mode: 'audition' | 'score' | null;
    positionSeconds: number;
    staleScore: boolean;
  }>;
}
export interface FeatureCommand {
  name: string;
  group: 'Timing' | 'Routing' | 'Structure' | 'Events';
  scope: 'track';
  description: string;
  snippet: string;
  completionTemplate: string;
  syntax: string;
  rules: string;
}
export interface FeatureButton {
  id: string;
  label: string;
  disabled?: boolean;
}
export interface FeatureView {
  description?: string;
  cards?: { title: string; text: string; action: FeatureButton }[];
  metricsTitle?: string;
  metrics?: { label: string; value: string }[];
  note?: string;
  actions?: FeatureButton[];
}
export type FeatureRequest =
  | { type: 'open-instrument' }
  | { type: 'load-sound'; sound: FourierSound; openUndertones?: boolean }
  | {
      type: 'insert-command';
      name: string;
      expectedRevision: number;
      targetTrack: string;
      targetFile: string;
    };
export interface FeatureDefinition<S = unknown> {
  id: string;
  apiVersion: number;
  dataVersion: number;
  label: string;
  author: string;
  attribution: string;
  placement: FeaturePlacement;
  capabilities: readonly FeatureCapability[];
  parameters?: Readonly<Record<string, NumericParameter>>;
  commands?: readonly FeatureCommand[];
  defaults: () => S;
  validateSettings: (value: unknown) => void;
  view: (snapshot: FeatureSnapshot, settings: S) => FeatureView;
  action: (id: string, snapshot: FeatureSnapshot, settings: S) => FeatureRequest;
}
const placements = ['learn', 'instrument', 'compose', 'pedalboard'];
const capabilities = ['instrument', 'source', 'measurement'];
export const FEATURE_ID = /^[a-z][a-z0-9-]*:feature\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/;
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function defineFeature<S>(input: FeatureDefinition<S>): FeatureDefinition<S> {
  if (
    !input ||
    typeof input.id !== 'string' ||
    !FEATURE_ID.test(input.id) ||
    input.id.length > 160 ||
    input.apiVersion !== MODULE_API_VERSION ||
    !Number.isSafeInteger(input.dataVersion) ||
    input.dataVersion < 1 ||
    typeof input.label !== 'string' ||
    !input.label.trim() ||
    input.label.length > 100 ||
    ![input.author, input.attribution].every(
      (s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 2000,
    ) ||
    (input.parameters !== undefined &&
      (!input.parameters ||
        typeof input.parameters !== 'object' ||
        Array.isArray(input.parameters))) ||
    !placements.includes(input.placement) ||
    !Array.isArray(input.capabilities) ||
    input.capabilities.some((c) => !capabilities.includes(c)) ||
    new Set(input.capabilities).size !== input.capabilities.length ||
    ![input.defaults, input.validateSettings, input.view, input.action].every(
      (f) => typeof f === 'function',
    )
  )
    throw new Error('Invalid feature definition.');
  const params = input.parameters ?? {};
  const controls = Object.keys(params).length
    ? defineNumericModule({
        id: input.id,
        apiVersion: input.apiVersion,
        dataVersion: input.dataVersion,
        label: input.label,
        category: 'feature',
        parameters: params,
      }).parameters
    : {};
  const defaults = structuredClone(input.defaults());
  const settingsValidator = input.validateSettings;
  const validate = (value: unknown) => {
    validateEngineData(value);
    settingsValidator(value);
  };
  validate(defaults);
  for (const [key, p] of Object.entries(controls))
    if ((defaults as Record<string, unknown>)[key] !== p.defaultValue)
      throw new Error('Feature control default mismatch.');
  const commands = structuredClone(input.commands ?? []);
  if (!Array.isArray(commands) || commands.length > 32)
    throw new Error('Invalid feature commands.');
  for (const c of commands) {
    if (
      !c ||
      !/^[a-z][a-z0-9-]{0,79}$/.test(c.name) ||
      !['Timing', 'Routing', 'Structure', 'Events'].includes(c.group) ||
      c.scope !== 'track' ||
      ![c.description, c.snippet, c.completionTemplate, c.syntax, c.rules].every(
        (s) => typeof s === 'string' && s.length > 0 && s.length <= 4000,
      )
    )
      throw new Error('Invalid feature command metadata.');
  }
  // Capture reviewed callbacks once. Snapshot/settings copies never expose a live project.
  const definition = {
    ...input,
    capabilities: [...input.capabilities],
    parameters: controls,
    commands,
  };
  freeze(definition);
  const prepare = (snapshot: FeatureSnapshot, settings: S) => {
    const copy = structuredClone(settings);
    validate(copy);
    return { snapshot: freeze(structuredClone(snapshot)), settings: copy };
  };
  return Object.freeze({
    ...definition,
    defaults: () => structuredClone(defaults),
    validateSettings: validate,
    view(snapshot: FeatureSnapshot, settings: S) {
      const owned = prepare(snapshot, settings);
      const model = definition.view(owned.snapshot, owned.settings);
      validateFeatureView(model);
      return structuredClone(model);
    },
    action(id: string, snapshot: FeatureSnapshot, settings: S) {
      const owned = prepare(snapshot, settings);
      const request = definition.action(id, owned.snapshot, owned.settings);
      if (!request || typeof request !== 'object') throw new Error('Invalid feature action.');
      validateEngineData(request);
      if (request.type === 'load-sound') validateFourierSound(request.sound);
      if (
        (request.type === 'load-sound' || request.type === 'open-instrument') &&
        !definition.capabilities.includes('instrument')
      )
        throw new Error('Feature has no instrument action capability.');
      if (
        request.type === 'insert-command' &&
        (!definition.capabilities.includes('source') ||
          !commands.some((c) => c.name === request.name) ||
          !Number.isSafeInteger(request.expectedRevision) ||
          typeof request.targetTrack !== 'string' ||
          typeof request.targetFile !== 'string')
      )
        throw new Error('Feature has no registered source action.');
      if (!['open-instrument', 'load-sound', 'insert-command'].includes(request.type))
        throw new Error('Unknown feature action.');
      return structuredClone(request);
    },
  });
}
export function createFeatureRegistry(
  inputs: readonly FeatureDefinition<any>[],
  builtInIds: readonly string[] = [],
) {
  if (inputs.length > 64) throw new Error('Too many registered features.');
  const definitions = inputs.map(defineFeature);
  const map = new Map<string, FeatureDefinition<any>>(),
    commandNames = new Set<string>();
  for (const d of definitions) {
    if (d.id.startsWith('fourpataka:') && !builtInIds.includes(d.id))
      throw new Error('Reserved feature ID.');
    if (map.has(d.id)) throw new Error('Duplicate feature ID.');
    for (const c of d.commands ?? []) {
      if (commandNames.has(c.name)) throw new Error('Duplicate feature command.');
      commandNames.add(c.name);
    }
    map.set(d.id, d);
  }
  return Object.freeze({
    definitions: Object.freeze(definitions),
    commands: Object.freeze(definitions.flatMap((d) => d.commands ?? [])),
    get(id: string) {
      const d = map.get(id);
      if (!d) throw new Error(`Unavailable feature: ${id}.`);
      return d;
    },
  });
}

function validateFeatureView(model: FeatureView) {
  validateEngineData(model);
  if (
    !model ||
    typeof model !== 'object' ||
    Array.isArray(model) ||
    Object.keys(model).some(
      (key) =>
        !['description', 'cards', 'metricsTitle', 'metrics', 'note', 'actions'].includes(key),
    )
  )
    throw new Error('Invalid feature view.');
  const text = (s: unknown) => typeof s === 'string' && s.length <= 4096;
  const button = (b: FeatureButton) =>
    b &&
    /^[a-z][a-z0-9-]{0,79}$/.test(b.id) &&
    text(b.label) &&
    !!b.label &&
    (b.disabled === undefined || typeof b.disabled === 'boolean');
  for (const key of ['description', 'metricsTitle', 'note'] as const)
    if (model[key] !== undefined && !text(model[key])) throw new Error('Invalid feature text.');
  if (
    model.cards !== undefined &&
    (!Array.isArray(model.cards) ||
      model.cards.length > 64 ||
      model.cards.some((c) => !c || !text(c.title) || !text(c.text) || !button(c.action)))
  )
    throw new Error('Invalid feature cards.');
  if (
    model.metrics !== undefined &&
    (!Array.isArray(model.metrics) ||
      model.metrics.length > 64 ||
      model.metrics.some((m) => !m || !text(m.label) || !text(m.value)))
  )
    throw new Error('Invalid feature metrics.');
  if (
    model.actions !== undefined &&
    (!Array.isArray(model.actions) ||
      model.actions.length > 64 ||
      model.actions.some((b) => !button(b)))
  )
    throw new Error('Invalid feature buttons.');
  const ids = [
    ...(model.cards ?? []).map((c) => c.action.id),
    ...(model.actions ?? []).map((b) => b.id),
  ];
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate feature action identity.');
}
