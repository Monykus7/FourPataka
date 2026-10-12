import { MODULE_API_VERSION } from './contracts';
import { validateFourierSound, type FourierSound } from './fourier';
export interface FourierPresetModule {
  readonly id: string;
  readonly apiVersion: number;
  readonly dataVersion: number;
  readonly libraryId: string;
  readonly scoreKey: string;
  readonly label: string;
  readonly templateVersion: number;
  readonly author: string;
  readonly attribution: string;
  readonly tags: readonly string[];
  readonly preview?: { readonly note: string; readonly noteBeats: number; readonly hint: string };
  createSound: () => FourierSound;
}
const text = (value: unknown, max: number) =>
  typeof value === 'string' && !!value.trim() && value.length <= max;
/** Capture validated pure data once, then hand each consumer an independent copy. */
export function defineFourierPreset(input: FourierPresetModule): FourierPresetModule {
  if (
    !input ||
    !text(input.id, 160) ||
    !/^[a-z][a-z0-9-]*:instrument\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(input.id) ||
    input.apiVersion !== MODULE_API_VERSION ||
    input.dataVersion !== 1 ||
    !text(input.libraryId, 100) ||
    !text(input.scoreKey, 80) ||
    !/^[A-Za-z][A-Za-z0-9_]*$/.test(input.scoreKey) ||
    !text(input.label, 100) ||
    !Number.isSafeInteger(input.templateVersion) ||
    input.templateVersion < 1 ||
    input.templateVersion > 1000000 ||
    !text(input.author, 200) ||
    !text(input.attribution, 2000) ||
    !Array.isArray(input.tags) ||
    input.tags.length > 16 ||
    !input.tags.every((tag) => text(tag, 40)) ||
    typeof input.createSound !== 'function'
  )
    throw new Error('Invalid Fourier preset definition.');
  if (
    input.preview &&
    (!/^[A-G][#b]?[0-8]$/.test(input.preview.note) ||
      !Number.isFinite(input.preview.noteBeats) ||
      input.preview.noteBeats <= 0 ||
      input.preview.noteBeats > 32 ||
      !text(input.preview.hint, 500))
  )
    throw new Error('Invalid preset preview.');
  const first = structuredClone(input.createSound()),
    second = structuredClone(input.createSound());
  // JSON validation also rejects sparse arrays/undefined values that cannot round-trip.
  validateFourierSound(JSON.parse(JSON.stringify(first)));
  validateFourierSound(JSON.parse(JSON.stringify(second)));
  if (JSON.stringify(first) !== JSON.stringify(second))
    throw new Error(`Preset factory must be deterministic: ${input.id}.`);
  return Object.freeze({
    id: input.id,
    apiVersion: input.apiVersion,
    dataVersion: input.dataVersion,
    libraryId: input.libraryId,
    scoreKey: input.scoreKey,
    label: input.label,
    templateVersion: input.templateVersion,
    author: input.author,
    attribution: input.attribution,
    tags: Object.freeze([...input.tags]),
    preview: input.preview ? Object.freeze({ ...input.preview }) : undefined,
    createSound: () => structuredClone(first),
  });
}
export function createFourierPresetRegistry(
  inputs: readonly FourierPresetModule[],
  builtInIds: readonly string[] = [],
) {
  const definitions = inputs.map(defineFourierPreset),
    ids = new Set<string>(),
    keys = new Set<string>(),
    libraryIds = new Set<string>();
  for (const definition of definitions) {
    if (definition.id.startsWith('fourpataka:') && !builtInIds.includes(definition.id))
      throw new Error('Reserved preset module ID.');
    if (
      ids.has(definition.id) ||
      keys.has(definition.scoreKey) ||
      libraryIds.has(definition.libraryId)
    )
      throw new Error('Duplicate preset identity or score key.');
    ids.add(definition.id);
    keys.add(definition.scoreKey);
    libraryIds.add(definition.libraryId);
  }
  return Object.freeze({
    definitions: Object.freeze(definitions),
    get(id: string) {
      const definition = definitions.find((d) => d.id === id);
      if (!definition) throw new Error(`Unavailable preset definition: ${id}.`);
      return definition;
    },
    createTemplates: () =>
      definitions.map((d) => ({
        id: d.libraryId,
        key: d.scoreKey,
        label: d.label,
        version: d.templateVersion,
        sound: d.createSound(),
      })),
  });
}
