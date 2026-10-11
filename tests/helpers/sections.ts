import { expect, type Page } from '@playwright/test';

export const SECTION_SCORE = `tempo 60
time 4/4
track melody using sine {
 // play A is retained in this comment
 section A {
  staccato[
   chord:Cmaj7 half
  ]
  triplet[
   D4 eighth
   E4 eighth
   F4 eighth
  ]
 }
 play A
 play A trim 1 + 0.5 {
  G4 quarter
 }
}
track bass using softBass {
 section A {
  C2 whole
 }
 play A
}`;

const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText);

export async function sectionsWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(SECTION_SCORE);
  await expect.poll(() => saved(page)).toBe(SECTION_SCORE);
  await expect(page.locator('.editor-status')).toContainText('5.5 quarter beats');
  const tabs = page.getByRole('tablist', { name: 'Score views' });
  await tabs.getByRole('tab', { name: 'melody', exact: true }).click();
  await page.getByRole('button', { name: 'Go to section', exact: true }).click();
  await expect(editor).toBeFocused();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('A');
  await page.getByRole('button', { name: 'Rename section', exact: true }).click();
  await page.getByRole('textbox', { name: 'Section name', exact: true }).fill('Verse');
  await page.getByRole('button', { name: 'Confirm rename section', exact: true }).click();
  const renamed = SECTION_SCORE.replace('section A', 'section Verse')
    .replace('\n play A\n', '\n play Verse\n')
    .replace('play A trim', 'play Verse trim');
  await expect.poll(() => saved(page)).toBe(renamed);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(SECTION_SCORE);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(renamed);
  await page
    .getByRole('combobox', { name: 'Inspect melody event', exact: true })
    .selectOption('melody:4');
  await expect(page.locator('.event-inspector')).toContainText('cut 1.5');
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).toContainText(
    'Verse',
  );
  const ownedTracks = await page.evaluate(
    () => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).tracks,
  );
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rename section', exact: true })).toBeDisabled();
  await expect(page.locator('.score-editor .playing-line')).toHaveCount(2);
  await expect
    .poll(async () =>
      Number(
        (await page.locator('.transport-time strong').textContent())?.match(/00:(\d+)/)?.[1] ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(page.locator('.transport-time')).not.toContainText('00:00');
  const melodySource = renamed.slice(
    renamed.indexOf('track melody'),
    renamed.indexOf('\ntrack bass'),
  );
  await editor.fill(melodySource.replace('G4 quarter', 'A4 quarter'));
  await expect(page.locator('.editor-status')).toContainText('Playing previous version');
  await expect(page.locator('.score-editor .playing-line')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(renamed);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).tracks),
  ).toEqual(ownedTracks);
  await page.getByRole('textbox', { name: 'Search commands' }).fill('play');
  await expect(page.locator('.command-card')).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Insert play command', exact: true }),
  ).toContainText('play Verse');
  await page.getByRole('button', { name: 'Insert play command', exact: true }).click();
  await expect
    .poll(() => saved(page))
    .toBe(renamed.replace('\n}\ntrack bass', '\n  play Verse\n}\ntrack bass'));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(renamed);
  await tabs.getByRole('tab', { name: 'All score', exact: true }).click();
  await editor.fill('track only using sine {\n section Silent {\n C4 whole\n}\n}');
  await expect(page.locator('.editor-status')).toContainText('0 quarter beats');
  await expect(
    page.getByRole('button', { name: 'Insert play command', exact: true }),
  ).toContainText('play Silent');
  await editor.fill('track only using sine {\n C4 quarter\n}');
  await expect(
    page.getByRole('button', { name: 'Insert play command', exact: true }),
  ).toBeDisabled();
  await editor.fill(renamed);
  await expect.poll(() => saved(page)).toBe(renamed);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect.poll(() => saved(page)).toBe(renamed);
  await expect(page.getByRole('combobox', { name: 'Score section', exact: true })).toContainText(
    'Verse',
  );
}
