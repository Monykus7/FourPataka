import { definePedalModule, MODULE_API_VERSION, createMixedProcessor } from '../index';

export const eqModule = definePedalModule({
  id: 'fourpataka:pedal/eq',
  category: 'pedal',
  label: 'Three-band EQ',
  legacyKind: 'eq',
  author: 'Monykus7',
  attribution: 'FourPataka source; GPL-3.0-only; see LICENSE',
  bypass: 'dry',
  nodes: 8,
  memoryBytes: 0,
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  note: 'Shelves 200 Hz / 4 kHz · mid Q 1',
  reset: { label: 'Reset to flat', accessibleLabel: 'Reset EQ {index} to flat' },
  latency: () => 0,
  tail: () => 0.1,
  exportTail: () => 0,
  create(context, params, bypassed) {
    return createMixedProcessor(
      context,
      params,
      bypassed,
      ({ input, dry, wet, makeup, own, set }) => {
        const low = context.createBiquadFilter(),
          mid = context.createBiquadFilter(),
          high = context.createBiquadFilter();
        low.type = 'lowshelf';
        mid.type = 'peaking';
        high.type = 'highshelf';
        low.frequency.value = Math.min(200, context.sampleRate * 0.49);
        high.frequency.value = Math.min(4000, context.sampleRate * 0.49);
        mid.Q.value = 1;
        input.connect(dry);
        input.connect(low).connect(mid).connect(high).connect(makeup).connect(wet);
        own(low, mid, high);
        return {
          latency: 0,
          tail: () => 0.1,
          update(p) {
            set(low.gain, p.low);
            set(mid.gain, p.mid);
            set(high.gain, p.high);
            set(mid.frequency, Math.min(p.frequency, context.sampleRate * 0.49));
          },
        };
      },
    );
  },
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  parameters: {
    low: {
      label: 'low gain',
      description: 'Low-shelf gain.',
      min: -12,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
    mid: {
      label: 'mid gain',
      description: 'Peaking mid-band gain.',
      min: -12,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
    high: {
      label: 'high gain',
      description: 'High-shelf gain.',
      min: -12,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
    frequency: {
      label: 'mid frequency',
      description: 'Mid-band center frequency.',
      min: 150,
      max: 4000,
      step: 10,
      unit: 'Hz',
      defaultValue: 1000,
      update: 'continuous',
    },
    output: {
      label: 'output',
      description: 'Post-EQ output trim.',
      min: -24,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
    mix: {
      label: 'mix',
      description: 'Linear wet percentage; zero is dry.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 100,
      update: 'continuous',
    },
  },
});
