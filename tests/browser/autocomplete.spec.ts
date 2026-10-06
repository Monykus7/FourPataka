import { expect, test } from '@playwright/test';
import { completeCommand, chordShellWorkflow } from '../helpers/autocomplete';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
});

test('chord completion inserts an empty shell from a partial word or typed colon, with editable fields', async ({
  page,
}) => {
  for (const prefix of ['cho', 'chord:']) await chordShellWorkflow(page, prefix);
});

test('voicing completion accepts user-selected pitches and duration without a default octave', async ({
  page,
}) => {
  const editor = await completeCommand(page, 'voic', 'voicing');
  await expect(editor).toHaveText('chord:() ');
  await page.keyboard.insertText('D4 F#4 A4');
  await editor.press('F2');
  await page.keyboard.insertText('quarter');
  await expect(editor).toHaveText('chord:(D4 F#4 A4) quarter');
});

test('track completion leaves name, instrument and events blank and F2 reaches each field', async ({
  page,
}) => {
  const editor = await completeCommand(page, 'tra', 'track');
  await expect(editor).toHaveText('track  using  {\n  \n}');
  await page.keyboard.insertText('myLead');
  await editor.press('F2');
  await page.keyboard.insertText('sine');
  await editor.press('Shift+F2');
  await expect(editor).toBeFocused();
  await page.keyboard.insertText('solo');
  await editor.press('F2');
  await editor.press('F2');
  await page.keyboard.insertText('D4 half');
  await expect(editor).toHaveText('track solo using sine {\n  D4 half\n}', { useInnerText: true });
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
});

test('command shells leave arguments blank while explicit meter and preset choices still insert values', async ({
  page,
}) => {
  for (const [prefix, label, shell, argument, result] of [
    ['tem', 'tempo', 'tempo ', '96', 'tempo 96'],
    ['tim', 'time', 'time ', '7/8', 'time 7/8'],
    ['mas', 'master', 'master through ', 'cleanGlue', 'master through cleanGlue'],
    ['thr', 'through', 'through ', 'warmDrive', 'through warmDrive'],
    ['usi', 'using', 'using ', 'sine', 'using sine'],
    ['res', 'rest', 'rest ', '16th', 'rest 16th'],
    ['comm', 'comment', '// ', 'my comment', '// my comment'],
  ]) {
    const editor = await completeCommand(page, prefix, label);
    await expect(editor).toHaveText(shell);
    await page.keyboard.insertText(argument);
    await expect(editor).toHaveText(result);
  }
  const note = await completeCommand(page, 'not', 'note');
  await expect(note).toHaveText(' ');
  await page.keyboard.insertText('G#3');
  await note.press('F2');
  await page.keyboard.insertText('8th');
  await expect(note).toHaveText('G#3 8th');
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  for (const [prefix, label, result] of [
    ['time 6/', '6/8', 'time 6/8'],
    ['track lead using si', 'sine', 'track lead using sine'],
    ['master through clean', 'cleanGlue', 'master through cleanGlue'],
  ]) {
    await editor.focus();
    await editor.press('Control+A');
    await page.keyboard.insertText(prefix);
    await editor.press('Escape');
    await editor.press('Control+Space');
    await page
      .locator('.cm-tooltip-autocomplete')
      .getByRole('option', { name: new RegExp(`^${label}`) })
      .click();
    await expect(editor).toHaveText(result);
  }
});

test('autocomplete preference blocks empty command shells as well as library suggestions', async ({
  page,
}) => {
  await page.getByRole('switch', { name: 'Autocomplete', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill('chord:');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
  await expect(editor).toHaveText('chord:');
});
