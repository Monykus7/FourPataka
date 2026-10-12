import { clamp, SCORE_KEY } from './music';
import { boardRoute, validateBoard, type BoardLayout } from './board';
import { pedalModules } from '../modules/assembly';
import { defaultModuleSettings, moduleControlRanges, delayTailSeconds } from '../modules';
export type PedalKind = string;
export const delayTail = delayTailSeconds;
export const DELAY_DEFAULTS = Object.freeze(defaultModuleSettings(pedalModules.get('delay')));
export const EQ_SHAPE = { lowFrequency: 200, highFrequency: 4000, midQ: 1 } as const;
export const EQ_DEFAULTS = Object.freeze(defaultModuleSettings(pedalModules.get('eq')));
export const PEDAL_KINDS = Object.freeze(pedalModules.definitions.map((d) => d.legacyKind ?? d.id));
export const PEDAL_NAMES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(pedalModules.definitions.map((d) => [d.legacyKind ?? d.id, d.label])),
);
export const PEDAL_CONTROLS: Readonly<Record<string, ReturnType<typeof moduleControlRanges>>> =
  Object.freeze(
    Object.fromEntries(
      pedalModules.definitions.map((d) => [d.legacyKind ?? d.id, moduleControlRanges(d)]),
    ),
  );
export const pedalName = (kind: string) => PEDAL_NAMES[kind] ?? `Unavailable: ${kind}`;
export interface Pedal {
  id: string;
  kind: PedalKind;
  bypassed: boolean;
  params: Record<string, number>;
}
export interface Chain {
  pedals: Pedal[];
  bypassed: boolean;
  board?: BoardLayout;
}
export interface ChainInstance extends Chain {
  presetId: string | null;
  assignmentKey?: string | null;
}
export interface ChainPreset {
  id: string;
  key: string;
  label: string;
  chain: Chain;
}
export function nextChainKey(label: string, used: string[]) {
  const words = label.match(/[A-Za-z0-9]+/g) ?? ['chain'];
  let base = words
    .map((word, i) =>
      i ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase(),
    )
    .join('')
    .slice(0, 80);
  if (!/^[A-Za-z]/.test(base)) base = 'chain' + base;
  let key = base,
    suffix = 2;
  while (used.includes(key)) key = base + suffix++;
  return key;
}
export interface Processing {
  library: ChainPreset[];
  audition: { A: ChainInstance; B: ChainInstance };
  master: ChainInstance;
  tracks: Record<string, ChainInstance>;
}
export const emptyChain = (): ChainInstance => ({ presetId: null, bypassed: false, pedals: [] });
export function makePedal(kind: PedalKind): Pedal {
  return {
    id: crypto.randomUUID(),
    kind,
    bypassed: false,
    params: defaultModuleSettings(pedalModules.get(kind)),
  };
}
export function defaultProcessing(): Processing {
  return {
    library: [
      { id: 'clean', key: 'clean', label: 'Clean', chain: { pedals: [], bypassed: false } },
      {
        id: 'clean-glue',
        key: 'cleanGlue',
        label: 'Clean glue',
        chain: { pedals: [makePedal('compressor')], bypassed: false },
      },
      {
        id: 'warm-drive',
        key: 'warmDrive',
        label: 'Warm drive',
        chain: { pedals: [makePedal('overdrive')], bypassed: false },
      },
    ],
    audition: { A: emptyChain(), B: emptyChain() },
    master: emptyChain(),
    tracks: {},
  };
}
export function clampPedal(pedal: Pedal): Pedal {
  return {
    ...pedal,
    params: Object.fromEntries(
      Object.entries(PEDAL_CONTROLS[pedal.kind]).map(([key, [min, max]]) => [
        key,
        clamp(Number.isFinite(pedal.params[key]) ? pedal.params[key] : min, min, max),
      ]),
    ),
  };
}
export function validateChain(value: unknown): asserts value is ChainInstance {
  const chain = value as ChainInstance;
  if (
    !chain ||
    typeof chain.bypassed !== 'boolean' ||
    !Array.isArray(chain.pedals) ||
    chain.pedals.length > 8
  )
    throw new Error('Invalid pedal chain (maximum 8 pedals).');
  if (
    chain.presetId !== undefined &&
    chain.presetId !== null &&
    (typeof chain.presetId !== 'string' || chain.presetId.length > 100)
  )
    throw new Error('Invalid chain preset reference.');
  if (
    chain.assignmentKey !== undefined &&
    chain.assignmentKey !== null &&
    (typeof chain.assignmentKey !== 'string' ||
      chain.assignmentKey.length > 100 ||
      !SCORE_KEY.test(chain.assignmentKey))
  )
    throw new Error('Invalid score chain assignment.');
  const ids = new Set<string>();
  chain.pedals.forEach((p) => {
    if (
      !p ||
      !Object.hasOwn(PEDAL_CONTROLS, p.kind) ||
      typeof p.id !== 'string' ||
      !p.id ||
      p.id.length > 100 ||
      ids.has(p.id) ||
      typeof p.bypassed !== 'boolean' ||
      !p.params ||
      typeof p.params !== 'object'
    )
      throw new Error('Invalid pedal instance.');
    ids.add(p.id);
    Object.entries(PEDAL_CONTROLS[p.kind]).forEach(([key, [min, max]]) => {
      const n = p.params[key];
      if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Invalid pedal ${key}.`);
    });
  });
  if (chain.board !== undefined) validateBoard(chain.board, [...ids]);
}
export function importProcessing(value: unknown): Processing {
  if (value === undefined) return defaultProcessing();
  const p = value as Processing;
  if (
    !p ||
    !Array.isArray(p.library) ||
    !p.library.length ||
    p.library.length > 128 ||
    !p.audition ||
    !p.tracks ||
    typeof p.tracks !== 'object' ||
    Array.isArray(p.tracks)
  )
    throw new Error('Invalid processing settings.');
  const ids = new Set<string>();
  // Reserve explicit keys first: migrating a legacy label must never steal a
  // key already referenced by score text elsewhere in the imported library.
  const keys: string[] = [];
  p.library.forEach((preset) => {
    if (preset?.key !== undefined) {
      if (
        typeof preset.key !== 'string' ||
        preset.key.length > 100 ||
        !SCORE_KEY.test(preset.key) ||
        keys.includes(preset.key)
      )
        throw new Error('Pedal score keys must be valid and unique.');
      keys.push(preset.key);
    }
  });
  const migratedKeys = new Map<string, string>();
  p.library.forEach((preset) => {
    if (
      !preset ||
      typeof preset.id !== 'string' ||
      !preset.id ||
      preset.id.length > 100 ||
      ids.has(preset.id) ||
      typeof preset.label !== 'string' ||
      !preset.label.trim() ||
      preset.label.length > 100
    )
      throw new Error('Invalid chain preset.');
    ids.add(preset.id);
    const key = preset.key ?? nextChainKey(preset.label, keys);
    migratedKeys.set(preset.id, key);
    if (preset.key === undefined) keys.push(key);
    validateChain(preset.chain);
  });
  [p.audition.A, p.audition.B, p.master, ...Object.values(p.tracks)].forEach((instance) => {
    validateChain(instance);
    if (instance.presetId !== null && !ids.has(instance.presetId))
      throw new Error('Missing chain preset reference.');
  });
  const instance = (chain: ChainInstance): ChainInstance => ({
    presetId: chain.presetId,
    ...(chain.assignmentKey !== undefined ? { assignmentKey: chain.assignmentKey } : {}),
    bypassed: chain.bypassed,
    ...(chain.board ? { board: structuredClone(chain.board) } : {}),
    pedals: chain.pedals.map((p) =>
      clampPedal({ id: p.id, kind: p.kind, bypassed: p.bypassed, params: { ...p.params } }),
    ),
  });
  return {
    library: p.library.map((p) => ({
      id: p.id,
      key: migratedKeys.get(p.id)!,
      label: p.label,
      chain: {
        ...(p.chain.board ? { board: structuredClone(p.chain.board) } : {}),
        pedals: instance({ ...p.chain, presetId: null }).pedals,
        bypassed: p.chain.bypassed,
      },
    })),
    audition: { A: instance(p.audition.A), B: instance(p.audition.B) },
    master: instance(p.master),
    tracks: Object.fromEntries(
      Object.entries(p.tracks).map(([key, chain]) => [key, instance(chain)]),
    ),
  };
}
export function applyAssociated(processing: Processing, source: ChainInstance): Processing {
  if (!source.presetId) return processing;
  const replace = (chain: ChainInstance) =>
    chain.presetId === source.presetId ? structuredClone(source) : chain;
  return {
    ...processing,
    master: replace(processing.master),
    tracks: Object.fromEntries(
      Object.entries(processing.tracks).map(([key, chain]) => [key, replace(chain)]),
    ),
  };
}
export const chainTopology = (chain: Chain) => {
  const route = boardRoute(chain);
  return [
    route.connected ? 'connected' : 'disconnected',
    ...route.pedals.map((p) => `${p.id}:${p.kind}`),
  ].join('|');
};
export const chainMusicalSettings = (chain: Chain) => {
  const route = boardRoute(chain);
  return JSON.stringify([route.connected, route.pedals.map((p) => [p.id, p.kind, p.params])]);
};
