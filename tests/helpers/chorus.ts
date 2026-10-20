import { expect, type Page } from '@playwright/test';
import { dragEquipment, patchBoard } from './board';

export async function chorusWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await dragEquipment(page, 'chorus');
  await expect(page.locator('.compact-pedal')).toHaveCount(1);
  await patchBoard(page);
  const exact = (label: string) =>
    page.getByRole('spinbutton', {
      name: `fourpataka:pedal/chorus 1 ${label} exact value`,
      exact: true,
    });
  const rate = exact('rate'),
    time = exact('base delay'),
    depth = exact('depth');
  await time.fill('5');
  await depth.fill('100');
  await rate.fill('0.8');
  const dial = page.getByRole('slider', {
    name: 'fourpataka:pedal/chorus 1 rate dial',
    exact: true,
  });
  await dial.focus();
  await dial.press('ArrowUp');
  await expect(rate).toHaveValue('0.85');
  await page
    .getByRole('textbox', { name: 'New chain preset name', exact: true })
    .fill('Slow chorus');
  await page.getByRole('button', { name: 'Save chain as new', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Chain application destination', exact: true })
    .selectOption('master');
  await page.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  await rate.fill('1.2');
  await time.fill('30');
  await depth.fill('0');
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(rate).toHaveValue('0.85');
  await expect(time).toHaveValue('5');
  await expect(depth).toHaveValue('100');
  await page.getByRole('button', { name: 'Reset chorus 1', exact: true }).click();
  await expect(rate).toHaveValue('0.8');
  await expect(time).toHaveValue('15');
  await expect(depth).toHaveValue('30');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(time).toHaveValue('5');
  await expect(depth).toHaveValue('100');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing.master.pedals[0]
            ?.params.depth,
      ),
    )
    .toBe(100);
}
