import {
  definePedalModule,
  MODULE_API_VERSION,
  createMixedProcessor,
  dbGain,
  delayTailSeconds,
} from '../index';
export const overdriveModule = definePedalModule({
  id: 'fourpataka:pedal/overdrive',
  category: 'pedal',
  legacyKind: 'overdrive',
  label: 'Overdrive',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  author: 'Monykus7',
  attribution: 'FourPataka source; GPL-3.0-only; see LICENSE',
  bypass: 'dry',
  nodes: 11,
  memoryBytes: 16396,
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  parameters: {
    drive: {
      label: 'drive',
      description: 'Overdrive drive in dB.',
      min: 0,
      max: 24,
      step: 0.5,
      unit: 'dB',
      defaultValue: 6,
      update: 'continuous',
    },
    tone: {
      label: 'tone',
      description: 'Overdrive tone in Hz.',
      min: 80,
      max: 16000,
      step: 20,
      unit: 'Hz',
      defaultValue: 6000,
      update: 'continuous',
    },
    output: {
      label: 'output',
      description: 'Overdrive output in dB.',
      min: -24,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: -6,
      update: 'continuous',
    },
    mix: {
      label: 'mix',
      description: 'Overdrive mix in %.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 100,
      update: 'continuous',
    },
  },
  latency: (environment) => environment.oversamplingLatency,
  tail: (params, environment) => environment.oversamplingLatency + 0.1,
  exportTail: (params) => 0,
  create(context, params, bypassed, environment) {
    return createMixedProcessor(
      context,
      params,
      bypassed,
      ({ input, output, dry, wet, makeup, own, set }) => {
        const normalize = context.createGain(),
          restore = context.createGain(),
          identity = context.createWaveShaper();
        // The dry identity uses matching 4x filters without clipping source peaks above unity.
        normalize.gain.value = 1 / 65536;
        restore.gain.value = 65536;
        identity.curve = new Float32Array([-1, 1]);
        identity.oversample = '4x';
        input.connect(normalize).connect(identity).connect(restore).connect(dry);
        const drive = context.createGain(),
          tone = context.createBiquadFilter(),
          shaper = context.createWaveShaper();
        tone.type = 'lowpass';
        tone.Q.value = 0.707;
        shaper.oversample = '4x';
        shaper.curve = Float32Array.from({ length: 4097 }, (_, i) =>
          Math.tanh(8 * ((2 * i) / 4096 - 1)),
        );
        input.connect(drive).connect(shaper).connect(tone).connect(makeup).connect(wet);
        own(normalize, restore, identity, drive, tone, shaper);
        return {
          latency: environment.oversamplingLatency,
          tail: () => environment.oversamplingLatency + 0.1,
          update(p) {
            set(drive.gain, dbGain(p.drive) / 8);
            set(tone.frequency, Math.min(p.tone, context.sampleRate * 0.49));
          },
        };
      },
    );
  },
});
