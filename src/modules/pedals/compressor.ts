import {
  definePedalModule,
  MODULE_API_VERSION,
  createMixedProcessor,
  dbGain,
  delayTailSeconds,
} from '../index';
export const compressorModule = definePedalModule({
  id: 'fourpataka:pedal/compressor',
  category: 'pedal',
  legacyKind: 'compressor',
  label: 'Compressor',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  author: 'Monykus7',
  attribution: 'FourPataka source; GPL-3.0-only; see LICENSE',
  bypass: 'dry',
  nodes: 9,
  memoryBytes: 0,
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  parameters: {
    threshold: {
      label: 'threshold',
      description: 'Compressor threshold in dB.',
      min: -60,
      max: 0,
      step: 1,
      unit: 'dB',
      defaultValue: -24,
      update: 'continuous',
    },
    ratio: {
      label: 'ratio',
      description: 'Compressor ratio in :1.',
      min: 1,
      max: 20,
      step: 0.1,
      unit: ':1',
      defaultValue: 4,
      update: 'continuous',
    },
    attack: {
      label: 'attack',
      description: 'Compressor attack in ms.',
      min: 0,
      max: 100,
      step: 1,
      unit: 'ms',
      defaultValue: 10,
      update: 'continuous',
    },
    release: {
      label: 'release',
      description: 'Compressor release in ms.',
      min: 10,
      max: 2000,
      step: 10,
      unit: 'ms',
      defaultValue: 250,
      update: 'continuous',
    },
    output: {
      label: 'output',
      description: 'Compressor output in dB.',
      min: -24,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
    mix: {
      label: 'mix',
      description: 'Compressor mix in %.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 100,
      update: 'continuous',
    },
  },
  latency: (environment) => environment.compressorLatency,
  tail: (params, environment) => environment.compressorLatency,
  exportTail: (params) => 0,
  create(context, params, bypassed, environment) {
    return createMixedProcessor(
      context,
      params,
      bypassed,
      ({ input, output, dry, wet, makeup, own, set }) => {
        const compressor = context.createDynamicsCompressor();
        compressor.knee.value = 30;
        const align = context.createDelay(0.1);
        align.delayTime.value = environment.compressorLatency;
        input.connect(align).connect(dry);
        const compressed = context.createGain(),
          unity = context.createGain();
        input.connect(compressor).connect(compressed).connect(makeup).connect(wet);
        align.connect(unity).connect(makeup);
        own(align, compressor, compressed, unity);
        return {
          latency: environment.compressorLatency,
          tail: () => environment.compressorLatency,
          update(p) {
            // Aligned identity at 1:1 avoids native compressor recovery attenuation.
            set(compressed.gain, p.ratio === 1 ? 0 : 1);
            set(unity.gain, p.ratio === 1 ? 1 : 0);
            set(compressor.threshold, p.threshold);
            set(compressor.ratio, p.ratio);
            set(compressor.attack, p.attack / 1000);
            set(compressor.release, p.release / 1000);
          },
        };
      },
    );
  },
});
