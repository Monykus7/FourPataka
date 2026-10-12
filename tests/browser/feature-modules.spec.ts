import { expect, test } from '@playwright/test';
import { featureModuleWorkflow } from '../helpers/featureModules';

test('registered panels own settings undo source insertion visibility and metering', async ({
  page,
}) => {
  await page.goto('/');
  await featureModuleWorkflow(page);
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('region', { name: 'Partial pair', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/feature-panels-narrow.png', fullPage: true });
});

test('unknown feature data survives reload and registered panels guard score playback source edits', async ({
  page,
}) => {
  await page.goto('/');
  const fixture = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const p = createProject();
    p.featureSettings = {
      'future:feature/panel': {
        apiVersion: 8,
        dataVersion: 9,
        settings: { deep: ['keep'] },
        extra: 'original',
      },
    };
    return JSON.stringify(p);
  });
  await page.addInitScript((fixture) => {
    if (!sessionStorage.getItem('feature-fixture-loaded')) {
      localStorage.setItem('fourpataka.project.v1', fixture);
      sessionStorage.setItem('feature-fixture-loaded', '1');
    }
  }, fixture);
  await page.reload();
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Unavailable feature', exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!)))
          .featureSettings['future:feature/panel'].extra,
    )
    .toBe('original');
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Insert octave pair', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Insert octave pair', exact: true })).toBeEnabled();
});

test('registered command metadata is searchable and source descriptors distinguish unsupported engines', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('combobox', { name: 'Synthesis engine', exact: true })
    .selectOption('example:engine/basic-tone');
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Fourier source', exact: true })).toContainText(
    'unavailable for this engine',
  );
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const reference = page.getByRole('region', { name: 'Command reference', exact: true });
  await reference
    .getByRole('textbox', { name: 'Search commands', exact: true })
    .fill('octave pair');
  await expect(reference).toContainText('Two notes an octave apart');
});
