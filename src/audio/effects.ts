import { dbToGain } from '../core/music';
import { chainTopology, clampPedal, EQ_SHAPE, type Chain, type Pedal } from '../core/pedals';
export interface EffectGraph {
  input: GainNode;
  output: GainNode;
  latency: number;
  tail: number;
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
// Compressor's specified 6ms pre-delay is matched in its dry branch.
// https://www.w3.org/TR/webaudio-1.0/#dynamicscompressornode-processing
export function createEffect(
  context: BaseAudioContext,
  original: Pedal,
  oversamplingLatency = 0,
  compressorLatency = 0.006,
): EffectGraph {
  const input = context.createGain(),
    output = context.createGain();
  const dry = context.createGain(),
    wet = context.createGain(),
    makeup = context.createGain();
  dry.connect(output);
  wet.connect(output);
  const nodes: AudioNode[] = [input, output, dry, wet, makeup];
  let compressor: DynamicsCompressorNode | null = null,
    compressed: GainNode | null = null,
    unity: GainNode | null = null,
    drive: GainNode | null = null,
    tone: BiquadFilterNode | null = null;
  let equalizer: { low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode } | null =
    null;
  if (original.kind === 'compressor') {
    compressor = context.createDynamicsCompressor();
    compressor.knee.value = 30;
    const align = context.createDelay(0.1);
    align.delayTime.value = compressorLatency;
    input.connect(align).connect(dry);
    compressed = context.createGain();
    unity = context.createGain();
    input.connect(compressor).connect(compressed).connect(makeup).connect(wet);
    align.connect(unity).connect(makeup);
    nodes.push(align, compressor, compressed, unity);
  } else if (original.kind === 'eq') {
    const low = context.createBiquadFilter(),
      mid = context.createBiquadFilter(),
      high = context.createBiquadFilter();
    low.type = 'lowshelf';
    mid.type = 'peaking';
    high.type = 'highshelf';
    low.frequency.value = Math.min(EQ_SHAPE.lowFrequency, context.sampleRate * 0.49);
    high.frequency.value = Math.min(EQ_SHAPE.highFrequency, context.sampleRate * 0.49);
    mid.Q.value = EQ_SHAPE.midQ;
    input.connect(dry);
    input.connect(low).connect(mid).connect(high).connect(makeup).connect(wet);
    equalizer = { low, mid, high };
    nodes.push(low, mid, high);
  } else {
    // Both dry and wet use the same 4x resampling filters, including bypass.
    // Scale the identity branch so source peaks above 1 are not hard-clipped.
    const normalize = context.createGain(),
      restore = context.createGain(),
      identity = context.createWaveShaper();
    normalize.gain.value = 1 / 65536;
    restore.gain.value = 65536;
    identity.curve = new Float32Array([-1, 1]);
    identity.oversample = '4x';
    input.connect(normalize).connect(identity).connect(restore).connect(dry);
    drive = context.createGain();
    tone = context.createBiquadFilter();
    tone.type = 'lowpass';
    tone.Q.value = 0.707;
    const shaper = context.createWaveShaper();
    shaper.oversample = '4x';
    shaper.curve = Float32Array.from({ length: 4097 }, (_, i) =>
      Math.tanh(8 * ((2 * i) / 4096 - 1)),
    );
    input.connect(drive).connect(shaper).connect(tone).connect(makeup).connect(wet);
    nodes.push(normalize, restore, identity, drive, tone, shaper);
  }
  let initialized = false;
  const set = (param: AudioParam, value: number) => {
    if (!initialized) param.value = value;
    else param.setTargetAtTime(value, context.currentTime, 0.015);
  };
  const update = (source: Pedal, chainBypass = false) => {
    const pedal = clampPedal(source),
      p = pedal.params;
    if (compressor) {
      // Native compressor recovery state can attenuate a newly created unity
      // ratio graph. Use the aligned identity path at 1:1 for exact unity.
      set(compressed!.gain, p.ratio === 1 ? 0 : 1);
      set(unity!.gain, p.ratio === 1 ? 1 : 0);
      set(compressor.threshold, p.threshold);
      set(compressor.ratio, p.ratio);
      set(compressor.attack, p.attack / 1000);
      set(compressor.release, p.release / 1000);
    }
    if (drive && tone) {
      set(drive.gain, dbToGain(p.drive) / 8);
      set(tone.frequency, Math.min(p.tone, context.sampleRate * 0.49));
    }
    if (equalizer) {
      set(equalizer.low.gain, p.low);
      set(equalizer.mid.gain, p.mid);
      set(equalizer.high.gain, p.high);
      set(equalizer.mid.frequency, Math.min(p.frequency, context.sampleRate * 0.49));
    }
    set(makeup.gain, dbToGain(p.output));
    const mix = chainBypass || pedal.bypassed ? 0 : p.mix / 100;
    set(dry.gain, 1 - mix);
    set(wet.gain, mix);
    initialized = true;
  };
  update(original);
  return {
    input,
    output,
    // EQ changes frequency-dependent phase, but adds no scheduling/look-ahead
    // delay. Padding it like an oversampled shaper would misalign track starts.
    latency: compressor ? compressorLatency : equalizer ? 0 : oversamplingLatency,
    tail: compressor ? compressorLatency : equalizer ? 0.1 : oversamplingLatency + 0.1,
    update,
    dispose: () => nodes.forEach((n) => n.disconnect()),
  };
}
export interface ChainGraph {
  input: GainNode;
  output: GainNode;
  analyser: AnalyserNode;
  latency: number;
  tail: number;
  topology: string;
  update: (chain: Chain, bypassOnly?: boolean) => boolean;
  dispose: () => void;
}
export function chainLatency(chain: Chain, oversamplingLatency: number, compressorLatency = 0.006) {
  return chain.pedals.reduce(
    (sum, p) =>
      sum +
      (p.kind === 'compressor' ? compressorLatency : p.kind === 'eq' ? 0 : oversamplingLatency),
    0,
  );
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
  const effects = chain.pedals.map((p) =>
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
    effect.update(chain.pedals[i], chain.bypassed);
  });
  node.connect(output);
  output.connect(analyser);
  const topology = chainTopology(chain);
  let frozen = structuredClone(chain);
  return {
    input,
    output,
    analyser,
    latency: chainLatency(chain, oversamplingLatency, compressorLatency),
    tail: effects.reduce((sum, effect) => sum + effect.tail, 0),
    topology,
    update(next, bypassOnly = false) {
      // ID matching keeps live bypass useful even when an order edit is pending.
      effects.forEach((effect, i) => {
        const matching = next.pedals.find(
          (p) => p.id === frozen.pedals[i].id && p.kind === frozen.pedals[i].kind,
        );
        const pedal = matching
          ? bypassOnly
            ? { ...frozen.pedals[i], bypassed: matching.bypassed }
            : matching
          : frozen.pedals[i];
        effect.update(pedal, next.bypassed);
        frozen.pedals[i] = structuredClone(pedal);
      });
      return topology === chainTopology(next);
    },
    dispose() {
      effects.forEach((e) => e.dispose());
      input.disconnect();
      output.disconnect();
      analyser.disconnect();
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
