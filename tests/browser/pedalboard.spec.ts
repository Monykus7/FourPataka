import { expect, test } from '@playwright/test';

test('pedal rack cables follow actual order, footswitches work by keyboard, and long chains scroll locally', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  const board = page.getByRole('region', { name: 'Pedalboard', exact: true });
  await expect(
    page.getByRole('img', { name: 'Cable from Instrument A to Project mix', exact: true }),
  ).toBeVisible();
  await board.getByRole('button', { name: 'Add compressor', exact: true }).click();
  await board.getByRole('button', { name: 'Add overdrive', exact: true }).click();
  await expect(page.getByRole('img', { name: /^Cable from / })).toHaveCount(3);
  await expect(
    page.getByRole('img', { name: 'Cable from Compressor 1 to Overdrive 2', exact: true }),
  ).toBeVisible();
  await board.getByRole('button', { name: 'Move overdrive 2 left', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Cable from Instrument A to Overdrive 1', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Cable from Overdrive 1 to Compressor 2', exact: true }),
  ).toBeVisible();
  const bypass = board.getByRole('checkbox', { name: 'Bypass compressor 2', exact: true });
  await bypass.focus();
  await page.keyboard.press('Space');
  await expect(bypass).toBeChecked();
  await expect(board.locator('.compressor')).toHaveClass(/bypassed/);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(bypass).not.toBeChecked();
  const drive = board.getByRole('spinbutton', { name: 'overdrive 1 drive exact value' });
  await drive.fill('12');
  await expect(board.getByRole('slider', { name: 'overdrive 1 drive', exact: true })).toHaveValue(
    '12',
  );
  await page.screenshot({ path: '.test-results/pedal-rack-desktop.png', fullPage: true });
  await board.getByRole('button', { name: 'Listen to chain', exact: true }).click();
  await expect(board).toHaveClass(/signal-live/);
  await expect(page.getByRole('img', { name: 'After pedals waveform', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await page.getByRole('combobox', { name: 'Theme preset' }).selectOption('earth');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('img', { name: 'Cable from Overdrive 1 to Compressor 2', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/pedal-rack-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1040 });
  for (let i = 0; i < 6; i++)
    await board.getByRole('button', { name: 'Add overdrive', exact: true }).click();
  await expect(board.getByRole('button', { name: 'Add overdrive', exact: true })).toBeDisabled();
  await expect(page.getByRole('img', { name: /^Cable from / })).toHaveCount(9);
  const rack = page.getByRole('region', { name: 'Cable-connected pedal rack', exact: true });
  expect(await rack.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await board.getByRole('combobox', { name: 'Pedal editing destination' }).selectOption('master');
  await expect(
    page.getByRole('img', { name: 'Cable from Track mix to Project mix', exact: true }),
  ).toBeVisible();
});

test('Compose edit links target the right dedicated chain and tab changes keep audio running', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill(
      'tempo 60\ntrack melody using brightReed {\n C4 whole\n C5 whole\n}\ntrack bass using softBass {\n C2 whole\n C3 whole\n}',
    );
  await page
    .locator('.track-instance')
    .first()
    .getByRole('button', { name: 'Edit pedals', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Pedalboard', exact: true })).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Pedal editing destination', exact: true }),
  ).toHaveValue('track:melody');
  await page.getByRole('button', { name: 'Add compressor', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Cable from melody instrument to Compressor 1', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .locator('.track-instances > .track-chain-controls')
    .getByRole('button', { name: 'Edit pedals', exact: true })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Pedal editing destination', exact: true }),
  ).toHaveValue('master');
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('audition');
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('combobox', { name: 'Comparison material' }).selectOption('phrase');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  const progress = page.getByRole('progressbar', { name: 'Comparison phrase progress' });
  await expect.poll(async () => Number(await progress.getAttribute('value'))).toBeGreaterThan(0.2);
  const before = Number(await progress.getAttribute('value'));
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Pedalboard', exact: true })).toHaveClass(
    /signal-live/,
  );
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await expect
    .poll(async () => Number(await progress.getAttribute('value')))
    .toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Stop all sound' }).click();
});
