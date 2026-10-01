import { expect, test } from '@playwright/test';

test('live voice edits crossfade in phase without retriggering the envelope', async ({ page }) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const voicePath = '/src/audio/voice.ts';
    const musicPath = '/src/core/music.ts';
    const { createVoice } = await import(voicePath);
    const { mathematicalPreset } = await import(musicPath);
    const context = new OfflineAudioContext(1, 48000, 48000);
    const sound = mathematicalPreset('sine');
    sound.attack = 0.4;
    const voice = createVoice(context, context.destination, sound, 437, 0, 0.8);
    const paused = context.suspend(0.2);
    const rendering = context.startRendering();
    await paused;
    const changeAt = context.currentTime;
    const next = structuredClone(sound);
    next.harmonics[2] = 0.25;
    next.polarity[2] = -1;
    voice.update(next);
    await context.resume();
    const samples = (await rendering).getChannelData(0);
    let error = 0;
    for (let i = Math.ceil((changeAt + 0.025) * 48000); i < 19000; i++) {
      const t = i / 48000;
      const expected =
        Math.min(1, t / sound.attack) *
        10 ** (-12 / 20) *
        (Math.sin(2 * Math.PI * 437 * t) - 0.25 * Math.sin(2 * Math.PI * 1311 * t));
      error = Math.max(error, Math.abs(samples[i] - expected));
    }
    const frame = Math.round(changeAt * 48000);
    const boundaryJump = Math.abs(samples[frame] - samples[frame - 1]);
    return {
      error,
      boundaryJump,
      changeAt,
      before: Array.from(samples.slice(frame - 3, frame)),
      after: Array.from(samples.slice(frame, frame + 3)),
    };
  });
  expect(proof.error).toBeLessThan(0.001);
  expect(proof.boundaryJump, JSON.stringify(proof)).toBeLessThan(0.02);
});

test('phrase auditions freeze musical material and live edits keep the clock running', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const enginePath = '/src/audio/engine.ts';
    const musicPath = '/src/core/music.ts';
    const { AudioEngine } = await import(enginePath);
    const { mathematicalPreset } = await import(musicPath);
    const engine = new AudioEngine();
    const sound = mathematicalPreset('sine');
    const phrase = {
      tempo: 60,
      beats: 2,
      events: [
        { beat: 0, duration: 1, notes: ['A4'], frequencies: [440] },
        { beat: 1, duration: 1, notes: ['A5'], frequencies: [880] },
      ],
    };
    await engine.auditionPhrase(sound, phrase);
    phrase.events[1].frequencies[0] = 110;
    const untilProgress = async (time: number) => {
      const deadline = performance.now() + 10000;
      while (engine.progress < time && performance.now() < deadline)
        await new Promise((resolve) => setTimeout(resolve, 25));
    };
    await untilProgress(0.3);
    const before = engine.progress;
    const updated = structuredClone(sound);
    updated.harmonics[0] = 0.3;
    engine.updateAudition(updated);
    const after = engine.progress;
    await untilProgress(1.2);
    const data = new Float32Array(2048);
    engine.analyser.getFloatTimeDomainData(data);
    // Frequency projection from the actual second scheduled note.
    const energy = (f: number) => {
      let re = 0,
        im = 0;
      for (let i = 0; i < data.length; i++) {
        re += data[i] * Math.cos((2 * Math.PI * f * i) / engine.sampleRate);
        im += data[i] * Math.sin((2 * Math.PI * f * i) / engine.sampleRate);
      }
      return (Math.hypot(re, im) * 2) / data.length;
    };
    const high = energy(880),
      unwanted = energy(110);
    await engine.auditionPhrase(sound, {
      ...phrase,
      events: [{ beat: 0, duration: 2, notes: ['A4'], frequencies: [440] }],
    });
    const replayStart = engine.progress;
    engine.stop();
    const pending = engine.auditionPhrase(sound, phrase);
    engine.stop();
    await pending;
    const modeAfterStop = engine.mode;
    await engine.context.close();
    return { before, after, high, unwanted, replayStart, modeAfterStop };
  });
  expect(proof.before).toBeGreaterThan(0.15);
  expect(proof.after).toBeGreaterThanOrEqual(proof.before);
  expect(proof.high).toBeGreaterThan(0.012);
  expect(proof.unwanted).toBeLessThan(proof.high * 0.15);
  expect(proof.replayStart).toBeLessThan(0.06);
  expect(proof.modeAfterStop).toBeNull();
});
