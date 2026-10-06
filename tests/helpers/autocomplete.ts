import { expect, type Page } from '@playwright/test';

export async function completeCommand(page: Page, text: string, label: string, upLines = 0) {
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await expect(editor).toBeVisible();
  await editor.focus();
  // Use the editor's document selection, including lines outside its DOM viewport.
  await editor.press('Control+A');
  await page.keyboard.insertText(text);
  for (let i = 0; i < upLines; i++) await editor.press('ArrowUp');
  if (upLines) await editor.press('End');
  // Replacing a previous example can leave its asynchronous menu painted.
  // Close that menu/snippet before requesting suggestions for this document.
  await editor.press('Escape');
  await editor.press('Escape');
  await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
  await editor.press('Control+Space');
  await page
    .locator('.cm-tooltip-autocomplete')
    .getByRole('option')
    .filter({
      has: page.locator('.cm-completionLabel').filter({ hasText: new RegExp(`^${label}$`) }),
    })
    .click();
  return editor;
}

export async function chordShellWorkflow(page: Page, prefix: string) {
  const source = `// retained\ntempo 96\ntrack solo using sine {\n  ${prefix}\n  rest 8th\n}`;
  const editor = await completeCommand(page, source, 'chord', 2);
  await expect(editor).toHaveText(source.replace(prefix, 'chord:() '), { useInnerText: true });
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeDisabled();
  await page.keyboard.insertText('D F# A');
  await editor.press('F2');
  await page.keyboard.insertText('4');
  await editor.press('F2');
  await page.keyboard.insertText('half');
  await expect(editor).toHaveText(source.replace(prefix, 'chord:(D F# A)4 half'), {
    useInnerText: true,
  });
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'Timeline', exact: true })).toContainText(
    'D4 · F#4 · A4',
  );
}
