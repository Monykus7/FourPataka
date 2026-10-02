import { expect, test } from '@playwright/test';
import { patchBoard, placePedal } from '../helpers/board';

test('saved board presets and A/B/master copies keep their own placements and cables', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'eq');
  const handle = page.getByRole('button', { name: 'Move eq 1 on board', exact: true });
  await handle.focus();
  await handle.press('ArrowRight');
  await handle.press('ArrowRight');
  await page.getByRole('textbox', { name: 'New chain preset name' }).fill('Placed EQ');
  await page.getByRole('button', { name: 'Save chain as new', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  await handle.focus();
  await handle.press('ArrowDown');
  await page.getByRole('button', { name: 'Save chain preset', exact: true }).click();
  await expect
    .poll(async () => {
      const p = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
      );
      if (!p?.processing?.library?.some((preset: any) => preset.label === 'Placed EQ')) return null;
      const boards = [
        p.processing.audition.A,
        p.processing.audition.B,
        p.processing.master,
        p.processing.library.find((preset: any) => preset.label === 'Placed EQ').chain,
      ];
      return boards.map((chain: any) => ({
        position: chain.board?.positions[chain.pedals[0].id],
        cables: chain.board?.cables.length,
      }));
    })
    .toEqual([
      { position: { column: 2, row: 1 }, cables: 2 },
      { position: { column: 2, row: 0 }, cables: 2 },
      { position: { column: 2, row: 0 }, cables: 2 },
      { position: { column: 2, row: 1 }, cables: 2 },
    ]);
  await page.getByRole('combobox', { name: 'Pedal editing destination' }).selectOption('master');
  await expect(page.locator('.compact-pedal.eq')).toHaveCSS('top', '32px');
  await page.getByRole('button', { name: 'Load chain preset', exact: true }).click();
  await expect(page.locator('.compact-pedal.eq')).toHaveCSS('top', '268px');
  await expect(page.locator('.board-route-status')).toHaveText('1 in signal path');
});

test('collision and Escape cancel movement while the connected cables follow the preview', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'eq');
  await placePedal(page, 'overdrive');
  const pedal = page.locator('.compact-pedal.eq');
  const original = (await pedal.getAttribute('style'))!;
  const cable = page.locator('.board-cable .cable-wire').first();
  const path = (await cable.getAttribute('d'))!;
  const grip = page.getByRole('button', { name: 'Move eq 1 on board', exact: true });
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + 12, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 172, box.y + 5, { steps: 6 });
  await expect(cable).not.toHaveAttribute('d', path);
  await page.mouse.up();
  await expect(pedal).toHaveAttribute('style', original);
  await expect(page.getByText('That slot already holds a pedal.', { exact: true })).toBeVisible();
  await page.mouse.move(box.x + 12, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 12, box.y + 241, { steps: 6 });
  await grip.focus();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(pedal).toHaveAttribute('style', original);
  await expect(cable).toHaveAttribute('d', path);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  // Canceled movement did not consume an undo entry: the last cable is removed instead.
  await expect(page.locator('.board-route-status')).toHaveText('Output unplugged');
});

test('removal clears an active patch gesture and cable disconnect is keyboard accessible and undoable', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await placePedal(page, 'eq');
  await page.getByRole('button', { name: 'eq 1 output jack', exact: true }).click();
  await expect(page.locator('.draft-cable')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remove eq 1', exact: true }).click();
  await expect(page.locator('.draft-cable')).toHaveCount(0);
  await expect(page.locator('.compact-pedal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const cable = page.getByRole('button', {
    name: 'Select cable from Three-band EQ 1 to Board output',
    exact: true,
  });
  await cable.focus();
  await cable.press('Enter');
  await page.getByRole('button', { name: 'Disconnect cable', exact: true }).click();
  await expect(page.locator('.board-route-status')).toHaveText('Output unplugged');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.board-route-status')).toHaveText('1 in signal path');
});

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
      const positions = p?.processing?.audition?.A?.board?.positions;
      return positions ? Object.values(positions)[0] : null;
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
