import { definePedalModule, createMixedProcessor, MODULE_API_VERSION } from '../index';

// A conservative six-second decay allowance covers the slowest eight-pole state
// and the bounded feedback loop. This is coloration, never look-ahead latency.
export const PHASER_TAIL_SECONDS = 6;
export const phaserModule = definePedalModule({
  id: 'fourpataka:pedal/phaser',
  category: 'pedal',
  label: 'Phaser',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  author: 'Monykus7',
  attribution: 'FourPataka source; GPL-3.0-only; see LICENSE',
  bypass: 'dry',
  nodes: 18,
  memoryBytes: 131072,
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  note: '4/6/8 stages. Mix near 50% reveals moving notches; feedback adds resonance. Bypass is dry; Stop clears the tail.',
  reset: { label: 'Reset phaser', accessibleLabel: 'Reset phaser {index}' },
  parameters: {
    rate: {
      label: 'rate',
      description: 'Sine sweep speed; edits preserve the running LFO.',
      min: 0.05,
      max: 5,
      step: 0.05,
      unit: 'Hz',
      defaultValue: 0.5,
      update: 'continuous',
    },
    depth: {
      label: 'depth',
      description: 'Sweep radius: 100% is one octave either side of center.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 65,
      update: 'continuous',
    },
    frequency: {
      label: 'center frequency',
      description: 'All-pass center; sweep is constrained below Nyquist.',
      min: 100,
      max: 4000,
      step: 10,
      unit: 'Hz',
      defaultValue: 800,
      update: 'continuous',
    },
    stages: {
      label: 'stages',
      description:
        'First-order equivalent count; warm paths crossfade without restarting modulation.',
      min: 4,
      max: 8,
      step: 2,
      unit: 'linear',
      choices: [4, 6, 8],
      defaultValue: 6,
      update: 'continuous',
    },
    feedback: {
      label: 'feedback',
      description: 'Positive all-pass feedback; input gain is reduced by the same fraction.',
      min: 0,
      max: 85,
      step: 1,
      unit: '%',
      defaultValue: 25,
      update: 'continuous',
    },
    output: {
      label: 'output',
      description: 'Wet output trim.',
      min: -24,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
    mix: {
      label: 'mix',
      description: 'Linear wet blend; 50% creates dry/all-pass cancellation notches.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 50,
      update: 'continuous',
    },
  },
  latency: () => 0,
  tail: () => PHASER_TAIL_SECONDS,
  exportTail: (p) => (p.mix > 0 ? PHASER_TAIL_SECONDS : 0),
  create(context, initial, bypassed, environment) {
    return createMixedProcessor(
      context,
      initial,
      bypassed,
      ({ input, dry, wet, makeup, own, set }) => {
        const filters = Array.from({ length: 4 }, () => context.createBiquadFilter());
        const taps = Array.from({ length: 3 }, () => context.createGain());
        const feed = context.createGain(),
          sum = context.createGain();
        const feedback = context.createGain(),
          loop = context.createDelay(0.05);
        const lfo = context.createOscillator(),
          depth = context.createGain();
        own(...filters, ...taps, feed, sum, feedback, loop, lfo, depth);
        // Q=0.5 makes each biquad two coincident first-order all-pass stages.
        filters.forEach((filter, i) => {
          filter.type = 'allpass';
          filter.Q.value = 0.5;
          if (i > 0) filters[i - 1].connect(filter);
          if (i >= 1) filter.connect(taps[i - 1]).connect(sum);
          depth.connect(filter.detune);
        });
        lfo.connect(depth);
        input.connect(dry);
        input.connect(feed).connect(filters[0]);
        sum.connect(makeup).connect(wet);
        sum.connect(feedback).connect(loop).connect(filters[0]);
        // The explicit cycle breaker matches Web Audio's 128-frame feedback quantum.
        // It affects only recirculation, so no track-alignment compensation is added.
        loop.delayTime.value = 128 / context.sampleRate;
        const at = Math.max(context.currentTime, environment.timeOrigin ?? 0);
        const phase = 2 * Math.PI * initial.rate * (at - (environment.timeOrigin ?? 0));
        lfo.setPeriodicWave(
          context.createPeriodicWave(
            new Float32Array([0, Math.sin(phase)]),
            new Float32Array([0, Math.cos(phase)]),
            { disableNormalization: true },
          ),
        );
        lfo.frequency.value = initial.rate;
        lfo.start(at);
        return {
          latency: 0,
          tail: () => PHASER_TAIL_SECONDS,
          update(p) {
            // Bound for the full octave even during simultaneous smoothed depth/center edits.
            const center = Math.max(40, Math.min(p.frequency, context.sampleRate * 0.245));
            filters.forEach((filter) => set(filter.frequency, center));
            set(depth.gain, p.depth * 12);
            set(lfo.frequency, p.rate);
            taps.forEach((tap, i) => set(tap.gain, p.stages === 4 + i * 2 ? 1 : 0));
            set(feedback.gain, p.feedback / 100);
            set(feed.gain, 1 - p.feedback / 100);
          },
        };
      },
    );
  },
});
