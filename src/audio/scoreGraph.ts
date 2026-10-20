import { createChamber } from './chamber';
import type { TrackInstance } from '../core/project';
import { emptyChain, chainMusicalSettings, type Processing } from '../core/pedals';
import { createChain, chainLatency, chainResources, type ChainGraph } from './effects';

// Both playback and export consume applied copies, never library templates or
// the audition sandbox. Shorter track paths are padded before the master bus.
export function createScoreGraph(
  context: BaseAudioContext,
  destination: AudioNode,
  tracks: TrackInstance[],
  processing: Processing | undefined,
  oversamplingLatency: number,
  compressorLatency: number,
  timeOrigin = 0,
) {
  const chambers = new Map<string, ReturnType<typeof createChamber>>();
  const chains = new Map<string, ChainGraph>();
  const settings = new Map<string, string>();
  const buses = new Map<string, GainNode>();
  const nodes: AudioNode[] = [];
  const masterChain = processing?.master ?? emptyChain();
  // Preflight every routed track before creating any nodes, so a missing module
  // cannot leave a partly constructed master/track graph running after failure.
  for (const chain of [
    masterChain,
    ...tracks.map((t) => processing?.tracks[t.key] ?? emptyChain()),
  ]) {
    chainResources(chain, context.sampleRate);
    chainLatency(chain, oversamplingLatency, compressorLatency, context.sampleRate);
  }
  const master = createChain(
    context,
    masterChain,
    oversamplingLatency,
    compressorLatency,
    timeOrigin,
  );
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
        context.sampleRate,
      ),
    ),
  );
  const paths = new Map<string, { graph: ChainGraph; align: DelayNode }>();
  tracks.forEach((track) => {
    const chain = processing?.tracks[track.key] ?? emptyChain();
    const graph = createChain(context, chain, oversamplingLatency, compressorLatency, timeOrigin);
    const bus = context.createGain();
    bus.gain.value = track.level;
    const align = context.createDelay(1);
    align.delayTime.value = Math.max(0, maxLatency - graph.latency);
    graph.output.connect(bus).connect(align).connect(master.input);

    chains.set('track:' + track.key, graph);
    settings.set('track:' + track.key, chainMusicalSettings(chain));
    nodes.push(bus, align);
    const chamber = createChamber(context, track.sound.acoustics);
    chamber.output.connect(graph.input);
    chambers.set(track.key, chamber);
    paths.set(track.key, { graph, align });
    buses.set(track.key, chamber.input);
  });
  return {
    chambers,
    chains,
    settings,
    buses,
    nodes,
    get tail() {
      return (
        master.tail +
        Math.max(
          0,
          ...[...paths].map(
            ([key, path]) => path.graph.tail + path.align.delayTime.value + chambers.get(key)!.tail,
          ),
        )
      );
    },
    latency: maxLatency + master.latency,
    dispose() {
      chambers.forEach((chamber) => chamber.dispose());
      chains.forEach((chain) => chain.dispose());
      nodes.forEach((node) => node.disconnect());
    },
  };
}
