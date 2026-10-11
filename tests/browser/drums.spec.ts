import { expect, test } from '@playwright/test';

test('falling pitch has a measurable transient and Fourier edits join its accumulated phase', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { mathematicalPreset } = await import('/src/core/' + 'music.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const results = [];
    for (const rate of [44100, 48000]) {
      const render = async (sign?: number) => {
        const context = new OfflineAudioContext(1, rate, rate);
        const sound = mathematicalPreset('sine');
        sound.percussion = {
          noise: 0,
          highpass: 1000,
          decay: 0.12,
          pitch: { amount: 24, decay: 0.025 },
        };
        const voice = createVoice(context, context.destination, sound, 120, 0, 0.5);
        const suspended = context.suspend(0.08);
        const rendering = context.startRendering();
        await suspended;
        if (sign !== undefined) {
          if (sign) {
            sound.harmonics[2] = 0.2;
            sound.polarity[2] = sign;
          }
          voice.update(sound);
        }
        await context.resume();
        const data = (await rendering).getChannelData(0);
        voice.dispose();
        return data;
      };
      const baseline = await render(),
        unchanged = await render(0),
        positive = await render(1),
        negative = await render(-1);
      const frequency = (from: number, to: number) => {
        const crossings: number[] = [];
        for (let i = Math.ceil(from * rate); i < to * rate; i++)
          if (baseline[i - 1] < 0 && baseline[i] >= 0)
            crossings.push((i - 1 + -baseline[i - 1] / (baseline[i] - baseline[i - 1])) / rate);
        return (crossings.length - 1) / (crossings.at(-1)! - crossings[0]);
      };
      let error = 0;
      for (let i = Math.floor(0.09 * rate); i < 0.2 * rate; i++)
        error = Math.max(error, Math.abs((positive[i] + negative[i]) / 2 - baseline[i]));
      const noOpError = Math.max(
        ...Array.from(baseline, (value, i) => Math.abs(value - unchanged[i])),
      );
      results.push({
        rate,
        early: frequency(0.005, 0.03),
        late: frequency(0.15, 0.22),
        error,
        noOpError,
      });
    }
    return results;
  });
  for (const result of proof) {
    expect(result.noOpError).toBe(0);
    expect(result.early).toBeGreaterThan(200);
    expect(result.late).toBeCloseTo(120, 0);
    expect(result.error).toBeLessThan(0.002);
  }
});
