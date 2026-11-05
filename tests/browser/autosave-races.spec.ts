import { expect, test } from '@playwright/test';
import { engineInstrumentWorkflow } from '../helpers/engineInstruments';
import { featureModuleWorkflow } from '../helpers/featureModules';
import { phaserWorkflow } from '../helpers/phaser';
import { levelModuleWorkflow } from '../helpers/pedalModules';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const schedule = window.setTimeout.bind(window);
    // Deliberately keep UI updates ahead of the400ms autosave. Helpers must
    // wait for persisted values rather than depend on machine/browser speed.
    window.setTimeout = ((handler, timeout, ...args) =>
      schedule(handler, timeout === 400 ? 1200 : timeout, ...args)) as typeof window.setTimeout;
  });
  await page.goto('/');
});

test('engine Apply and undo wait for an asynchronously created persisted track', async ({
  page,
}) => {
  await engineInstrumentWorkflow(page);
});

test('feature visibility compares the persisted redo snapshot', async ({ page }) => {
  await featureModuleWorkflow(page);
});

test('phaser reload waits through an initially absent autosave', async ({ page }) => {
  await phaserWorkflow(page);
});

test('level reload waits through an initially absent autosave', async ({ page }) => {
  await levelModuleWorkflow(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('fourpataka.project.v1')!)?.processing.master.pedals[0]
            ?.params.output,
      ),
    )
    .toBe(-6);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(
    page.getByRole('spinbutton', { name: 'example:pedal/level 1 output exact value', exact: true }),
  ).toHaveValue('-6');
});
