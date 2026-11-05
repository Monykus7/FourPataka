import { expect, type Page } from '@playwright/test';
import { dragEquipment, patchBoard } from './board';
export async function reverbWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await dragEquipment(page, 'reverb');
  await expect(page.locator('.compact-pedal')).toHaveCount(1);
  await patchBoard(page);
  const exact = (label: string) =>
    page.getByRole('spinbutton', {
      name: 'fourpataka:pedal/reverb 1 ' + label + ' exact value',
      exact: true,
    });
  await exact('pre-delay').fill('20');
  await exact('decay').fill('0.4');
  await exact('size').fill('150');
  await exact('damping').fill('4200');
  const dial = page.getByRole('slider', {
    name: 'fourpataka:pedal/reverb 1 decay dial',
    exact: true,
  });
  await dial.focus();
  await dial.press('ArrowUp');
  await expect(exact('decay')).toHaveValue('0.5');
  await page
    .getByRole('textbox', { name: 'New chain preset name', exact: true })
    .fill('Small space');
  await page.getByRole('button', { name: 'Save chain as new', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Chain application destination', exact: true })
    .selectOption('master');
  await page.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  await exact('decay').fill('1.2');
  await exact('pre-delay').fill('80');
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(exact('decay')).toHaveValue('0.5');
  await expect(exact('pre-delay')).toHaveValue('20');
  await page.getByRole('button', { name: 'Reset reverb 1', exact: true }).click();
  await expect(exact('decay')).toHaveValue('1.5');
  await expect(exact('pre-delay')).toHaveValue('15');
  await expect(exact('size')).toHaveValue('100');
  await expect(exact('damping')).toHaveValue('6500');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(exact('decay')).toHaveValue('0.5');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing.master.pedals[0]
            ?.params.decay,
      ),
    )
    .toBe(0.5);
}
export async function verifyReverbListenStop(page: Page) {
  await page.evaluate(() => {
    const stats = { created: 0, disconnected: 0 };
    (window as any).reverbProof = stats;
    const original = AudioContext.prototype.createBiquadFilter;
    AudioContext.prototype.createBiquadFilter = function () {
      const node = original.call(this),
        disconnect = node.disconnect.bind(node);
      stats.created++;
      node.disconnect = ((...args: any[]) => {
        if (!args.length) stats.disconnected++;
        (disconnect as any)(...args);
      }) as typeof node.disconnect;
      return node;
    };
  });
  await page.getByRole('slider', { name: 'Monitor volume', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).reverbProof.created)).toBe(8);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).reverbProof.disconnected)).toBe(8);
}
