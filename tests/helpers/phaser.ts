import { expect, type Page } from '@playwright/test';
import { dragEquipment, patchBoard } from './board';

export async function phaserWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await dragEquipment(page, 'phaser');
  await expect(page.locator('.compact-pedal')).toHaveCount(1);
  await patchBoard(page);
  const stages = page.getByRole('combobox', {
    name: 'fourpataka:pedal/phaser 1 stages exact value',
    exact: true,
  });
  await stages.selectOption('8');
  const rate = page.getByRole('spinbutton', {
    name: 'fourpataka:pedal/phaser 1 rate exact value',
    exact: true,
  });
  await rate.fill('0.8');
  const dial = page.getByRole('slider', {
    name: 'fourpataka:pedal/phaser 1 rate dial',
    exact: true,
  });
  await dial.focus();
  await dial.press('ArrowUp');
  await expect(rate).toHaveValue('0.85');
  await page
    .getByRole('textbox', { name: 'New chain preset name', exact: true })
    .fill('Slow phaser');
  await page.getByRole('button', { name: 'Save chain as new', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Chain application destination', exact: true })
    .selectOption('master');
  await page.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  await rate.fill('1.2');
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(rate).toHaveValue('0.85');
  await expect(stages).toHaveValue('8');
  await page.getByRole('button', { name: 'Reset phaser 1', exact: true }).click();
  await expect(stages).toHaveValue('6');
  await expect(rate).toHaveValue('0.5');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(stages).toHaveValue('8');
  await expect(rate).toHaveValue('0.85');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing.master.pedals[0]
            ?.params.stages,
      ),
    )
    .toBe(8);
}
