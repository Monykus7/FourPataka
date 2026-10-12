import {
  definePedalModule,
  MODULE_API_VERSION,
  createMixedProcessor,
  dbGain,
  delayTailSeconds,
} from '../index';
export const delayModule = definePedalModule({
  id: 'fourpataka:pedal/delay',
  category: 'pedal',
  legacyKind: 'delay',
  label: 'Delay',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  author: 'Monykus7',
  attribution: 'FourPataka source; project license pending',
  bypass: 'drain',
  nodes: 12,
  memoryBytes: 6152192,
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  note: 'Bypass stops new echoes; existing echoes finish. Stop clears them.',
  parameters: {
    time: {
      label: 'time',
      description: 'Delay time in ms.',
      min: 20,
      max: 2000,
      step: 10,
      unit: 'ms',
      defaultValue: 300,
      update: 'continuous',
    },
    feedback: {
      label: 'feedback',
      description: 'Delay feedback in %.',
      min: 0,
      max: 95,
      step: 1,
      unit: '%',
      defaultValue: 30,
      update: 'continuous',
    },
    output: {
      label: 'output',
      description: 'Delay output in dB.',
      min: -24,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
    mix: {
      label: 'mix',
      description: 'Delay mix in %.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 35,
      update: 'continuous',
    },
  },
  latency: (environment) => 0,
  tail: (params, environment) => delayTailSeconds(params.time, params.feedback),
  exportTail: (params) => (params.mix > 0 ? delayTailSeconds(params.time, params.feedback) : 0),
  create(context, params, bypassed, environment) {
    return createMixedProcessor(
      context,
      params,
      bypassed,
      ({ input, output, dry, wet, makeup, own, set }) => {
        const delay = context.createDelay(2),
          loop = context.createDelay(2),
          sum = context.createGain(),
          feed = context.createGain(),
          feedback = context.createGain(),
          meterMute = context.createGain(),
          meter = context.createAnalyser();
        meter.fftSize = 2048;
        meterMute.gain.value = 0;
        input.connect(dry);
        input.connect(feed).connect(delay).connect(sum);
        sum.connect(feedback).connect(loop).connect(sum);
        sum.connect(makeup).connect(wet);
        feed.connect(meter);
        feedback.connect(meter);
        meter.connect(meterMute).connect(output);
        own(delay, loop, sum, feed, feedback, meter, meterMute);
        const samples = new Float32Array(2048);
        let tailUntil = 0;
        return {
          latency: 0,
          drain: true,
          tail: (p) => delayTailSeconds(p.time, p.feedback),
          update(p, bypass) {
            set(delay.delayTime, p.time / 1000);
            // Cycle breaker adds 128 frames only on repeats; first echo stays outside the loop.
            set(loop.delayTime, Math.max(0, p.time / 1000 - 128 / context.sampleRate));
            set(feedback.gain, p.feedback / 100);
            set(feed.gain, bypass ? 0 : 1);
          },
          tailActive(p, bypass) {
            // Measure loop input to retain tails across silent gaps, not just while input sounds.
            meter.getFloatTimeDomainData(samples);
            if (samples.some((sample) => Math.abs(sample) > 0.001))
              tailUntil = context.currentTime + p.time / 1000 + 0.05;
            return bypass && p.mix > 0 && context.currentTime < tailUntil;
          },
        };
      },
    );
  },
});
