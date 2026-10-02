import { expect, test } from '@playwright/test';
import { patchBoard, placePedal } from '../helpers/board';

test('equipment is picked before placement and cable jacks control the real path', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Add (EQ|compressor|overdrive)$/ })).toHaveCount(
    0,
  );
  await placePedal(page, 'eq', false);
  await expect(page.locator('.compact-pedal')).toContainText('UNPATCHED');
  await page.getByRole('button', { name: 'Equipment', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Patch cable', exact: true }).click();
  const start = page.getByRole('button', { name: 'Board input output jack', exact: true }),
    end = page.getByRole('button', { name: 'eq 1 input jack', exact: true });
  const a = (await start.boundingBox())!,
    b = (await end.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.board-route-status')).toHaveText('Output unplugged');
  await page.getByRole('button', { name: 'eq 1 output jack', exact: true }).click();
  await page.getByRole('button', { name: 'Board output input jack', exact: true }).click();
  await expect(page.locator('.board-route-status')).toHaveText('1 in signal path');
  await page.getByRole('button', { name: 'Cancel tool', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected pedal controls' })).toContainText(
    'Three-band EQ',
  );
  await page.screenshot({ path: '.test-results/physical-board-desktop.png', fullPage: true });
});

test('captured placement drags snap, persist and undo without changing the cables', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'overdrive');
  const original = await page.locator('.compact-pedal').getAttribute('style');
  const grip = page.getByRole('button', { name: 'Move overdrive 1 on board', exact: true });
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + 12, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 172, box.y + 241, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.compact-pedal')).not.toHaveAttribute('style', original!);
  await expect(page.locator('.board-route-status')).toHaveText('1 in signal path');
  const moved = await page.locator('.compact-pedal').getAttribute('style');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.compact-pedal')).toHaveAttribute('style', original!);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect
    .poll(async () => {
      const p = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
      );
      return Object.values(p.processing.audition.A.board.positions)[0];
    })
    .toEqual({ column: 1, row: 1 });
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await expect(page.locator('.compact-pedal')).toHaveAttribute('style', moved!);
});

test('mouse cables reject loops and moving handles work with the keyboard at narrow widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'eq');
  await placePedal(page, 'overdrive');
  await page.getByRole('button', { name: 'overdrive 2 output jack', exact: true }).click();
  await page.getByRole('button', { name: 'eq 1 input jack', exact: true }).click();
  await expect(
    page.getByText('Patch cables cannot form a feedback loop.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel tool', exact: true }).click();
  const grip = page.getByRole('button', { name: 'Move eq 1 on board', exact: true });
  await grip.focus();
  await grip.press('ArrowDown');
  await expect(page.locator('.compact-pedal.eq')).toHaveCSS('top', '268px');
  await patchBoard(page, [1, 0]);
  await expect(page.locator('.compact-pedal.eq')).toContainText('PATH 2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/physical-board-mobile.png', fullPage: true });
});
