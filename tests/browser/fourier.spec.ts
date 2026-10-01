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
  await page.getByRole('button', { name: 'Draw', exact: true }).click();
  const wave = page.getByRole('group', { name: 'Editable harmonic source waveform' });
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

test('dots add, drag, edit precisely, persist across A/B and reset with undo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Waveform', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dots', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const wave = page.getByRole('group', { name: 'Editable harmonic source waveform' });
  await wave.scrollIntoViewIfNeeded();
  const box = (await wave.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.21, box.y + box.height * 0.3);
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(6);
  const amplitude = page.getByRole('spinbutton', { name: 'Selected dot amplitude' });
  await amplitude.fill('-.5');
  const dot = page.getByRole('button', { name: 'Wave point 3', exact: true });
  await dot.focus();
  await dot.press('ArrowUp');
  await expect(amplitude).not.toHaveValue('-0.5');
  const original = await dot.getAttribute('cy');
  const dotBox = (await dot.boundingBox())!;
  await page.mouse.move(dotBox.x + dotBox.width / 2, dotBox.y + dotBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dotBox.x + dotBox.width / 2 + 10, dotBox.y + dotBox.height / 2 - 40, {
    steps: 10,
  });
  await page.mouse.up();
  await expect(dot).not.toHaveAttribute('cy', original!);
  const dragged = await amplitude.inputValue();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(dot).toHaveAttribute('cy', original!);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(amplitude).toHaveValue(dragged);
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(5);
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(6);
  await page.waitForTimeout(450);
  await page.reload();
  await page.getByRole('button', { name: 'Waveform', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(6);
  await dot.focus();
  await expect(amplitude).toHaveValue(dragged);
  await page.getByRole('button', { name: 'Remove dot', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(6);
  await page.screenshot({ path: '.test-results/waveform-dots.png', fullPage: true });
  await page.getByRole('button', { name: 'Reset waveform to sine', exact: true }).click();
  await page.getByRole('button', { name: 'Harmonics', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'H1 exact magnitude' })).toHaveValue('1');
  await expect(page.getByRole('spinbutton', { name: 'H2 exact magnitude' })).toHaveValue('0');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Waveform', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Wave point / })).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/waveform-dots-mobile.png', fullPage: true });
});
