import { expect, test } from '@playwright/test';
import { presetModuleWorkflow } from '../helpers/presetModules';
test('registered example selects previews composes and survives reload', async ({ page }) => {
  await page.goto('/');
  await presetModuleWorkflow(page);
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('fourpataka.project.v1')!).tracks.some(
          (t: any) => t.key === 'plucks',
        ),
      ),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.locator('.cm-content')).toContainText('using mellowPluck');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await page.screenshot({ path: '.test-results/preset-module-narrow.png', fullPage: true });
});
test('existing library discovers missing bundled timbre only through explicit import with undo', async ({
  page,
}) => {
  await page.goto('/');
  const seed = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const p = createProject();
    p.instruments = p.instruments.filter((i: any) => i.key !== 'mellowPluck');
    return p;
  });
  await page.addInitScript(
    (p) => localStorage.setItem('fourpataka.project.v1', JSON.stringify(p)),
    seed,
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Mellow pluck mellowPluck', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Add bundled presets', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Mellow pluck mellowPluck', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Mellow pluck mellowPluck', exact: true }),
  ).toHaveCount(0);
});
test('registry settings render finite audio and frozen owned WAV at both rates without module envelopes', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { instrumentModules } = await import('/src/modules/' + 'assembly.ts');
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { createProject, importProject } = await import('/src/core/' + 'project.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const rows = [];
    for (const rate of [44100, 48000]) {
      for (const definition of instrumentModules.definitions) {
        const context = new OfflineAudioContext(1, rate / 2, rate),
          sound = definition.createSound();
        const voice = createVoice(context, context.destination, sound, 261.625565, 0, 0.2);
        const samples = (await context.startRendering()).getChannelData(0);
        let peak = 0;
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
        rows.push({ finite: samples.every(Number.isFinite), peak });
        voice.dispose();
      }
      const p = createProject();
      p.scoreText = 'tempo 120\ntrack plucks using mellowPluck {\n C4 quarter\n}';
      const options = { sampleRate: rate, channels: 1 as const, tailSeconds: 0 };
      const pending = renderWav(p, options);
      p.instruments.find((i: any) => i.key === 'mellowPluck')!.sound.harmonics[0] = 0;
      const frozen = await pending;
      const original = createProject();
      original.scoreText = frozen.plan.snapshot.scoreText;
      const loaded = importProject(JSON.stringify(original));
      const second = await renderWav(loaded, options);
      const a = frozen.buffer.getChannelData(0),
        b = second.buffer.getChannelData(0);
      let error = 0;
      for (let i = 0; i < a.length; i++) error = Math.max(error, Math.abs(a[i] - b[i]));
      rows.push({
        finite: JSON.stringify(loaded).includes('example:instrument') === false,
        peak: error,
      });
    }
    return rows;
  });
  expect(proof).toHaveLength(22);
  for (const row of proof) {
    expect(row.finite).toBe(true);
    expect(row.peak).toBeLessThan(1);
  }
  expect(proof[10].peak).toBeLessThan(1e-7);
  expect(proof[21].peak).toBeLessThan(1e-7);
});
