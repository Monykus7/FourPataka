import { clamp } from './music';
export type PedalKind = 'compressor' | 'overdrive' | 'eq';
export const EQ_SHAPE = { lowFrequency: 200, highFrequency: 4000, midQ: 1 } as const;
export const EQ_DEFAULTS = {
  low: 0,
  mid: 0,
  high: 0,
  frequency: 1000,
  output: 0,
  mix: 100,
} as const;
export const PEDAL_NAMES: Record<PedalKind, string> = {
  compressor: 'Compressor',
  overdrive: 'Overdrive',
  eq: 'Three-band EQ',
};
export const PEDAL_CONTROLS = {
  compressor: {
    threshold: [-60, 0, 1, 'dB'],
    ratio: [1, 20, 0.1, ':1'],
    attack: [0, 100, 1, 'ms'],
    release: [10, 2000, 10, 'ms'],
    output: [-24, 12, 0.5, 'dB'],
    mix: [0, 100, 1, '%'],
  },
  overdrive: {
    drive: [0, 24, 0.5, 'dB'],
    tone: [80, 16000, 20, 'Hz'],
    output: [-24, 12, 0.5, 'dB'],
    mix: [0, 100, 1, '%'],
  },
  eq: {
    low: [-12, 12, 0.5, 'dB'],
    mid: [-12, 12, 0.5, 'dB'],
    high: [-12, 12, 0.5, 'dB'],
    frequency: [150, 4000, 10, 'Hz'],
    output: [-24, 12, 0.5, 'dB'],
    mix: [0, 100, 1, '%'],
  },
} as const;
export interface Pedal {
  id: string;
  kind: PedalKind;
  bypassed: boolean;
  params: Record<string, number>;
}
export interface Chain {
  pedals: Pedal[];
  bypassed: boolean;
}
export interface ChainInstance extends Chain {
  presetId: string | null;
}
export interface ChainPreset {
  id: string;
  label: string;
  chain: Chain;
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
    params:
      kind === 'compressor'
        ? { threshold: -24, ratio: 4, attack: 10, release: 250, output: 0, mix: 100 }
        : kind === 'overdrive'
          ? { drive: 6, tone: 6000, output: -6, mix: 100 }
          : { ...EQ_DEFAULTS },
  };
}
export function defaultProcessing(): Processing {
  return {
    library: [
      { id: 'clean', label: 'Clean', chain: { pedals: [], bypassed: false } },
      {
        id: 'clean-glue',
        label: 'Clean glue',
        chain: { pedals: [makePedal('compressor')], bypassed: false },
      },
      {
        id: 'warm-drive',
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
    validateChain(preset.chain);
  });
  [p.audition.A, p.audition.B, p.master, ...Object.values(p.tracks)].forEach((instance) => {
    validateChain(instance);
    if (instance.presetId !== null && !ids.has(instance.presetId))
      throw new Error('Missing chain preset reference.');
  });
  const instance = (chain: ChainInstance): ChainInstance => ({
    presetId: chain.presetId,
    bypassed: chain.bypassed,
    pedals: chain.pedals.map((p) =>
      clampPedal({ id: p.id, kind: p.kind, bypassed: p.bypassed, params: { ...p.params } }),
    ),
  });
  return {
    library: p.library.map((p) => ({
      id: p.id,
      label: p.label,
      chain: {
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
export const chainTopology = (chain: Chain) =>
  chain.pedals.map((p) => `${p.id}:${p.kind}`).join('|');
export const chainMusicalSettings = (chain: Chain) =>
  JSON.stringify(chain.pedals.map((p) => [p.id, p.kind, p.params]));
