import { expect, test } from '@playwright/test';

test('Stop owns future retired voices and releases silent voices without oscillator callbacks', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    const { mathematicalPreset } = await import('/src/core/' + 'music.ts');
    const engine = new AudioEngine();
    const sound = mathematicalPreset('sine');
    sound.release = 0.01;
    await engine.auditionPhrase(sound, {
      tempo: 60,
      beats: 0.5,
      events: [{ beat: 0.02, duration: 0.1, notes: [], frequencies: Array(40).fill(440) }],
    });
    const voices = [...engine.session.ownedVoices];
    const admitted = engine.session.voices.length;
    engine.stop();
    await new Promise((resolve) => setTimeout(resolve, 60));
    const leftover = voices.reduce((count: any, voice: any) => count + voice.oscillators.length, 0);
    sound.harmonics.fill(0);
    await engine.auditionPhrase(sound, {
      tempo: 60,
      beats: 0.5,
      events: [{ beat: 0, duration: 0.01, notes: [], frequencies: [440] }],
    });
    const silentSession = engine.session;
    // Audio-device startup can lag wall time; wait for cleanup rather than
    // assuming a 150 ms sleep advances this context by the same amount.
    for (let i = 0; i < 40 && silentSession.ownedVoices.size; i++)
      await new Promise((resolve) => setTimeout(resolve, 25));
    const silentOwned = silentSession.ownedVoices.size;
    engine.stop();
    await engine.context.close();
    return { owned: voices.length, admitted, leftover, silentOwned };
  });
  expect(proof).toEqual({ owned: 40, admitted: 32, leftover: 0, silentOwned: 0 });
});

test('offline source proof: absolute gain, triangle signs, undertone enable, Nyquist, short envelopes', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts';
    const musicPath = '/src/core/music.ts';
    const { createVoice } = await import(enginePath);
    const { mathematicalPreset } = await import(musicPath);
    const render = async (sound: any, frequency: number, duration = 0.4) => {
      const context = new OfflineAudioContext(1, 24000, 48000);
      createVoice(context, context.destination, sound, frequency, 0, duration);
      return (await context.startRendering()).getChannelData(0);
    };
    const coefficient = (data: Float32Array, f: number) => {
      let total = 0;
      for (let i = 4800; i < 9600; i++) total += data[i] * Math.sin((2 * Math.PI * f * i) / 48000);
      return (total * 2) / 4800;
    };
    const sine = mathematicalPreset('sine');
    const pure = await render(sine, 480);
    const triangle = await render(mathematicalPreset('triangle'), 480);
    sine.undertones[0] = 0.5;
    const bankOff = await render(sine, 480);
    sine.undertonesEnabled = true;
    const bankOn = await render(sine, 480);
    const alias = await render(mathematicalPreset('saw'), 12000);
    const slow = mathematicalPreset('sine');
    slow.attack = 0.5;
    slow.release = 0.1;
    const short = await render(slow, 480, 0.01);
    return {
      sineCoefficient: coefficient(pure, 480),
      triangleH3: coefficient(triangle, 1440),
      bankOff: coefficient(bankOff, 240),
      bankOn: coefficient(bankOn, 240),
      nyquistRms: Math.sqrt(alias.slice(4800, 9600).reduce((sum, v) => sum + v * v, 0) / 4800),
      shortPeak: Math.max(...Array.from(short, Math.abs)),
      tailPeak: Math.max(...Array.from(short.slice(6000), Math.abs)),
    };
  });
  expect(result.sineCoefficient).toBeCloseTo(10 ** (-12 / 20), 4);
  expect(result.triangleH3).toBeCloseTo(-(10 ** (-12 / 20)) / 9, 4);
  expect(Math.abs(result.bankOff)).toBeLessThan(0.00001);
  expect(result.bankOn).toBeCloseTo(0.5 * 10 ** (-12 / 20), 4);
  expect(result.nyquistRms).toBeCloseTo(10 ** (-12 / 20) / Math.sqrt(2), 4);
  expect(result.shortPeak).toBeLessThan(0.006);
  expect(result.tailPeak).toBe(0);
});

test('repeated audition and Stop clean up voices and invalidate pending starts', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts';
    const musicPath = '/src/core/music.ts';
    const { AudioEngine } = await import(enginePath);
    const { mathematicalPreset } = await import(musicPath);
    const engine = new AudioEngine();
    const sound = mathematicalPreset('square');
    sound.undertonesEnabled = true;
    sound.undertones[0] = 0.2;
    await engine.audition(sound, [440, 550, 660]);
    await engine.audition(sound, [440]);
    const mode = engine.mode;
    engine.stop();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const values = new Float32Array(2048);
    engine.analyser.getFloatTimeDomainData(values);
    const afterStopPeak = Math.max(...Array.from(values, Math.abs));
    const pending = engine.audition(sound, [440]);
    engine.stop();
    await pending;
    const pendingMode = engine.mode;
    await engine.context.close();
    return { mode, afterStopPeak, pendingMode };
  });
  expect(result.mode).toBe('audition');
  expect(result.afterStopPeak).toBeLessThan(0.000001);
  expect(result.pendingMode).toBeNull();
});
