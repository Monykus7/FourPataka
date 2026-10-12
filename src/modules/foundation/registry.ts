import { MODULE_API_VERSION, type NumericModuleDefinition, type ModuleRegistry } from './contracts';

const categories = ['pedal', 'instrument', 'engine', 'feature'];
const units = ['dB', 'Hz', 'ms', 's', '%', ':1', 'linear', 'cents'];
const record = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Copy then freeze validated metadata: caller edits cannot alter the assembled registry. */
export function defineNumericModule(input: NumericModuleDefinition): NumericModuleDefinition {
  if (
    !record(input) ||
    typeof input.id !== 'string' ||
    input.id.length > 160 ||
    !/^[a-z][a-z0-9-]*:(pedal|instrument|engine|feature)\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(
      input.id,
    ) ||
    !categories.includes(input.category) ||
    input.id.split(':')[1].split('/')[0] !== input.category
  )
    throw new Error('Invalid module identity/category.');
  if (input.apiVersion !== MODULE_API_VERSION)
    throw new Error(`Unsupported module API for ${input.id}: ${input.apiVersion}.`);
  if (!Number.isSafeInteger(input.dataVersion) || input.dataVersion < 1)
    throw new Error(`Invalid data version for ${input.id}.`);
  if (
    typeof input.label !== 'string' ||
    !input.label.trim() ||
    input.label.length > 100 ||
    !record(input.parameters) ||
    !Object.keys(input.parameters).length ||
    Object.keys(input.parameters).length > 64
  )
    throw new Error(`Invalid module metadata for ${input.id}.`);
  const parameters = Object.fromEntries(
    Object.entries(input.parameters).map(([key, p]) => {
      if (
        !/^[a-z][A-Za-z0-9]{0,79}$/.test(key) ||
        ['constructor', 'prototype', '__proto__'].includes(key) ||
        !record(p) ||
        typeof p.label !== 'string' ||
        !p.label.trim() ||
        p.label.length > 100 ||
        typeof p.description !== 'string' ||
        !p.description.trim() ||
        p.description.length > 1000 ||
        ![p.min, p.max, p.step, p.defaultValue].every(Number.isFinite) ||
        p.min >= p.max ||
        !Number.isFinite(p.max - p.min) ||
        p.step <= 0 ||
        p.step > p.max - p.min ||
        p.defaultValue < p.min ||
        p.defaultValue > p.max ||
        !units.includes(p.unit) ||
        !['continuous', 'replay'].includes(p.update)
      )
        throw new Error(`Invalid parameter ${input.id}.${key}.`);
      // Only declared serializable fields cross this contract, never functions/nodes.
      return [
        key,
        Object.freeze({
          label: p.label,
          description: p.description,
          min: p.min,
          max: p.max,
          step: p.step,
          unit: p.unit,
          defaultValue: p.defaultValue,
          update: p.update,
        }),
      ];
    }),
  );
  return Object.freeze({
    id: input.id,
    category: input.category,
    label: input.label,
    apiVersion: input.apiVersion,
    dataVersion: input.dataVersion,
    parameters: Object.freeze(parameters),
  });
}

export function createModuleRegistry(
  definitions: readonly NumericModuleDefinition[],
  options: { builtInIds?: readonly string[] } = {},
): ModuleRegistry {
  const byId = new Map<string, NumericModuleDefinition>();
  const builtIns = new Set(options.builtInIds ?? []);
  for (const input of definitions) {
    const definition = defineNumericModule(input);
    if (definition.id.startsWith('fourpataka:') && !builtIns.has(definition.id))
      throw new Error(`Reserved built-in module ID: ${definition.id}.`);
    if (byId.has(definition.id)) throw new Error(`Duplicate module ID: ${definition.id}.`);
    byId.set(definition.id, definition);
  }
  return Object.freeze({
    definitions: Object.freeze([...byId.values()]),
    get(id: string) {
      const definition = byId.get(id);
      if (!definition) throw new Error(`Unavailable module: ${id}.`);
      return definition;
    },
  });
}

/** Each destination receives a fresh data record, never the immutable definition itself. */
export function defaultModuleSettings(definition: NumericModuleDefinition): Record<string, number> {
  return Object.fromEntries(
    Object.entries(definition.parameters).map(([key, p]) => [key, p.defaultValue]),
  );
}

export function validateModuleSettings(
  definition: NumericModuleDefinition,
  settings: unknown,
  dataVersion = definition.dataVersion,
): asserts settings is Record<string, number> {
  if (dataVersion !== definition.dataVersion)
    throw new Error(`Unsupported settings version for ${definition.id}: ${dataVersion}.`);
  if (
    !record(settings) ||
    Object.keys(settings).length !== Object.keys(definition.parameters).length
  )
    throw new Error(`Invalid settings for ${definition.id}.`);
  for (const [key, p] of Object.entries(definition.parameters))
    if (
      !Object.hasOwn(settings, key) ||
      typeof settings[key] !== 'number' ||
      !Number.isFinite(settings[key]) ||
      settings[key] < p.min ||
      settings[key] > p.max
    )
      throw new Error(`Invalid setting ${definition.id}.${key}.`);
  // Step is a UI increment, not an import quantization rule: preserve valid fractional values.
}

export function moduleControlRanges(definition: NumericModuleDefinition) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(definition.parameters).map(([key, p]) => [
        key,
        Object.freeze([p.min, p.max, p.step, p.unit] as const),
      ]),
    ),
  );
}
