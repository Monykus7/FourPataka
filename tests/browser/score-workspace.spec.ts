import { test, expect } from '@playwright/test';
import {
  scoreWorkspaceWorkflow,
  trackOperationsWorkflow,
  chordViewWorkflow,
} from '../helpers/scoreWorkspace';

test('track views retain one source, cross-tab history, keyboard selection and whole-score playback', async ({
  page,
}) => {
  await page.goto('/');
  await scoreWorkspaceWorkflow(page);
});
test('contributor chord shapes retain keyboard previews and cursor positions across views', async ({
  page,
}) => {
  await page.goto('/');
  await chordViewWorkflow(page);
  await page.screenshot({ path: '.test-results/score-views-1440.png', fullPage: true });
});
test('CRLF source stays canonical while editor chord offsets remain accurate', async ({ page }) => {
  await page.goto('/');
  const source =
    'tempo 120\r\ntrack lead using sine {\r\n chord:Cwide2@3 quarter\r\n}\r\ntrack bass using softBass {\r\n C2 quarter\r\n}\r\n';
  const payload = await page.evaluate(async (source) => {
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    let p = createProject();
    p.scoreText = source;
    p = reconcileTracks(
      p,
      parseScore(
        source,
        p.instruments.map((i: any) => i.key),
        p.processing.library.map((i: any) => i.key),
      ),
    );
    return JSON.stringify(p);
  }, source);
  // Install after the previous page's unload autosave, before the next app initializes.
  await page.addInitScript(
    (payload) => localStorage.setItem('fourpataka.project.v1', payload),
    payload,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('tab', { name: 'lead', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.press('Control+Home');
  await editor.press('ArrowDown');
  await editor.press('Home');
  for (let i = 0; i < 10; i++) await editor.press('ArrowRight');
  await expect(page.locator('.chord-expansion')).toContainText('C3 · D4 · G4');
  await editor.fill('track lead using sine {\n chord:Fwide2@3 quarter\n}');
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText),
    )
    .toBe(source.replace('Cwide2', 'Fwide2'));
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

test('removing the last track saves an importable empty workspace and permits a new tab', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill('tempo 120\ntrack only using sine {\n C4 quarter\n}');
  await page.getByRole('tab', { name: 'only', exact: true }).click();
  await page.getByRole('button', { name: 'Remove track', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm remove track', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).tracks.length),
    )
    .toBe(0);
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'only', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'New track tab', exact: true }).click();
  await page.getByRole('textbox', { name: 'Track tab name' }).fill('rebuilt');
  await page.getByRole('button', { name: 'Create track tab' }).click();
  await expect(page.getByRole('tab', { name: 'rebuilt', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.editor-status')).toContainText('Ready to play');
});
