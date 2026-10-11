import { expect, test } from '@playwright/test';
import {
  percussionWorkflow,
  percussionAvailabilityWorkflow,
  hiHatEditingWorkflow,
} from '../helpers/percussion';

test('noise hit settings save independently and reach owned tracks only through Apply', async ({
  page,
}) => {
  await page.goto('/');
  await hiHatEditingWorkflow(page);
});

test('percussion presets preview short hits, compose together and survive reload', async ({
  page,
}) => {
  await page.goto('/');
  await percussionWorkflow(page);
  await page.screenshot({ path: '.test-results/percussion-desktop.png', fullPage: true });
});

test('existing sessions show percussion presets and compile their keys without a manual import', async ({
  page,
}) => {
  await page.goto('/');
  await percussionAvailabilityWorkflow(page);
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.setViewportSize({ width: 540, height: 900 });
  await page
    .getByRole('combobox', { name: 'Instrument preset', exact: true })
    .selectOption('hi-hat');
  await expect(page.getByRole('button', { name: 'Use hit preview', exact: true })).toBeVisible();
});

test('percussion WAV uses frozen owned sounds through the shared voice factory', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    let project = createProject();
    project.scoreText =
      'tempo 120\ntrack kickTrack using kick {\n C2 16th\n}\ntrack snareTrack using snare {\n D3 16th\n}\ntrack hatTrack using hiHat {\n C4 16th\n}';
    project = reconcileTracks(
      project,
      parseScore(
        project.scoreText,
        project.instruments.map((p: any) => p.key),
      ),
    );
    const pending = renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 });
    for (const p of project.instruments) p.sound.harmonics.fill(0);
    for (const track of project.tracks)
      if (track.sound.percussion) track.sound.percussion.noise = 0;
    const rendered = await pending;
    const data = rendered.buffer.getChannelData(0);
    return {
      keys: rendered.plan.snapshot.tracks.map((t: any) => t.key),
      peak: Math.max(...Array.from(data, Math.abs)),
      finite: data.every(Number.isFinite),
      hatH31: rendered.plan.snapshot.tracks.find((t: any) => t.key === 'hatTrack').sound
        .harmonics[30],
      hatNoise: rendered.plan.snapshot.tracks.find((t: any) => t.key === 'hatTrack').sound
        .percussion.noise,
      tail: Math.max(...Array.from(data.slice(-480), Math.abs)),
    };
  });
  expect(proof.keys).toEqual(['kickTrack', 'snareTrack', 'hatTrack']);
  expect(proof.hatH31).toBeCloseTo(0.21 * 0.08);
  expect(proof.hatNoise).toBe(0.85);
  expect(proof.finite).toBe(true);
  expect(proof.peak).toBeGreaterThan(0.05);
  expect(proof.peak).toBeLessThan(1);
  expect(proof.tail).toBe(0);
});

test('hi-hat is a broadband decaying hit rather than a sustained pitched cycle', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { hiHatPreset, legacyHiHatPreset } = await import('/src/core/' + 'instrumentPresets.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const results = [];
    for (const sampleRate of [44100, 48000]) {
      const render = async (sound: any, duration = 0.5, solo?: string) => {
        const context = new OfflineAudioContext(1, sampleRate, sampleRate);
        createVoice(context, context.destination, sound, 261.625565, 0, duration, solo);
        return (await context.startRendering()).getChannelData(0);
      };
      const sound = hiHatPreset();
      const data = await render(sound),
        repeated = await render(sound);
      const legacy = await render(legacyHiHatPreset());
      const rms = (data: Float32Array, from: number, to: number) => {
        const slice = data.slice(Math.floor(from * sampleRate), Math.floor(to * sampleRate));
        return Math.sqrt(slice.reduce((total, value) => total + value * value, 0) / slice.length);
      };
      const correlation = (data: Float32Array) => {
        const lag = Math.round(sampleRate / 261.625565);
        let sum = 0,
          left = 0,
          right = 0;
        for (let i = Math.floor(0.01 * sampleRate); i < 0.03 * sampleRate; i++) {
          sum += data[i] * data[i + lag];
          left += data[i] ** 2;
          right += data[i + lag] ** 2;
        }
        return sum / Math.sqrt(left * right);
      };
      const noiseOnly = structuredClone(sound);
      noiseOnly.harmonics.fill(0);
      const noise = await render(noiseOnly);
      const solo = await render(noiseOnly, 0.5, 'H13');
      const short = await render(sound, 0.01);
      results.push({
        sampleRate,
        early: rms(data, 0.01, 0.03),
        late: rms(data, 0.2, 0.22),
        correlation: correlation(data),
        legacyCorrelation: correlation(legacy),
        noiseRms: rms(noise, 0.01, 0.03),
        soloPeak: Math.max(...Array.from(solo, Math.abs)),
        repeatError: Math.max(...Array.from(data, (value, i) => Math.abs(value - repeated[i]))),
        shortTail: Math.max(...Array.from(short.slice(Math.ceil(0.06 * sampleRate)), Math.abs)),
      });
    }
    return results;
  });
  for (const result of proof) {
    expect(result.early).toBeGreaterThan(0.02);
    expect(result.late / result.early).toBeLessThan(0.03);
    expect(Math.abs(result.correlation)).toBeLessThan(0.2);
    expect(result.legacyCorrelation).toBeGreaterThan(0.8);
    expect(result.noiseRms).toBeGreaterThan(0.02);
    expect(result.soloPeak).toBe(0);
    expect(result.repeatError).toBe(0);
    expect(result.shortTail).toBe(0);
  }
});

