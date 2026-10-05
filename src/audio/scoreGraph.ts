import type { TrackInstance } from '../core/project';
import { emptyChain, chainMusicalSettings, type Processing } from '../core/pedals';
import { createChain, chainLatency, type ChainGraph } from './effects';

// Both playback and export consume applied copies, never library templates or
// the audition sandbox. Shorter track paths are padded before the master bus.
export function createScoreGraph(
  context: BaseAudioContext,
  destination: AudioNode,
  tracks: TrackInstance[],
  processing: Processing | undefined,
  oversamplingLatency: number,
  compressorLatency: number,
) {
  const chains = new Map<string, ChainGraph>();
  const settings = new Map<string, string>();
  const buses = new Map<string, GainNode>();
  const nodes: AudioNode[] = [];
  const masterChain = processing?.master ?? emptyChain();
  const master = createChain(context, masterChain, oversamplingLatency, compressorLatency);
  master.output.connect(destination);
  chains.set('master', master);
  settings.set('master', chainMusicalSettings(masterChain));
  const maxLatency = Math.max(
    0,
    ...tracks.map((t) =>
      chainLatency(
        processing?.tracks[t.key] ?? emptyChain(),
        oversamplingLatency,
        compressorLatency,
      ),
    ),
  );
  let tail = master.tail;
  tracks.forEach((track) => {
    const chain = processing?.tracks[track.key] ?? emptyChain();
    const graph = createChain(context, chain, oversamplingLatency, compressorLatency);
    const bus = context.createGain();
    bus.gain.value = track.level;
    const align = context.createDelay(1);
    align.delayTime.value = Math.max(0, maxLatency - graph.latency);
    graph.output.connect(bus).connect(align).connect(master.input);
    tail = Math.max(tail, master.tail + graph.tail + align.delayTime.value);
    chains.set('track:' + track.key, graph);
    settings.set('track:' + track.key, chainMusicalSettings(chain));
    nodes.push(bus, align);
    buses.set(track.key, graph.input);
  });
  return {
    chains,
    settings,
    buses,
    nodes,
    tail,
    latency: maxLatency + master.latency,
    dispose() {
      chains.forEach((chain) => chain.dispose());
      nodes.forEach((node) => node.disconnect());
    },
  };
}
