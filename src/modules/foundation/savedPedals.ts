import type { PedalModule } from './pedals';
import { validateModuleSettings } from './registry';
export interface ModuleReference {
  id: string;
  apiVersion: number;
  dataVersion: number;
}
export interface SavedPedal {
  id: string;
  kind: string;
  bypassed: boolean;
  params: Record<string, number>;
  module?: ModuleReference;
  unavailable?: { reason: string; original: Record<string, unknown> };
}
/** Bound opaque recovery data before copying it; project text never becomes code. */
function boundedJson(value: unknown, depth = 0): void {
  if (depth > 8) throw new Error('Unavailable module data exceeds recovery bounds.');
  if (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return;
  if (typeof value === 'string' && value.length <= 4096) return;
  if (Array.isArray(value) && value.length <= 64) {
    value.forEach((v) => boundedJson(v, depth + 1));
    return;
  }
  if (
    value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length <= 64
  ) {
    for (const [key, v] of Object.entries(value)) {
      if (key.length > 160 || ['__proto__', 'constructor', 'prototype'].includes(key))
        throw new Error('Unsafe recovery key.');
      boundedJson(v, depth + 1);
    }
    return;
  }
  throw new Error('Invalid unavailable module recovery data.');
}
export function readSavedPedal(
  input: unknown,
  find: (kind: string) => PedalModule | undefined,
): SavedPedal {
  let raw = input as SavedPedal;
  if (raw?.unavailable) {
    boundedJson(raw.unavailable.original);
    const original = raw.unavailable.original as unknown as SavedPedal;
    if (original.unavailable || original.id !== raw.id || original.kind !== raw.kind)
      throw new Error('Invalid unavailable pedal identity.');
    // Bypass is an owned host action; raw module payload remains untouched.
    raw = { ...original, bypassed: raw.bypassed };
  }
  if (
    !raw ||
    typeof raw.id !== 'string' ||
    !raw.id ||
    raw.id.length > 100 ||
    typeof raw.kind !== 'string' ||
    raw.kind.length > 160 ||
    typeof raw.bypassed !== 'boolean' ||
    !raw.params ||
    typeof raw.params !== 'object' ||
    Array.isArray(raw.params)
  )
    throw new Error('Invalid pedal instance.');
  const definition = find(raw.kind),
    reference = raw.module;
  if (
    reference &&
    (typeof reference.id !== 'string' ||
      reference.id !== (definition?.id ?? raw.kind) ||
      !/^[a-z][a-z0-9-]*:pedal\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(reference.id) ||
      !Number.isSafeInteger(reference.apiVersion) ||
      reference.apiVersion < 1 ||
      !Number.isSafeInteger(reference.dataVersion) ||
      reference.dataVersion < 1)
  )
    throw new Error('Invalid pedal module reference.');
  if (!definition && !reference)
    throw new Error('Invalid pedal instance: missing module reference.');
  if (definition && !definition.legacyKind && !reference)
    throw new Error('Missing contributed pedal module reference.');
  const unavailable =
    !definition ||
    (reference &&
      (reference.apiVersion !== definition.apiVersion ||
        reference.dataVersion !== definition.dataVersion));
  if (unavailable) {
    boundedJson(raw);
    return {
      id: raw.id,
      kind: raw.kind,
      bypassed: raw.bypassed,
      params: {},
      module: structuredClone(reference!),
      unavailable: {
        reason: !definition
          ? `Module ${raw.kind} is not registered.`
          : `Incompatible module version: ${reference!.apiVersion}/${reference!.dataVersion}.`,
        original: structuredClone(raw) as unknown as Record<string, unknown>,
      },
    };
  }
  // Legacy built-ins historically tolerated extra numeric fields; retain that import rule.
  const settings = Object.fromEntries(
    Object.keys(definition!.parameters).map((key) => [key, raw.params[key]]),
  );
  validateModuleSettings(definition!, definition!.legacyKind ? settings : raw.params);
  return {
    id: raw.id,
    kind: raw.kind,
    bypassed: raw.bypassed,
    params: { ...settings },
    ...(reference ? { module: structuredClone(reference) } : {}),
  };
}
