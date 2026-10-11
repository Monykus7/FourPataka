import { test, expect } from '@playwright/test';
import { scoreWorkspaceWorkflow, trackOperationsWorkflow } from '../helpers/scoreWorkspace';

test('track views retain one source, cross-tab history, keyboard selection and whole-score playback', async ({
  page,
}) => {
  await page.goto('/');
  await scoreWorkspaceWorkflow(page);
});
test('track tab creation rename deletion and invalid-source fallback are undoable', async ({
  page,
}) => {
  await page.goto('/');
  await trackOperationsWorkflow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '.test-results/score-views-390.png', fullPage: true });
});
