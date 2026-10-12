import { expect, test } from '@playwright/test';

test('registered Fourier and independent Tone obey host timing and offline gain', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { engineModules } = await import('/src/modules/' + 'assembly.ts');
    const results = [];
    for (const id of ['fourpataka:engine/fourier', 'example:engine/basic-tone']) {
      const module = engineModules.get(id);
      const settings = module.defaults();
      const context = new OfflineAudioContext(1, 28800, 48000);
      const voice = module.create({
        context,
        destination: context.destination,
        settings,
        frequencyHz: 480,
        startSeconds: 0.05,
        durationSeconds: 0.3,
        releaseLimitSeconds: 0.05,
        seed: 17,
      });
      const end = voice.end;
      const buffer = await context.startRendering();
      const data = buffer.getChannelData(0);
      const rms = (from: number, to: number) =>
        Math.sqrt(
          data.slice(from, to).reduce((s: number, v: number) => s + v * v, 0) / (to - from),
        );
      results.push({
        id,
        end,
        before: rms(0, 2300),
        body: rms(4800, 9600),
        after: rms(20000, 24000),
        nodes: voice.oscillators?.length,
      });
      voice.dispose();
    }
    return results;
  });
  for (const result of proof) {
    expect(result.end).toBeCloseTo(0.4, 8);
    expect(result.before).toBe(0);
    expect(result.body).toBeCloseTo(10 ** (-12 / 20) / Math.sqrt(2), 4);
    expect(result.after).toBe(0);
    expect(result.nodes).toBe(0);
  }
});

test('Tone updates preserve source phase and retirement owns future live and offline nodes', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { engineModules } = await import('/src/modules/' + 'assembly.ts');
    const module = engineModules.get('example:engine/basic-tone');
    const settings: any = module.defaults();
    const context = new OfflineAudioContext(1, 33600, 48000);
    const voice = module.create({
      context,
      destination: context.destination,
      settings,
      frequencyHz: 480,
      startSeconds: 0.05,
      durationSeconds: 0.5,
      seed: 0,
    });
    const original = voice.oscillators![0];
    const suspension = context.suspend(0.125);
    const rendering = context.startRendering();
    await suspension;
    voice.update({ ...settings, trim: -18 });
    const sameSource = original === voice.oscillators![0];
    voice.steal(0.35);
    const end = voice.end;
    await context.resume();
    const data = (await rendering).getChannelData(0);
    const project = (start: number, end: number, cosine = false) => {
      let sum = 0;
      for (let i = start; i < end; i++) {
        const phase = 2 * Math.PI * 480 * (i / 48000 - 0.05);
        sum += data[i] * (cosine ? Math.cos(phase) : Math.sin(phase));
      }
      return (2 * sum) / (end - start);
    };
    const futureContext = new OfflineAudioContext(1, 9600, 48000);
    const future = module.create({
      context: futureContext,
      destination: futureContext.destination,
      settings,
      frequencyHz: 480,
      startSeconds: 0.1,
      durationSeconds: 0.05,
      seed: 0,
    });
    future.dispose();
    future.dispose();
    const quiet = (await futureContext.startRendering()).getChannelData(0);
    const live = new AudioContext();
    await live.resume();
    const liveVoice = module.create({
      context: live,
      destination: live.destination,
      settings,
      frequencyHz: 440,
      startSeconds: live.currentTime + 0.2,
      durationSeconds: 0.2,
      seed: 0,
    });
    liveVoice.dispose();
    const liveNodes = liveVoice.oscillators?.length;
    await live.close();
    return {
      sameSource,
      end,
      before: project(4800, 5800),
      after: project(9600, 14400),
      phaseError: project(9600, 14400, true),
      tail: Math.max(...Array.from(data.slice(19200), Math.abs)),
      futurePeak: Math.max(...Array.from(quiet, Math.abs)),
      liveNodes,
    };
  });
  expect(proof.sameSource).toBe(true);
  expect(proof.end).toBeCloseTo(0.36, 8);
  expect(proof.before).toBeCloseTo(10 ** (-12 / 20), 3);
  expect(proof.after).toBeCloseTo(10 ** (-18 / 20), 3);
  expect(Math.abs(proof.phaseError)).toBeLessThan(0.0001);
  expect(proof.tail).toBe(0);
  expect(proof.futurePeak).toBe(0);
  expect(proof.liveNodes).toBe(0);
});

test('Tone envelope edits retain the original note-off and support both export rates', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { engineModules } = await import('/src/modules/' + 'assembly.ts');
    const engine = engineModules.get('example:engine/basic-tone');
    const results = [];
    for (const rate of [44100, 48000]) {
      const context = new OfflineAudioContext(1, rate / 2, rate);
      const settings: any = { ...(engine.defaults() as object), attack: 0.2 };
      const voice = engine.create({
        context,
        destination: context.destination,
        settings,
        frequencyHz: 480,
        startSeconds: 0,
        durationSeconds: 0.15,
        seed: 0,
      });
      const suspension = context.suspend(0.08);
      const rendering = context.startRendering();
      await suspension;
      voice.update({ ...settings, attack: 0.005, release: 0.1 });
      const end = voice.end;
      await context.resume();
      const data = (await rendering).getChannelData(0);
      const rms = (a: number, b: number) => {
        const slice = data.slice(Math.round(a * rate), Math.round(b * rate));
        return Math.sqrt(slice.reduce((sum: number, v: number) => sum + v * v, 0) / slice.length);
      };
      results.push({
        rate,
        end,
        steady: rms(0.12, 0.145),
        release: rms(0.2, 0.225),
        tail: rms(0.3, 0.4),
        nodes: voice.oscillators?.length,
        finite: data.every((v: number) => Number.isFinite(v)),
      });
      voice.dispose();
    }
    return results;
  });
  for (const result of proof) {
    expect(result.end).toBeCloseTo(0.25, 8);
    expect(result.steady).toBeCloseTo(10 ** (-12 / 20) / Math.sqrt(2), 3);
    expect(result.release).toBeGreaterThan(0.04);
    expect(result.release).toBeLessThan(result.steady * 0.6);
    expect(result.tail).toBe(0);
    expect(result.nodes).toBe(0);
    expect(result.finite).toBe(true);
  }
});
