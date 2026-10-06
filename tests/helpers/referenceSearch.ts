import { expect, type Page } from '@playwright/test';

export async function referenceSearchWorkflow(page: Page) {
  const reference = page.getByRole('region', { name: 'Command reference', exact: true });
  const search = reference.getByRole('textbox', { name: 'Search commands' });
  for (const name of ['time', 'track', 'rest', 'chord', 'legato', 'staccato', 'tuplet', 'repeat']) {
    await search.fill(name);
    await expect(reference.locator('.command-card')).toHaveCount(1);
    await expect(
      reference.getByRole('button', { name: `Insert ${name} command`, exact: true }),
    ).toBeVisible();
  }
  await search.fill('leg');
  await expect(reference.locator('.command-card')).toHaveCount(1);
  await search.fill('rest bar');
  await expect(
    reference.getByRole('button', { name: 'Insert rest-bar command', exact: true }),
  ).toBeVisible();
  await search.fill('');
  await expect(reference.locator('.command-card')).toHaveCount(20);
}
