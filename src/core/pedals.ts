import { clamp, SCORE_KEY } from './music';
import { boardRoute, validateBoard, type BoardLayout } from './board';
export type PedalKind = 'compressor' | 'overdrive' | 'eq' | 'delay';
export const DELAY_DEFAULTS = { time: 300, feedback: 30, output: 0, mix: 35 } as const;
// Count the first echo too. Feedback is bounded below unity; this estimates
// decay below -60 dB, not a scheduling latency that should pad other tracks.
export function delayTail(time: number, feedback: number) {
  const repeats = feedback > 0 ? Math.ceil(Math.log(0.001) / Math.log(feedback / 100)) : 0;
  return (time / 1000) * (1 + repeats);
}
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
  delay: 'Delay',
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
  delay: {
    time: [20, 2000, 10, 'ms'],
    feedback: [0, 95, 1, '%'],
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
    params:
      kind === 'compressor'
        ? { threshold: -24, ratio: 4, attack: 10, release: 250, output: 0, mix: 100 }
        : kind === 'overdrive'
          ? { drive: 6, tone: 6000, output: -6, mix: 100 }
          : kind === 'eq'
            ? { ...EQ_DEFAULTS }
            : { ...DELAY_DEFAULTS },
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
