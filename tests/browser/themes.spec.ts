import { expect, test } from '@playwright/test';

test('themes color the whole studio, keep tertiary accents, and persist independently of projects', async ({
  page,
}) => {
  await page.goto('/');
  const select = page.getByRole('combobox', { name: 'Theme preset' });
  await expect(select.locator('option')).toHaveCount(5);
  for (const id of ['hues-12', 'hues-10', 'hues-6', 'earth', 'original']) {
    await page.getByRole('button', { name: 'Waveform', exact: true }).click();
    await select.selectOption(id);
    await expect(page.locator('html')).toHaveAttribute('data-theme', id);
    const colors = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        bg: root.getPropertyValue('--bg').trim(),
        tertiary: root.getPropertyValue('--tertiary').trim(),
        body: getComputedStyle(document.body).color,
        dot: getComputedStyle(document.querySelector('.wave-point')!).fill,
        ink: root.getPropertyValue('--text').trim(),
      };
    });
    expect(colors.dot).toBe(
      await page.evaluate((hex) => {
        const el = document.createElement('span');
        el.style.color = hex;
        document.body.append(el);
        const color = getComputedStyle(el).color;
        el.remove();
        return color;
      }, colors.tertiary),
    );
    await page.getByRole('button', { name: 'Compose', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Score editor' })).toBeVisible();
    expect(await page.locator('.cm-editor').evaluate((el) => getComputedStyle(el).color)).toBe(
      colors.body,
    );
    if (id !== 'original')
      await page.screenshot({ path: `.test-results/theme-${id}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  }
  await select.selectOption('earth');
  const swatches = await page
    .locator('.theme-swatches > span')
    .evaluateAll((els) => els.map((el) => el.getAttribute('title')));
  expect(swatches).toEqual(['#9A7F62', '#5F6E73', '#697E60', '#D6D2C4', '#B7A99A']);
  await page.reload();
  await expect(select).toHaveValue('earth');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(select).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/theme-earth-mobile.png', fullPage: true });
});

test('changing themes preserves comparison playback and musical undo history', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill(
      'tempo 20\ntrack melody using brightReed {\n C4 whole\n C5 whole\n}\ntrack bass using softBass {\n C2 whole\n C3 whole\n}',
    );
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('combobox', { name: 'Comparison material' }).selectOption('phrase');
  await page.getByRole('spinbutton', { name: 'H1 exact magnitude' }).fill('0.6');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  const progress = page.getByRole('progressbar', { name: 'Comparison phrase progress' });
  await expect.poll(async () => Number(await progress.getAttribute('value'))).toBeGreaterThan(0.25);
  const before = Number(await progress.getAttribute('value'));
  await page.getByRole('combobox', { name: 'Theme preset' }).selectOption('hues-10');
  await expect
    .poll(async () => Number(await progress.getAttribute('value')))
    .toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'H1 exact magnitude' })).toHaveValue('1');
  await expect(page.getByRole('combobox', { name: 'Theme preset' })).toHaveValue('hues-10');
});
