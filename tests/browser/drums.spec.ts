import { expect, test } from '@playwright/test';
import { drumEditingWorkflow } from '../helpers/percussion';

test('drum controls save pitch and separate decay with independent Apply and reload', async ({
  page,
}) => {
  await page.goto('/');
  await drumEditingWorkflow(page);
});

test('falling pitch has a measurable transient and Fourier edits join its accumulated phase', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { mathematicalPreset } = await import('/src/core/' + 'music.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const results = [];
    for (const rate of [44100, 48000]) {
      const render = async (sign?: number, changePitch = false) => {
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
          if (changePitch) sound.percussion.pitch = { amount: 12, decay: 0.04 };
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
        negative = await render(-1),
        changed = await render(0, true),
        changedPositive = await render(1, true),
        changedNegative = await render(-1, true);
      const frequency = (from: number, to: number) => {
        const crossings: number[] = [];
        for (let i = Math.ceil(from * rate); i < to * rate; i++)
          if (baseline[i - 1] < 0 && baseline[i] >= 0)
            crossings.push((i - 1 + -baseline[i - 1] / (baseline[i] - baseline[i - 1])) / rate);
        return (crossings.length - 1) / (crossings.at(-1)! - crossings[0]);
      };
      let error = 0;
      let pitchEditError = 0;
      for (let i = Math.floor(0.09 * rate); i < 0.2 * rate; i++)
        error = Math.max(error, Math.abs((positive[i] + negative[i]) / 2 - baseline[i]));
      for (let i = Math.floor(0.09 * rate); i < 0.2 * rate; i++)
        pitchEditError = Math.max(
          pitchEditError,
          Math.abs((changedPositive[i] + changedNegative[i]) / 2 - changed[i]),
        );
      const noOpError = Math.max(
        ...Array.from(baseline, (value, i) => Math.abs(value - unchanged[i])),
      );
      results.push({
        rate,
        early: frequency(0.005, 0.03),
        late: frequency(0.15, 0.22),
        error,
        noOpError,
        pitchEditError,
      });
    }
    return results;
  });
  for (const result of proof) {
    expect(result.noOpError).toBe(0);
    expect(result.pitchEditError).toBeLessThan(0.002);
    expect(result.early).toBeGreaterThan(200);
    expect(result.late).toBeCloseTo(120, 0);
    expect(result.error).toBeLessThan(0.002);
  }
});

test('kick has a falling low body and snare has an independent longer broadband rattle', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { kickPreset, snarePreset } = await import('/src/core/' + 'instrumentPresets.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const results = [];
    for (const rate of [44100, 48000]) {
      const render = async (sound: any, frequency: number) => {
        const context = new OfflineAudioContext(1, rate, rate);
        createVoice(context, context.destination, sound, frequency, 0, 0.5);
        return (await context.startRendering()).getChannelData(0);
      };
      const rms = (data: Float32Array, from: number, to: number) => {
        const slice = data.slice(Math.floor(rate * from), Math.floor(rate * to));
        return Math.sqrt(slice.reduce((sum, value) => sum + value * value, 0) / slice.length);
      };
      const kick = kickPreset(),
        snare = snarePreset();
      const kickData = await render(kick, 65.406391),
        snareData = await render(snare, 195.997718);
      const body = structuredClone(snare);
      body.percussion!.noise = 0;
      const noise = structuredClone(snare);
      noise.harmonics.fill(0);
      const bodyData = await render(body, 195.997718),
        noiseData = await render(noise, 195.997718);
      const snareSumError = Math.max(
        ...Array.from(snareData, (value, i) => Math.abs(value - bodyData[i] - noiseData[i])),
      );
      results.push({
        rate,
        kickEarly: rms(kickData, 0.02, 0.06),
        kickLate: rms(kickData, 0.35, 0.39),
        snareBodyRatio: rms(bodyData, 0.18, 0.2) / rms(bodyData, 0.02, 0.04),
        snareNoiseRatio: rms(noiseData, 0.18, 0.2) / rms(noiseData, 0.02, 0.04),
        snareNoiseEarly: rms(noiseData, 0.02, 0.04),
        snareSumError,
        peak: Math.max(...Array.from(kickData, Math.abs), ...Array.from(snareData, Math.abs)),
        finite: kickData.every(Number.isFinite) && snareData.every(Number.isFinite),
        tail: Math.max(...Array.from(kickData.slice(Math.floor(rate * 0.8)), Math.abs)),
      });
    }
    return results;
  });
  for (const result of proof) {
    expect(result.kickEarly).toBeGreaterThan(0.08);
    expect(result.kickLate / result.kickEarly).toBeLessThan(0.1);
    expect(result.snareNoiseEarly).toBeGreaterThan(0.03);
    expect(result.snareNoiseRatio).toBeGreaterThan(result.snareBodyRatio * 3);
    expect(result.snareSumError).toBeLessThan(1e-6);
    expect(result.peak).toBeLessThan(0.65);
    expect(result.finite).toBe(true);
    expect(result.tail).toBe(0);
  }
});
