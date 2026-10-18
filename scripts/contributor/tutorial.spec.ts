import { expect, test } from '@playwright/test';

test('newly copied modules appear in the host and render the expected gain at both rates', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Tutorial pluck tutorialPluck', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await expect(page.getByText('Tutorial level', { exact: true })).toBeVisible();
  const results = await page.evaluate(async () => {
    const { pedalModules } = await import('/src/modules/' + 'assembly.ts');
    const { defaultModuleSettings } = await import('/src/modules/' + 'index.ts');
    const module = pedalModules.get('tutorial:pedal/level')!;
    const errors = [];
    for (const rate of [44100, 48000]) {
      const context = new OfflineAudioContext(1, rate / 10, rate);
      const source = context.createConstantSource();
      source.offset.value = 0.1;
      const settings = defaultModuleSettings(module);
      settings.output = -6;
      const processor = module.create(context, settings, false, {
        sampleRate: rate,
        compressorLatency: 0,
        oversamplingLatency: 0,
      });
      source.connect(processor.input);
      processor.output.connect(context.destination);
      source.start();
      const data = (await context.startRendering()).getChannelData(0);
      errors.push(Math.max(...data.map((sample) => Math.abs(sample - 0.1 * 10 ** (-6 / 20)))));
      processor.dispose();
      processor.dispose();
    }
    return errors;
  });
  for (const error of results) expect(error).toBeLessThan(1e-7);
});
