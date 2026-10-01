import { expect, test } from '@playwright/test';

test('empty score survives refresh and a corrupt save recovers without losing its bytes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('textbox', { name: 'Score editor' }).fill('');
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  const empty = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  expect(empty.scoreText).toBe('');
  await page.reload();
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  expect(restored.scoreText).toBe('');
  expect(restored.instruments).toEqual(empty.instruments);
  // Seed damage on the next load, after the old page has flushed its save.
  await page.addInitScript((prior) => {
    prior.name = 'Recovered session';
    localStorage.setItem('fourpataka.project.recovery.v1', JSON.stringify(prior));
    localStorage.setItem('fourpataka.project.v1', '{bad json');
  }, restored);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    'Recovered session',
  );
  await expect(page.getByRole('status')).toContainText('Recovered the previous local save');
  expect(await page.evaluate(() => localStorage.getItem('fourpataka.project.unreadable.v1'))).toBe(
    '{bad json',
  );
});
