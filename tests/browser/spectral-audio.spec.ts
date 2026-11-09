import { expect, test } from '@playwright/test';

test('spectral carriers transpose, preserve phase on a live edit, and release or stop on the audio clock', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { spectralEngine } = await import('/src/modules/engines/' + 'spectral/index.ts');
    const rate = 48000;
    const hz = 330;
    const settings = spectralEngine.defaults();
    settings.trim = 0;
    settings.ratios = [1, 2, 2.4];
    const frame = (time: number, root: number, upper: number, mode: number) => ({
      time,
      tones: [0, root, 0, upper, 0, mode],
      noise: [0, 0, 0],
    });
    settings.held = [frame(0, 0, 0, 0), frame(0.01, 0.4, 0.2, 0.09), frame(0.2, 0.4, 0.02, 0.09)];
    settings.released = [frame(0, 0.4, 0.02, 0.09), frame(1, 0, 0, 0)];
    const render = async (action: 'plain' | 'update' | 'steal' | 'noise' | 'join') => {
      const context = new OfflineAudioContext(1, rate, rate);
      const initial =
        action === 'noise'
          ? {
              ...settings,
              tone: 0,
              held: settings.held.map((item, i) => ({ ...item, noise: [0, 0, i ? 0.08 : 0] })),
            }
          : settings;
      const start = () =>
        spectralEngine.create({
          context,
          destination: context.destination,
          settings: initial,
          frequencyHz: hz,
          startSeconds: 0,
          durationSeconds: 0.4,
          seed: 0,
        });
      let voice = action === 'join' ? undefined : start();
      const change =
        action !== 'plain' && action !== 'noise'
          ? context.suspend(0.12).then(() => {
              if (action === 'update') voice!.update({ ...settings, tone: 0.5 });
              else if (action === 'steal') voice!.steal(context.currentTime);
              else voice = start();
              return context.resume();
            })
          : Promise.resolve();
      const [buffer] = await Promise.all([context.startRendering(), change]);
      voice!.dispose();
      return buffer.getChannelData(0);
    };
    const [plain, edited, stopped, noise, noiseAgain, joined] = await Promise.all(
      ['plain', 'update', 'steal', 'noise', 'noise', 'join'].map((action) =>
        render(action as Parameters<typeof render>[0]),
      ),
    );
    const power = (samples: Float32Array, start: number, duration: number, frequency: number) => {
      let real = 0,
        imaginary = 0;
      for (let i = Math.round(start * rate); i < Math.round((start + duration) * rate); i++) {
        const phase = (2 * Math.PI * i * frequency) / rate;
        real += samples[i] * Math.cos(phase);
        imaginary += samples[i] * Math.sin(phase);
      }
      return (Math.hypot(real, imaginary) * 2) / (rate * duration);
    };
    const difference = (a: Float32Array, b: Float32Array, start: number, end: number, scale = 1) =>
      a
        .subarray(start * rate, end * rate)
        .reduce((max, n, i) => Math.max(max, Math.abs(n - b[i + start * rate] * scale)), 0);
    const peak = (samples: Float32Array, after: number) =>
      samples.subarray(after * rate).reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    return {
      root: power(plain, 0.2, 0.1, hz),
      earlyUpper: power(plain, 0.02, 0.1, 2 * hz),
      lateUpper: power(plain, 0.22, 0.1, 2 * hz),
      resonance: power(plain, 0.2, 0.1, 2.4 * hz),
      editedPhase: difference(plain, edited, 0.2, 0.3, 2),
      joinedPhase: difference(plain, joined, 0.2, 0.3),
      noiseParity: difference(noise, noiseAgain, 0, 1),
      noisePeak: peak(noise, 0),
      released: peak(plain, 0.54),
      stopped: peak(stopped, 0.15),
    };
  });
  expect(result.root).toBeCloseTo(0.4, 2);
  expect(result.earlyUpper).toBeGreaterThan(5 * result.lateUpper);
  expect(result.resonance).toBeCloseTo(0.09, 2);
  expect(result.editedPhase).toBeLessThan(0.0001);
  expect(result.joinedPhase).toBeLessThan(0.004);
  expect(result.noiseParity).toBe(0);
  expect(result.noisePeak).toBeGreaterThan(0.03);
  expect(result.released).toBe(0);
  expect(result.stopped).toBe(0);
});
