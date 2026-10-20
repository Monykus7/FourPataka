import { definePedalModule, createMixedProcessor, MODULE_API_VERSION } from '../index';

/** Depth is a fraction of the safe radius, not an independently clamped ms value. */
export function chorusExcursion(timeMs: number, depthPercent: number) {
  return (Math.min(10, timeMs - 1) * depthPercent) / 100;
}
export const chorusModule = definePedalModule({
  id: 'fourpataka:pedal/chorus',
  category: 'pedal',
  label: 'Chorus',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  author: 'Monykus7',
  attribution: 'FourPataka source; GPL-3.0-only; see LICENSE',
  bypass: 'drain',
  nodes: 12,
  memoryBytes: 196608,
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  note: 'Two moving delay voices. Depth scales the safe sweep, up to 10 ms. Bypass lets the short tail finish; Stop clears it.',
  reset: { label: 'Reset chorus', accessibleLabel: 'Reset chorus {index}' },
  parameters: {
    rate: {
      label: 'rate',
      description: 'Shared sine sweep speed; edits retain the running phase.',
      min: 0.05,
      max: 5,
      step: 0.05,
      unit: 'Hz',
      defaultValue: 0.8,
      update: 'continuous',
    },
    time: {
      label: 'base delay',
      description: 'Center delay for both voices.',
      min: 5,
      max: 30,
      step: 0.5,
      unit: 'ms',
      defaultValue: 15,
      update: 'continuous',
    },
    depth: {
      label: 'depth',
      description: 'Percentage of min(10 ms, base delay minus 1 ms); both voices remain causal.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 30,
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
      description: 'Linear blend of dry and the averaged delay voices.',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      defaultValue: 35,
      update: 'continuous',
    },
  },
  latency: () => 0,
  tail: () => 0.05,
  exportTail: (p) => (p.mix > 0 ? 0.05 : 0),
  create(context, initial, bypassed, environment) {
    return createMixedProcessor(
      context,
      initial,
      bypassed,
      ({ input, dry, wet, makeup, own, set }) => {
        const first = context.createDelay(0.05),
          second = context.createDelay(0.05);
        const feed = context.createGain(),
          sum = context.createGain();
        const lfo = context.createOscillator(),
          depth = context.createGain(),
          inverse = context.createGain();
        own(first, second, feed, sum, lfo, depth, inverse);
        input.connect(dry);
        input.connect(feed);
        feed.connect(first).connect(sum);
        feed.connect(second).connect(sum);
        sum.gain.value = 0.5;
        sum.connect(makeup).connect(wet);
        inverse.gain.value = -1;
        lfo.connect(depth).connect(first.delayTime);
        depth.connect(inverse).connect(second.delayTime);
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
        let initialized = false,
          wasBypassed = bypassed,
          drainUntil = 0;
        return {
          latency: 0,
          tail: () => 0.05,
          drain: true,
          tailActive: (p, bypass) => bypass && p.mix > 0 && context.currentTime < drainUntil,
          update(p, bypass) {
            const now = context.currentTime;
            const radius = chorusExcursion(p.time, p.depth) / 1000;
            // Both targets share one audio timestamp and smoothing constant. Convex
            // interpolation preserves base-radius >= 1 ms even during rapid edits.
            for (const [parameter, value] of [
              [first.delayTime, p.time / 1000],
              [second.delayTime, p.time / 1000],
              [depth.gain, radius],
            ] as const) {
              if (!initialized) parameter.value = value;
              else parameter.setTargetAtTime(value, now, 0.015);
            }
            set(lfo.frequency, p.rate);
            if (!initialized) feed.gain.value = bypass ? 0 : 1;
            else if (bypass !== wasBypassed) {
              // Finite feed ramps make the drain bound real: 5 ms gate + at most
              // 40 ms of delayed samples + interpolation margin, all within 50 ms.
              feed.gain.cancelAndHoldAtTime(now);
              feed.gain.linearRampToValueAtTime(bypass ? 0 : 1, now + 0.005);
              if (bypass) drainUntil = now + 0.05;
            }
            initialized = true;
            wasBypassed = bypass;
          },
        };
      },
    );
  },
});
