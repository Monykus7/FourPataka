import { test } from '@playwright/test';
import { fileTabsWorkflow } from '../helpers/fileTabs';

test('user named files hold multiple tracks without creating track tabs or changing view while typing', async ({
  page,
}) => {
  await page.goto('/');
  await fileTabsWorkflow(page);
});
