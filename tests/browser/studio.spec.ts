import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});
const savedProject = async (page: import('@playwright/test').Page) => {
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  return page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
};

test('instrument UI, independent A/B snapshots, audition, and undo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByRole('heading', { name: 'Instrument' })).toBeVisible();
  await expect(page.getByRole('slider', { name: /^H\d+ magnitude$/ })).toHaveCount(16);
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page.getByRole('button', { name: 'B', exact: true }).click();
  const h1 = page.getByRole('spinbutton', { name: 'H1 exact magnitude', exact: true });
  await h1.fill('0.35');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(h1).toHaveValue('1');
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(h1).toHaveValue('0.35');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).toHaveClass(/playing/);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).not.toHaveClass(
    /playing/,
  );
  await h1.fill('0.52');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(h1).toHaveValue('0.35');
  await page.screenshot({ path: '.test-results/instrument-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('preset Apply updates notation; library Save keeps the track copy; refresh preserves both', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Triangle triangle', exact: true }).click();
  await page.getByRole('button', { name: 'Apply to melody', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'H1 exact magnitude', exact: true }).fill('0.42');
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  const p = await savedProject(page);
  expect(p.scoreText).toContain('melody using triangle');
  expect(p.tracks.find((t: any) => t.key === 'melody').sound.harmonics[0]).toBe(1);
  expect(p.instruments.find((i: any) => i.id === 'triangle').sound.harmonics[0]).toBe(0.42);
  await page.reload();
  await expect(
    page.getByRole('spinbutton', { name: 'H1 exact magnitude', exact: true }),
  ).toHaveValue('0.42');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toContainText(
    'melody using triangle',
  );
});

test('CodeMirror diagnostics, stable playback revision, and global score undo', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await expect(editor).toBeVisible();
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.locator('.playing-line')).not.toHaveCount(0);
  await editor.fill('tempo 120\ntrack lead using brightReed {\n  C4 whole\n}');
  await expect(
    page.getByText('Playing previous version · replay to hear edits', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.playing-line')).toHaveCount(0);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await editor.fill('track lead using brightReed {\n  C9 quarter\n}');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeDisabled();
  await expect(page.getByText(/Invalid pitch “C9”/).last()).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await page.screenshot({ path: '.test-results/compose-desktop.png', fullPage: true });
});

test('new preset, JSON export/import validation, and undoable import', async ({ page }) => {
  await page.getByRole('button', { name: 'Save as new', exact: true }).click();
  await page.getByRole('textbox', { name: 'Display name', exact: true }).fill('Midnight reed');
  await page.getByRole('textbox', { name: 'Score key', exact: true }).fill('midnightReed');
  await page.getByRole('button', { name: 'Save as new instrument', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Midnight reed PRESET' })).toBeVisible();
  const project = await savedProject(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('.fourpataka.json');
  const bad = { ...project, schemaVersion: 99 };
  await page.locator('input[type=file]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bad)),
  });
  await expect(page.locator('.toast[role=status]')).toContainText('Import failed:');
  await expect(page.getByRole('heading', { name: 'Midnight reed PRESET' })).toBeVisible();
  const good = { ...project, name: 'Imported session' };
  await page.locator('input[type=file]').setInputFiles({
    name: 'good.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(good)),
  });
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    'Imported session',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project name', exact: true })).toHaveValue(
    project.name,
  );
});

test('macros return to baseline; manual edits establish a new baseline', async ({ page }) => {
  await page
    .getByRole('button', {
      name: 'Coefficient macros',
      exact: true,
    })
    .click();
  const before = await page
    .getByRole('spinbutton', { name: 'H3 exact magnitude', exact: true })
    .inputValue();
  await page.getByRole('spinbutton', { name: 'Brightness exact value', exact: true }).fill('0.8');
  await page.getByRole('button', { name: 'Reset macros', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'H3 exact magnitude', exact: true }),
  ).toHaveValue(before);
  await page.getByRole('spinbutton', { name: 'H3 exact magnitude', exact: true }).fill('0.18');
  await page.getByRole('spinbutton', { name: 'Brightness exact value', exact: true }).fill('0.7');
  await page.getByRole('button', { name: 'Reset macros', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'H3 exact magnitude', exact: true }),
  ).toHaveValue('0.18');
});

test('narrow screen: readable mixer scroll, keyboard controls, and experiments', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('slider', { name: 'H1 magnitude', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('slider', { name: 'H1 magnitude', exact: true })).toHaveValue('0.99');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/instrument-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Load experiment', exact: true }).nth(3).click();
  await expect(
    page.getByRole('switch', { name: 'Enable undertone bank', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Enable undertone bank', exact: true }),
  ).not.toBeChecked();
});
