import { expect, test, type Locator, type Page } from '@playwright/test';
import { placePedal } from '../helpers/board';

async function setup(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'overdrive');
  return {
    dial: page.getByRole('slider', { name: 'overdrive 1 drive dial', exact: true }),
    exact: page.getByRole('spinbutton', { name: 'overdrive 1 drive exact value', exact: true }),
    range: page.getByRole('slider', { name: 'overdrive 1 drive', exact: true }),
  };
}
async function circle(dial: Locator) {
  await dial.scrollIntoViewIfNeeded();
  const box = (await dial.boundingBox())!;
  return (degrees: number, radius = Math.min(box.width, box.height) / 2 - 4) => ({
    x: box.x + box.width / 2 + Math.sin((degrees * Math.PI) / 180) * radius,
    y: box.y + box.height / 2 - Math.cos((degrees * Math.PI) / 180) * radius,
  });
}
async function move(page: Page, point: { x: number; y: number }) {
  await page.mouse.move(point.x, point.y);
}
test('circular dragging has no grab jump, keeps capture outside the dial and undoes one whole gesture', async ({
  page,
}) => {
  const { dial, exact, range } = await setup(page);
  const point = await circle(dial);
  await move(page, point(0));
  await page.mouse.down();
  await expect(exact).toHaveValue('6');
  for (let angle = 15; angle <= 45; angle += 15) await move(page, point(angle, 55));
  await expect(exact).toHaveValue('10');
  await page.waitForTimeout(1100); // Exceed the ordinary edit grouping timeout mid-gesture.
  for (let angle = 60; angle <= 90; angle += 15) await move(page, point(angle, 55));
  await page.mouse.up();
  await expect(exact).toHaveValue('14');
  await expect(range).toHaveValue('14');
  await expect(dial).toHaveAttribute('aria-valuenow', '14');
  await move(page, point(135, 55));
  await expect(exact).toHaveValue('14');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(exact).toHaveValue('6');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(exact).toHaveValue('14');
  await move(page, point(90));
  await page.mouse.down();
  await move(page, point(135));
  await page.mouse.up();
  await expect(exact).toHaveValue('18');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(exact).toHaveValue('14');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(exact).toHaveValue('6');
  await page.screenshot({ path: '.test-results/interactive-pedal-dials.png', fullPage: true });
});

test('dial rotation crosses the bottom seam smoothly, clamps endpoints and reverses immediately', async ({
  page,
}) => {
  const { dial, exact } = await setup(page);
  const point = await circle(dial);
  await move(page, point(170));
  await page.mouse.down();
  for (let angle = 175; angle <= 190; angle += 5) await move(page, point(angle));
  await expect(exact).toHaveValue('8');
  for (let angle = 205; angle <= 490; angle += 15) await move(page, point(angle));
  await expect(exact).toHaveValue('24');
  await move(page, point(445));
  await expect(exact).toHaveValue('20');
  for (let angle = 430; angle >= 70; angle -= 15) await move(page, point(angle));
  await expect(exact).toHaveValue('0');
  await page.mouse.up();
});

test('focused dial supports keyboard values and stays linked with numeric edits', async ({
  page,
}) => {
  const { dial, exact, range } = await setup(page);
  await dial.focus();
  await dial.press('ArrowUp');
  await expect(exact).toHaveValue('6.5');
  await dial.press('PageUp');
  await expect(range).toHaveValue('11.5');
  await dial.press('Home');
  await expect(exact).toHaveValue('0');
  await dial.press('End');
  await expect(exact).toHaveValue('24');
  await dial.press('ArrowRight');
  await expect(exact).toHaveValue('24');
  await dial.press('ArrowLeft');
  await expect(exact).toHaveValue('23.5');
  await exact.fill('12');
  await expect(dial).toHaveAttribute('aria-valuenow', '12');
  await expect(dial).toHaveAttribute('aria-valuetext', '12 dB');
  await expect(dial.locator('span')).toHaveAttribute('style', 'transform: rotate(0deg);');
});
