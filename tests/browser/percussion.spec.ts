import { expect, test } from '@playwright/test';
import { percussionWorkflow, percussionAvailabilityWorkflow } from '../helpers/percussion';

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
    const rendered = await pending;
    const data = rendered.buffer.getChannelData(0);
    return {
      keys: rendered.plan.snapshot.tracks.map((t: any) => t.key),
      peak: Math.max(...Array.from(data, Math.abs)),
      finite: data.every(Number.isFinite),
      hatH31: rendered.plan.snapshot.tracks.find((t: any) => t.key === 'hatTrack').sound
        .harmonics[30],
      tail: Math.max(...Array.from(data.slice(-480), Math.abs)),
    };
  });
  expect(proof.keys).toEqual(['kickTrack', 'snareTrack', 'hatTrack']);
  expect(proof.hatH31).toBe(0.21);
  expect(proof.finite).toBe(true);
  expect(proof.peak).toBeGreaterThan(0.05);
  expect(proof.peak).toBeLessThan(1);
  expect(proof.tail).toBe(0);
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
