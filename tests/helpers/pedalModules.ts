import { expect, type Page } from '@playwright/test';
import { dragEquipment, patchBoard } from './board';
export async function levelModuleWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await dragEquipment(page, 'level');
  await expect(page.locator('.compact-pedal')).toHaveCount(1);
  await patchBoard(page);
  const output = page.getByRole('spinbutton', {
    name: 'example:pedal/level 1 output exact value',
    exact: true,
  });
  await output.fill('-6.5');
  const dial = page.getByRole('slider', { name: 'example:pedal/level 1 output dial', exact: true });
  await dial.focus();
  await dial.press('ArrowUp');
  await expect(output).toHaveValue('-6');
  await page
    .getByRole('textbox', { name: 'New chain preset name', exact: true })
    .fill('Tutorial level');
  await page.getByRole('button', { name: 'Save chain as new', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Chain application destination', exact: true })
    .selectOption('master');
  await page.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  await output.fill('-12');
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(output).toHaveValue('-6');
  await page.getByRole('button', { name: 'Reset level 1', exact: true }).click();
  await expect(output).toHaveValue('0');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(output).toHaveValue('-6');
  await page.screenshot({ path: '.test-results/level-module-desktop.png', fullPage: true });
}
