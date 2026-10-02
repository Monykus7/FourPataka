import { expect, test } from '@playwright/test';

const phrase =
  '// timing stays here\ntempo 60 // quarter-note BPM\ntime 4/4 // meter\ntrack melody using brightReed {\n  C4 whole\n  D4 8th\n}\ntrack bass using softBass {\n  C2 half\n}';
test('time completion inserts a supported meter and respects the autocomplete switch', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill('time 6/');
  await editor.press('Control+Space');
  await page.locator('.cm-tooltip-autocomplete').getByRole('option', { name: /6\/8/ }).click();
  await expect(editor).toHaveText('time 6/8');
  await page.getByRole('switch', { name: 'Autocomplete', exact: true }).click();
  await editor.fill('time 6/');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
});
test('timing controls preserve source, meter positions, assignment copies, undo and reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(phrase);
  await page.getByRole('spinbutton', { name: 'Composition tempo' }).fill('90');
  await page.getByRole('combobox', { name: 'Time signature preset' }).selectOption('6/8');
  await page.getByRole('button', { name: 'Apply timing' }).click();
  await expect(editor).toContainText('tempo 90 // quarter-note BPM');
  await expect(editor).toContainText('time 6/8 // meter');
  await expect(page.locator('.editor-status')).toContainText('3.00 s');
  await expect(page.locator('.timeline-panel .tag')).toHaveText('6/8');
  const line = page.locator('.timeline-lane').first().locator('[data-bar="2"]');
  expect(await line.evaluate((e) => (e as HTMLElement).style.left)).toBe('66.6667%');
  await page.getByRole('button', { name: 'melody D4, beat 5', exact: true }).click();
  await expect(page.locator('.event-inspector')).toContainText('Bar 2 · beat 3');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor).toContainText('time 4/4 // meter');
  await expect(page.getByRole('spinbutton', { name: 'Composition tempo' })).toHaveValue('60');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('combobox', { name: 'Instrument for melody' }).selectOption('triangle');
  await expect(editor).toContainText('track melody using triangle');
  await expect(editor).toContainText('track bass using softBass');
  await page.getByRole('spinbutton', { name: 'Beats per bar' }).fill('11');
  await page.getByRole('combobox', { name: 'Beat unit' }).selectOption('16');
  await page.getByRole('button', { name: 'Apply timing' }).click();
  await expect(editor).toContainText('time 11/16 // meter');
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Time signature preset' })).toHaveValue('custom');
  await expect(editor).toContainText('time 11/16 // meter');
  await expect(page.getByRole('combobox', { name: 'Instrument for melody' })).toHaveValue(
    'triangle',
  );
  await page.screenshot({ path: '.test-results/composition-meter.png', fullPage: true });
});

test('running timing stays frozen and malformed meter blocks composition controls', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const long =
    'tempo 20\ntime 3/4\ntrack melody using brightReed {\nC4 whole\nD4 whole\nE4 whole\nF4 whole\n}';
  await editor.fill(long);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Composition tempo' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Instrument for melody' })).toBeDisabled();
  await editor.fill(long.replace('time 3/4', 'time 6/8').replace('tempo 20', 'tempo 120'));
  await expect(page.locator('.timeline-panel .tag')).toHaveText('3/4');
  await expect(page.locator('.transport-time')).toContainText('20');
  await expect(page.locator('.transport-time')).toContainText('3/4');
  await expect(page.locator('.editor-status')).toContainText('Playing previous version');
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await expect(page.locator('.timeline-panel .tag')).toHaveText('6/8');
  await editor.fill(long.replace('time 3/4', 'time 3/3'));
  await expect(page.locator('.diagnostics-list')).toContainText('Time signature');
  await expect(page.getByRole('spinbutton', { name: 'Composition tempo' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Make a track', exact: true })).toBeDisabled();
});

test('track maker uses project meter and reorders events with buttons at narrow widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('combobox', { name: 'Time signature preset' }).selectOption('6/8');
  await page.getByRole('button', { name: 'Apply timing' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Make a track', exact: true }).click();
  const maker = page.getByRole('dialog');
  await expect(maker.locator('.maker-phrase-heading')).toContainText('1.33 bars in 6/8');
  await maker.getByRole('button', { name: 'Move event 3 up' }).click();
  await expect(maker.getByRole('textbox', { name: 'Event 2 pitches' })).toHaveValue('G4');
  await maker.getByRole('button', { name: 'Move event 1 down' }).click();
  await expect(maker.getByRole('textbox', { name: 'Event 1 pitches' })).toHaveValue('G4');
  await expect(maker.getByRole('button', { name: 'Move event 1 up' })).toBeDisabled();
  expect(await maker.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/track-maker-meter-mobile.png', fullPage: true });
  await maker.getByRole('button', { name: 'Add track', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toContainText(
    'G4 half\n  C4 quarter\n  E4 quarter',
  );
});