test('editing and enabling noise mid-note keeps the original hit age and cleans up on Stop', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { hiHatPreset } = await import('/src/core/' + 'instrumentPresets.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { AudioEngine } = await import('/src/audio/' + 'engine.ts');
    const sound = hiHatPreset();
    sound.harmonics.fill(0);
    const context = new OfflineAudioContext(1, 48000, 48000);
    const voice = createVoice(context, context.destination, sound, 261.625565, 0, 0.5);
    const suspended = context.suspend(0.12);
    const rendering = context.startRendering();
    await suspended;
    const changed = structuredClone(sound);
    changed.percussion!.noise = 0.65;
    voice.update(changed);
    await context.resume();
    const data = (await rendering).getChannelData(0);
    const enabledContext = new OfflineAudioContext(1, 48000, 48000);
    const silent = structuredClone(sound);
    silent.percussion!.noise = 0;
    const enabledVoice = createVoice(
      enabledContext,
      enabledContext.destination,
      silent,
      261.625565,
      0,
      0.5,
    );
    const enableAt = enabledContext.suspend(0.12);
    const enabledRendering = enabledContext.startRendering();
    await enableAt;
    enabledVoice.update(sound);
    await enabledContext.resume();
    const enabledData = (await enabledRendering).getChannelData(0);
    enabledVoice.dispose();
    const rms = (from: number, to: number) => {
      const slice = data.slice(Math.floor(from * 48000), Math.floor(to * 48000));
      return Math.sqrt(slice.reduce((sum, value) => sum + value * value, 0) / slice.length);
    };
    voice.dispose();
    voice.dispose();
    const engine = new AudioEngine();
    await engine.audition(sound, [261.625565]);
    const session = engine.session;
    engine.stop();
    for (let i = 0; i < 40 && session.ownedVoices.size; i++)
      await new Promise((resolve) => setTimeout(resolve, 25));
    await engine.context.close();
    return {
      early: rms(0.01, 0.03),
      afterEdit: rms(0.15, 0.17),
      remaining: session.ownedVoices.size,
      enabledPeak: Math.max(...Array.from(enabledData.slice(7200, 8160), Math.abs)),
      initialPeak: Math.max(...Array.from(data.slice(480, 1440), Math.abs)),
    };
  });
  expect(proof.afterEdit / proof.early).toBeLessThan(0.08);
  expect(proof.remaining).toBe(0);
  expect(proof.enabledPeak).toBeGreaterThan(0);
  expect(proof.enabledPeak / proof.initialPeak).toBeLessThan(0.08);
});

test('percussion voices produce bounded finite short-hit audio at both sample rates', async ({
  page,
}) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const { PERCUSSION_PRESETS } = await import('/src/core/' + 'instrumentPresets.ts');
    const { pitch } = await import('/src/core/' + 'music.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const results = [];
    for (const sampleRate of [44100, 48000])
      for (const preset of PERCUSSION_PRESETS) {
        const sound = preset.createSound();
        const duration = preset.noteBeats * 0.5;
        const end = duration + sound.release;
        const context = new OfflineAudioContext(
          1,
          Math.ceil((end + 0.03) * sampleRate),
          sampleRate,
        );
        createVoice(context, context.destination, sound, pitch(preset.note).frequency, 0, duration);
        const data = (await context.startRendering()).getChannelData(0);
        results.push({
          key: preset.key,
          sampleRate,
          finite: data.every(Number.isFinite),
          peak: Math.max(...Array.from(data, Math.abs)),
          rms: Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length),
          tail: Math.max(...Array.from(data.slice(Math.ceil((end + 0.01) * sampleRate)), Math.abs)),
        });
      }
    return results;
  });
  expect(results).toHaveLength(6);
  for (const result of results) {
    expect(result.finite).toBe(true);
    expect(result.peak).toBeGreaterThan(0.05);
    expect(result.peak).toBeLessThan(0.65);
    expect(result.rms).toBeGreaterThan(0.01);
    expect(result.tail).toBe(0);
  }
});
