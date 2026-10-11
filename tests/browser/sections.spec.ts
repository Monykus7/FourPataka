import { test } from '@playwright/test';
import { sectionsWorkflow } from '../helpers/sections';

test('named sections define silently, rename one track, trim and retain source playback context', async ({
  page,
}) => {
  await page.goto('/');
  await sectionsWorkflow(page);
  await page.screenshot({ path: '.test-results/sections-1440.png', fullPage: true });
});
