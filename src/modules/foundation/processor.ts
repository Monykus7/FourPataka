import { dbGain, type PedalRuntime } from './pedals';

export interface ProcessorPorts {
  input: GainNode;
  output: GainNode;
  dry: GainNode;
  wet: GainNode;
  makeup: GainNode;
  own: (...nodes: AudioNode[]) => void;
  set: (parameter: AudioParam, value: number) => void;
}
export interface ProcessorBehavior {
  update: (params: Record<string, number>, bypassed: boolean) => void;
  latency: number;
  tail: (params: Record<string, number>) => number;
  tailActive?: (params: Record<string, number>, bypassed: boolean) => boolean;
  drain?: boolean;
}
/** Shared linear mix/trim and owned cleanup, identical for live and offline graphs. */
export function createMixedProcessor(
  context: BaseAudioContext,
  initial: Record<string, number>,
  bypassed: boolean,
  setup: (ports: ProcessorPorts) => ProcessorBehavior,
): PedalRuntime {
  const input = context.createGain(),
    output = context.createGain(),
    dry = context.createGain(),
    wet = context.createGain(),
    makeup = context.createGain();
  dry.connect(output);
  wet.connect(output);
  const nodes: AudioNode[] = [input, output, dry, wet, makeup];
  let initialized = false,
    disposed = false,
    settings = { ...initial },
    bypass = bypassed;
  let behavior: ProcessorBehavior;
  const cleanup = () =>
    nodes.forEach((node) => {
      // Modulation sources must actually stop, not merely lose their output edge.
      if ('stop' in node && typeof node.stop === 'function') {
        try {
          node.stop();
        } catch {
          /* A setup failure may precede start(). */
        }
      }
      node.disconnect();
    });
  try {
    behavior = setup({
      input,
      output,
      dry,
      wet,
      makeup,
      own: (...owned) => nodes.push(...owned),
      set: (parameter, value) => {
        // Set initial values directly; subsequent edits smooth on the audio clock.
        if (!initialized) parameter.value = value;
        else parameter.setTargetAtTime(value, context.currentTime, 0.015);
      },
    });
  } catch (error) {
    cleanup();
    throw error;
  }
  const set = (parameter: AudioParam, value: number) => {
    if (!initialized) parameter.value = value;
    else parameter.setTargetAtTime(value, context.currentTime, 0.015);
  };
  const update = (params: Record<string, number>, nextBypass: boolean) => {
    if (disposed) return;
    settings = { ...params };
    bypass = nextBypass;
    behavior.update(settings, bypass);
    set(makeup.gain, dbGain(settings.output));
    const mix = behavior.drain ? settings.mix / 100 : bypass ? 0 : settings.mix / 100;
    set(dry.gain, behavior.drain && bypass ? 1 : 1 - mix);
    set(wet.gain, mix);
    initialized = true;
  };
  try {
    update(initial, bypassed);
  } catch (error) {
    cleanup();
    throw error;
  }
  return {
    input,
    output,
    latency: behavior.latency,
    get tail() {
      return behavior.tail(settings);
    },
    get tailActive() {
      return !disposed && !!behavior.tailActive?.(settings, bypass);
    },
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      cleanup();
    },
  };
}
