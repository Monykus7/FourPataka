import { test } from '@playwright/test';
import { blockWorkflow } from '../helpers/blocks';

test('nested articulation and tuplet blocks play, diagnose unmatched brackets and survive reload', async ({
  page,
}) => {
  await page.goto('/');
  await blockWorkflow(page);
});
