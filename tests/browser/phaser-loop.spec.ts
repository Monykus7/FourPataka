import { test } from '@playwright/test';
import { verifyPhaserLoop } from '../helpers/phaserLoop';

test('feedback-cycle quantum is measured independently before assigning phaser tail units', async ({
  page,
}) => {
  await page.goto('/');
  await verifyPhaserLoop(page);
});
