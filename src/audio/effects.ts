import { pedalModules } from '../modules/assembly';
import { checkedSeconds } from '../modules';
import {
  chainTopology,
  chainMusicalSettings,
  clampPedal,
  type Chain,
  type Pedal,
} from '../core/pedals';
import { boardRoute } from '../core/board';
export interface EffectGraph {
  input: GainNode;
  output: GainNode;
  latency: number;
  tail: number;
  readonly tailActive: boolean;
  update: (pedal: Pedal, chainBypass?: boolean) => void;
  dispose: () => void;
}
export async function measureOversamplingLatency(sampleRate: number) {
  const context = new OfflineAudioContext(1, 2048, sampleRate);
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 2048, sampleRate);
  source.buffer.getChannelData(0)[256] = 0.1;
  const shaper = context.createWaveShaper();
  shaper.curve = new Float32Array([-1, 1]);
  shaper.oversample = '4x';
  source.connect(shaper).connect(context.destination);
  source.start();
  const data = (await context.startRendering()).getChannelData(0);
  let peak = 256;
  for (let i = 256; i < 512; i++) if (Math.abs(data[i]) > Math.abs(data[peak])) peak = i;
  return (peak - 256) / sampleRate;
}
export function createEffect(
  context: BaseAudioContext,
  original: Pedal,
  oversamplingLatency = 0,
  compressorLatency = 0.006,
): EffectGraph {
  const definition = pedalModules.get(original.kind);
  const environment = { sampleRate: context.sampleRate, oversamplingLatency, compressorLatency };
  if (context.sampleRate < definition.minimumSampleRate)
    throw new Error(`Unsupported sample rate for ${definition.id}.`);
  const runtime = definition.create(
    context,
    clampPedal(original).params,
    original.bypassed,
    environment,
  );
  return {
    input: runtime.input,
    output: runtime.output,
    latency: checkedSeconds(runtime.latency, definition.id),
    get tail() {
      return checkedSeconds(runtime.tail, definition.id);
    },
    get tailActive() {
      return runtime.tailActive;
    },
    update: (pedal, chainBypass = false) =>
      runtime.update(clampPedal(pedal).params, chainBypass || pedal.bypassed),
    dispose: () => runtime.dispose(),
  };
}
export interface ChainGraph {
  input: GainNode;
  output: GainNode;
  analyser: AnalyserNode;
  latency: number;
  tail: number;
  readonly activeTails: string[];
  topology: string;
  readonly musicalSettings: string;
  update: (chain: Chain, bypassOnly?: boolean) => boolean;
  dispose: () => void;
}
export function chainLatency(chain: Chain, oversamplingLatency: number, compressorLatency = 0.006) {
  const environment = { sampleRate: 48000, oversamplingLatency, compressorLatency };
  return boardRoute(chain).pedals.reduce((sum, pedal) => {
    const definition = pedalModules.get(pedal.kind);
    return sum + checkedSeconds(definition.latency(environment), definition.id);
  }, 0);
}
export function createChain(
  context: BaseAudioContext,
  chain: Chain,
  oversamplingLatency = 0,
  compressorLatency = 0.006,
): ChainGraph {
  const input = context.createGain(),
    output = context.createGain(),
    analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  const route = boardRoute(chain);
  const effects = route.pedals.map((p) =>
    createEffect(
      context,
      { ...p, bypassed: p.bypassed || chain.bypassed },
      oversamplingLatency,
      compressorLatency,
    ),
  );
  let node: AudioNode = input;
  effects.forEach((effect, i) => {
    node.connect(effect.input);
    node = effect.output;
    effect.update(route.pedals[i], chain.bypassed);
  });
  // An unplugged board has no path. Its external whole-board bypass is the
  // only dry path; visual moves and loose pedals never alter processor order.
  const disconnectedBypass = context.createGain();
  if (route.connected) node.connect(output);
  else input.connect(disconnectedBypass).connect(output);
  disconnectedBypass.gain.value = chain.bypassed ? 1 : 0;
  output.connect(analyser);
  const topology = chainTopology(chain);
  const frozen = structuredClone(chain);
  return {
    input,
    output,
    analyser,
    latency: chainLatency(chain, oversamplingLatency, compressorLatency),
    get tail() {
      return effects.reduce((sum, effect) => sum + effect.tail, 0);
    },
    get activeTails() {
      return effects.flatMap((effect, i) => (effect.tailActive ? [route.pedals[i].id] : []));
    },
    topology,
    get musicalSettings() {
      return chainMusicalSettings(frozen);
    },
    update(next, bypassOnly = false) {
      // ID matching keeps live bypass useful even when an order edit is pending.
      effects.forEach((effect, i) => {
        const original = frozen.pedals.find((p) => p.id === route.pedals[i].id)!;
        const matching = next.pedals.find((p) => p.id === original.id && p.kind === original.kind);
        const pedal = matching
          ? bypassOnly
            ? { ...original, bypassed: matching.bypassed }
            : matching
          : original;
        effect.update(pedal, next.bypassed);
        frozen.pedals[frozen.pedals.indexOf(original)] = structuredClone(pedal);
      });
      disconnectedBypass.gain.setTargetAtTime(next.bypassed ? 1 : 0, context.currentTime, 0.015);
      return topology === chainTopology(next);
    },
    dispose() {
      effects.forEach((e) => e.dispose());
      input.disconnect();
      output.disconnect();
      analyser.disconnect();
      disconnectedBypass.disconnect();
    },
  };
}

export async function measureCompressorLatency(sampleRate: number) {
  const context = new OfflineAudioContext(1, 2048, sampleRate);
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 2048, sampleRate);
  source.buffer.getChannelData(0)[256] = 0.1;
  const compressor = context.createDynamicsCompressor();
  compressor.ratio.value = 1;
  compressor.threshold.value = 0;
  compressor.knee.value = 0;
  source.connect(compressor).connect(context.destination);
  source.start();
  const data = (await context.startRendering()).getChannelData(0);
  let peak = 256;
  for (let i = 256; i < 1024; i++) if (Math.abs(data[i]) > Math.abs(data[peak])) peak = i;
  return (peak - 256) / sampleRate;
}
