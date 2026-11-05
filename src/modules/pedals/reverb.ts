import { definePedalModule, createMixedProcessor, MODULE_API_VERSION } from '../index';

export const REVERB_DELAYS = [29.7, 37.1, 41.1, 43.7, 53.1, 59.3, 67.7, 71.9] as const;
export const REVERB_DIFFUSION = [4.7, 6.1, 8.3] as const;
/** Two nominal -60dB decays plus pre-delay, reflection/filter and feed settling. */
export const reverbTail = (p: Record<string, number>) => p.preDelay / 1000 + 2 * p.decay + 0.5;

export const reverbModule = definePedalModule({
  id: 'fourpataka:pedal/reverb',
  category: 'pedal',
  label: 'Reverb',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  author: 'Monykus7',
  attribution: 'FourPataka source; GPL-3.0-only; see LICENSE',
  bypass: 'drain',
  nodes: 53,
  memoryBytes: 3 * 1024 * 1024,
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  note: 'Algorithmic space with early reflections and a damped late field. Decay is a conservative −60 dB target. Bypass drains; Stop clears.',
  reset: { label: 'Reset reverb', accessibleLabel: 'Reset reverb {index}' },
  parameters: {
    preDelay: {
      label: 'pre-delay',
      description: 'Time before new wet reflections.',
      min: 0,
      max: 100,
      step: 1,
      unit: 'ms',
      defaultValue: 15,
      update: 'continuous',
    },
    decay: {
      label: 'decay',
      description: 'Conservative low-frequency −60 dB decay target.',
      min: 0.1,
      max: 10,
      step: 0.1,
      unit: 's',
      defaultValue: 1.5,
      update: 'continuous',
    },
    size: {
      label: 'size',
      description: 'Reflection spacing relative to the default room.',
      min: 50,
      max: 200,
      step: 1,
      unit: '%',
      defaultValue: 100,
      update: 'continuous',
    },
    damping: {
      label: 'damping',
      description: 'Late-field low-pass cutoff, limited to 0.2 times sample rate.',
      min: 500,
      max: 18000,
      step: 100,
      unit: 'Hz',
      defaultValue: 6500,
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
      description: 'Linear dry / processed blend.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 25,
      update: 'continuous',
    },
  },
  latency: () => 0,
  tail: reverbTail,
  exportTail: (p) => (p.mix > 0 ? reverbTail(p) : 0),
  create(context, initial, bypassed) {
    return createMixedProcessor(context, initial, bypassed, ({ input, dry, wet, makeup, own }) => {
      const register = (...nodes: AudioNode[]) => {
        // Fix the two-channel layout before feedback cycles render their first
        // quantum; inferred mono histories can otherwise contaminate stereo.
        for (const node of nodes) {
          node.channelCount = 2;
          node.channelCountMode = 'explicit';
        }
        own(...nodes);
      };
      const gate = context.createGain(),
        pre = context.createDelay(0.1);
      register(gate, pre);
      input.connect(dry);
      input.connect(gate).connect(pre);
      const early = [3.7, 7.1, 11.3].map((ms, i) => {
        const delay = context.createDelay(0.03),
          gain = context.createGain();
        register(delay, gain);
        gain.gain.value = 0.25 * [0.5, 0.3, 0.2][i];
        pre.connect(delay).connect(gain).connect(makeup);
        return { ms, delay };
      });
      const sum = context.createGain();
      register(sum);
      sum.gain.value = 1 / REVERB_DELAYS.length;
      const combs = REVERB_DELAYS.map((ms) => {
        const delay = context.createDelay(0.15),
          filter = context.createBiquadFilter();
        const feed = context.createGain(),
          feedback = context.createGain();
        register(delay, filter, feed, feedback);
        filter.type = 'lowpass';
        // Low/high-pass Q is in dB: this encodes a nonresonant linear Q of .5.
        filter.Q.value = 20 * Math.log10(0.5);
        pre.connect(feed).connect(delay).connect(filter);
        filter.connect(feedback).connect(delay);
        filter.connect(sum);
        return { ms, delay, filter, feed, feedback };
      });
      let last: AudioNode = sum;
      // Positive two-tap averaging diffuses the late field without an all-pass
      // transient gain boost. Every section retains unity DC and bounded gain.
      const diffusion = REVERB_DIFFUSION.map((ms) => {
        const delay = context.createDelay(0.03),
          average = context.createGain();
        register(delay, average);
        average.gain.value = 0.5;
        last.connect(average);
        last.connect(delay).connect(average);
        last = average;
        return { ms, delay };
      });
      const late = context.createGain();
      register(late);
      late.gain.value = 0.75;
      last.connect(late).connect(makeup);
      makeup.connect(wet);
      let initialized = false,
        wasBypassed = bypassed,
        budget = reverbTail(initial),
        drainUntil = 0,
        previousNetwork = '';
      return {
        latency: 0,
        drain: true,
        tail: () => budget,
        tailActive: (p, bypass) => bypass && p.mix > 0 && context.currentTime < drainUntil,
        update(p, bypass) {
          const now = context.currentTime,
            scale = p.size / 100;
          const cutoff = Math.min(p.damping, context.sampleRate * 0.2);
          const target = (parameter: AudioParam, value: number) => {
            if (!initialized) parameter.value = value;
            else parameter.setTargetAtTime(value, now, 0.015);
          };
          target(pre.delayTime, p.preDelay / 1000);
          for (const tap of [...early, ...diffusion])
            target(tap.delay.delayTime, (tap.ms * scale) / 1000);
          for (const c of combs) {
            const seconds = (c.ms * scale) / 1000;
            // Include Chromium's cycle quantum and a low-pass group-delay guard.
            // Feed and feedback use the same timestamp/constant, retaining 1-g.
            const g = Math.pow(
              0.001,
              (seconds + 128 / context.sampleRate + 2 / (Math.PI * cutoff)) / p.decay,
            );
            target(c.delay.delayTime, seconds);
            target(c.filter.frequency, cutoff);
            target(c.feedback.gain, g);
            target(c.feed.gain, 1 - g);
          }
          const network = JSON.stringify([p.preDelay, p.size, p.decay, p.damping]);
          budget = Math.max(budget, reverbTail(p));
          if (!initialized) gate.gain.value = bypass ? 0 : 1;
          else if (bypass !== wasBypassed) {
            gate.gain.cancelAndHoldAtTime(now);
            gate.gain.linearRampToValueAtTime(bypass ? 0 : 1, now + 0.005);
            if (bypass) drainUntil = now + budget;
          } else if (bypass && now < drainUntil && network !== previousNetwork) {
            // An actual decay/room edit can extend stored energy. Repeated host
            // updates with identical settings must never renew the drain forever.
            drainUntil = Math.max(drainUntil, now + budget);
          }
          initialized = true;
          wasBypassed = bypass;
          previousNetwork = network;
        },
      };
    });
  },
});
