import { definePedalModule, createMixedProcessor, MODULE_API_VERSION } from '../../index';
/** An independent, playable contribution: this file plus one assembly entry. */
export const levelPedal = definePedalModule({
  id: 'example:pedal/level',
  category: 'pedal',
  label: 'Level',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  author: 'Monykus7',
  attribution: 'FourPataka bundled tutorial source; GPL-3.0-only; see LICENSE',
  bypass: 'dry',
  nodes: 5,
  memoryBytes: 0,
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  note: 'Linear dry/wet level control. Bypass is dry unity.',
  reset: { label: 'Reset level', accessibleLabel: 'Reset level {index}' },
  parameters: {
    output: {
      label: 'output',
      description: 'Wet output gain in decibels.',
      min: -24,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
    mix: {
      label: 'mix',
      description: 'Linear wet percentage.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 100,
      update: 'continuous',
    },
  },
  latency: () => 0,
  tail: () => 0,
  exportTail: () => 0,
  create(context, params, bypassed) {
    return createMixedProcessor(context, params, bypassed, ({ input, dry, makeup, wet }) => {
      input.connect(dry);
      input.connect(makeup).connect(wet);
      return { latency: 0, tail: () => 0, update() {} };
    });
  },
});
