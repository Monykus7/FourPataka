import { expect, test } from '@playwright/test';

test('waveform drawing updates coefficients, preserves A/B and supports one-stroke undo', async ({
  page,
}) => {
  await page.goto('/');
  const h1 = page.getByRole('spinbutton', { name: 'H1 exact magnitude' });
  const before = await h1.inputValue();
  const workspace = page.getByRole('region', { name: 'Fourier workspace' });
  await page.getByRole('button', { name: 'Waveform', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Signed harmonic coefficients preview' }),
  ).toBeVisible();
  const wave = page.getByRole('img', { name: 'Editable harmonic source waveform' });
  await wave.scrollIntoViewIfNeeded();
  const box = (await wave.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5, { steps: 30 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Harmonics', exact: true }).click();
  await expect(h1).not.toHaveValue(before);
  const drawn = await h1.inputValue();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(h1).toHaveValue(before);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(h1).toHaveValue(drawn);
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(h1).toHaveValue(before);
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(h1).toHaveValue(drawn);
  await page.waitForTimeout(450);
  await page.reload();
  await expect(h1).toHaveValue(drawn);
  await page.getByRole('button', { name: 'Waveform', exact: true }).click();
  await page.screenshot({ path: '.test-results/fourier-workspace.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
