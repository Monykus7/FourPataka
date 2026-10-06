import { expect, test } from '@playwright/test';

test('reference previews match selected keys and instrument assignment preserves other tracks with undo', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const reference = page.getByRole('region', { name: 'Command reference', exact: true });
  await reference
    .getByRole('combobox', { name: 'Command instrument', exact: true })
    .selectOption('triangle');
  await reference
    .getByRole('combobox', { name: 'Command pedal chain', exact: true })
    .selectOption('cleanGlue');
  await reference
    .getByRole('combobox', { name: 'Command insertion track', exact: true })
    .selectOption('bass');
  await expect(
    reference.getByRole('button', { name: 'Insert master command', exact: true }),
  ).toContainText('master through cleanGlue');
  await expect(
    reference.getByRole('button', { name: 'Insert through command', exact: true }),
  ).toContainText('Track: bass');
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const before = await editor.innerText();
  await reference.getByRole('button', { name: 'Insert using command', exact: true }).focus();
  await reference.getByRole('button', { name: 'Insert using command', exact: true }).press('Enter');
  await expect
    .poll(() => editor.innerText())
    .toBe(before.replace('bass using softBass', 'bass using triangle'));
  await expect(
    page.getByRole('combobox', { name: 'Instrument for bass', exact: true }),
  ).toHaveValue('triangle');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => editor.innerText()).toBe(before);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await reference.getByRole('button', { name: 'Insert track command', exact: true }).click();
  await expect(editor).toContainText('track lead using triangle');
  await expect(
    reference.getByRole('button', { name: 'Insert track command', exact: true }),
  ).toContainText('track lead2 using triangle');
  await page.reload();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Instrument for bass', exact: true }),
  ).toHaveValue('triangle');
});

test('rules are keyboard-readable, searchable by syntax and selected keys, with an explicit empty result', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const reference = page.getByRole('region', { name: 'Command reference', exact: true });
  await reference
    .getByRole('combobox', { name: 'Command category', exact: true })
    .selectOption('Routing');
  await expect(reference.locator('.command-card')).toHaveCount(3);
  const rules = reference.getByText('through syntax and rules', { exact: true });
  await rules.focus();
  await rules.press('Enter');
  await expect(reference.locator('details[open]')).toContainText('never an event line');
  await reference.getByRole('textbox', { name: 'Search commands' }).fill('master warmDrive');
  await expect(reference.locator('.command-card')).toHaveCount(1);
  await reference
    .getByRole('combobox', { name: 'Command pedal chain', exact: true })
    .selectOption('cleanGlue');
  await expect(reference.locator('.command-empty')).toBeVisible();
  await reference.getByRole('textbox', { name: 'Search commands' }).fill('master cleanGlue');
  await expect(
    reference.getByRole('button', { name: 'Insert master command', exact: true }),
  ).toBeVisible();
  await reference.getByRole('combobox', { name: 'Command category', exact: true }).selectOption('');
  await reference.getByRole('textbox', { name: 'Search commands' }).fill('duration 0.25');
  await expect(
    reference.getByRole('button', { name: 'Insert note command', exact: true }),
  ).toBeVisible();
});

test('empty and invalid scores guard track cards while first-track creation and global insertion remain useful', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const reference = page.getByRole('region', { name: 'Command reference', exact: true });
  await editor.fill('');
  await expect(
    reference.getByRole('button', { name: 'Insert through command', exact: true }),
  ).toBeDisabled();
  await expect(
    reference.getByRole('button', { name: 'Insert note command', exact: true }),
  ).toBeDisabled();
  await reference.getByRole('button', { name: 'Insert master command', exact: true }).click();
  await expect(editor).toContainText('master through warmDrive');
  await reference.getByRole('button', { name: 'Insert track command', exact: true }).click();
  await expect(page.locator('.editor-status')).toContainText('Ready to play');
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(
    reference.getByRole('button', { name: 'Insert tempo command', exact: true }),
  ).toBeDisabled();
  await reference.getByText('master syntax and rules', { exact: true }).click();
  await expect(reference.locator('details[open]')).toContainText('master mix');
  await page.getByRole('button', { name: 'Stop all sound' }).click();
  await editor.fill('track broken {');
  await expect(
    reference.getByRole('button', { name: 'Insert track command', exact: true }),
  ).toBeDisabled();
  await expect(reference).toContainText('Fix score diagnostics');
});

test('instrument completion offers instrument keys only and honors autocomplete preference', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill('track lead using ');
  await editor.press('End');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('brightReed');
  await expect(page.locator('.cm-tooltip-autocomplete')).not.toContainText('warmDrive');
  await editor.press('Escape');
  await page.getByRole('switch', { name: 'Autocomplete', exact: true }).click();
  await editor.focus();
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
});

test('reference matches the score height while search stays reachable on desktop and narrow screens', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const reference = page.getByRole('region', { name: 'Command reference', exact: true });
  const catalog = page.getByRole('region', { name: 'Command catalog', exact: true });
  const search = reference.getByRole('textbox', { name: 'Search commands', exact: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1040 });
    await search.fill('');
    await expect(reference.locator('.command-card')).toHaveCount(18);
    await expect
      .poll(async () => {
        const referenceBox = (await reference.boundingBox())!;
        const scoreBox = (await page.locator('.editor-panel').boundingBox())!;
        return Math.abs(referenceBox.height - scoreBox.height);
      })
      .toBeLessThan(1);
    const scoreHeight = (await page.locator('.editor-panel').boundingBox())!.height;
    await reference.getByRole('button', { name: /Command reference/ }).click();
    expect((await reference.boundingBox())!.height).toBeLessThan(scoreHeight / 2);
    await reference.getByRole('button', { name: /Command reference/ }).click();
    await expect
      .poll(async () => Math.abs((await reference.boundingBox())!.height - scoreHeight))
      .toBeLessThan(1);
    await catalog.focus();
    await catalog.press('Space');
    await expect.poll(() => catalog.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeVisible();
    await catalog.press('End');
    if ((await reference.locator('.command-controls').getAttribute('open')) === null)
      await reference.getByText('Controls (not score commands)', { exact: true }).click();
    await expect(reference.locator('.command-controls[open]')).toContainText('monitor volume');
    const headerBox = (await reference.locator('.commands-header').boundingBox())!;
    const searchBox = (await search.boundingBox())!;
    expect(searchBox.y).toBeGreaterThanOrEqual(headerBox.y);
    expect(searchBox.y + searchBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height);
    await search.fill('master warmDrive');
    await expect(reference.locator('.command-card')).toHaveCount(1);
    await expect
      .poll(async () =>
        Math.abs(
          (await reference.boundingBox())!.height -
            (await page.locator('.editor-panel').boundingBox())!.height,
        ),
      )
      .toBeLessThan(1);
    await expect.poll(() => catalog.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(search).toBeFocused();
    await search.fill('');
    await reference.getByText('through syntax and rules', { exact: true }).click();
    await reference.getByText('track syntax and rules', { exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: `.test-results/matched-reference-${width}.png`, fullPage: true });
  }
  await page.getByRole('textbox', { name: 'Score editor' }).fill('broken');
  await expect(page.locator('.diagnostics-list')).toBeVisible();
  for (const width of [1440, 1000, 390]) {
    await page.setViewportSize({ width, height: 1040 });
    await expect
      .poll(async () =>
        Math.abs(
          (await reference.boundingBox())!.height -
            (await page.locator('.editor-panel').boundingBox())!.height,
        ),
      )
      .toBeLessThan(1);
  }
});
