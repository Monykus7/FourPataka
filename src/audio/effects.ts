import { dbToGain } from '../core/music';
import {
  chainTopology,
  chainMusicalSettings,
  clampPedal,
  EQ_SHAPE,
  delayTail,
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
  let echo: {
    delay: DelayNode;
    loop: DelayNode;
    feed: GainNode;
    feedback: GainNode;
    meter: AnalyserNode;
  } | null = null;
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
  } else if (original.kind === 'delay') {
    const delay = context.createDelay(2),
      loop = context.createDelay(2),
      sum = context.createGain(),
      feed = context.createGain(),
      feedback = context.createGain(),
      meter = context.createAnalyser();
    meter.fftSize = 2048;
    // Gate only new input. Bypass leaves the delay/feedback loop and its wet
    // output alive, so stored echoes decay while new notes pass at dry unity.
    input.connect(dry);
    input.connect(feed).connect(delay).connect(sum);
    sum.connect(feedback).connect(loop).connect(sum);
    sum.connect(makeup).connect(wet);
    feed.connect(meter);
    feedback.connect(meter);
    echo = { delay, loop, feed, feedback, meter };
    nodes.push(delay, loop, sum, feed, feedback, meter);
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
  let settings = clampPedal(original),
    bypassed = original.bypassed,
    tailUntil = 0;
  const tailSamples = new Float32Array(2048);
  const set = (param: AudioParam, value: number) => {
    if (!initialized) param.value = value;
    else param.setTargetAtTime(value, context.currentTime, 0.015);
  };
  const update = (source: Pedal, chainBypass = false) => {
    const pedal = clampPedal(source),
      p = pedal.params;
    settings = pedal;
    bypassed = chainBypass || pedal.bypassed;
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
    if (echo) {
      set(echo.delay.delayTime, p.time / 1000);
      // Chromium's cycle breaker adds one 128-frame render quantum per loop
      // (verified with impulses at 44.1/48 kHz). Keep the first echo outside the
      // cycle and subtract that quantum only from repeats to maintain cadence.
      set(echo.loop.delayTime, Math.max(0, p.time / 1000 - 128 / context.sampleRate));
      set(echo.feedback.gain, p.feedback / 100);
      set(echo.feed.gain, bypassed ? 0 : 1);
    }
    set(makeup.gain, dbToGain(p.output));
    const mix = echo ? p.mix / 100 : bypassed ? 0 : p.mix / 100;
    set(dry.gain, echo && bypassed ? 1 : 1 - mix);
    set(wet.gain, mix);
    initialized = true;
  };
  update(original);
  return {
    input,
    output,
    // EQ changes frequency-dependent phase, but adds no scheduling/look-ahead
    // delay. Padding it like an oversampled shaper would misalign track starts.
    latency: compressor ? compressorLatency : equalizer || echo ? 0 : oversamplingLatency,
    get tail() {
      return echo
        ? delayTail(settings.params.time, settings.params.feedback)
        : compressor
          ? compressorLatency
          : equalizer
            ? 0.1
            : oversamplingLatency + 0.1;
    },
    get tailActive() {
      if (!echo) return false;
      // Watch the loop input, including feedback, to bridge silent gaps between
      // echoes. This is measured activity, not merely the saved bypass setting.
      echo.meter.getFloatTimeDomainData(tailSamples);
      if (tailSamples.some((sample) => Math.abs(sample) > 0.001))
        tailUntil = context.currentTime + settings.params.time / 1000 + 0.05;
      return bypassed && settings.params.mix > 0 && context.currentTime < tailUntil;
    },
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
  readonly activeTails: string[];
  topology: string;
  readonly musicalSettings: string;
  update: (chain: Chain, bypassOnly?: boolean) => boolean;
  dispose: () => void;
}
export function chainLatency(chain: Chain, oversamplingLatency: number, compressorLatency = 0.006) {
  return boardRoute(chain).pedals.reduce(
    (sum, p) =>
      sum +
      (p.kind === 'compressor'
        ? compressorLatency
        : p.kind === 'overdrive'
          ? oversamplingLatency
          : 0),
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
