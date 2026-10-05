import { expect, test } from '@playwright/test';

test('dense timeline has one note Tab stop per track and readable keyboard event inspection', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).press('Enter');
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const text = `tempo 20\ntime 6/8\ntrack long using brightReed {\n${Array.from({ length: 100 }, (_, i) => `${i % 3 === 0 ? 'rest' : i % 2 ? 'D4' : 'C4'} quarter`).join('\n')}\n}\ntrack bass using softBass {\n C2 half\n}`;
  await editor.fill(text);
  const lane = page.getByRole('group', { name: 'long timeline events', exact: true });
  await expect(lane.locator('button[tabindex="0"]')).toHaveCount(1);
  const notes = lane.getByRole('button');
  await notes.first().focus();
  await page.keyboard.press('End');
  await expect(notes.last()).toBeFocused();
  await expect(notes.last()).toHaveAttribute('aria-pressed', 'true');
  await expect(notes.last()).toHaveAccessibleDescription(
    'Event 100 of 100. Bar 34 · beat 1 · 1 quarter beats',
  );
  const selection = page.getByRole('status', { name: 'Selected timeline event', exact: true });
  await expect(selection).toContainText('long · rest · Bar 34 · beat 1');
  await page.keyboard.press('ArrowRight');
  await expect(notes.last()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(notes.nth(98)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(notes.first()).toBeFocused();
  await expect(lane.locator('button[tabindex="0"]')).toHaveCount(1);
  const picker = page.getByRole('combobox', { name: 'Inspect long event', exact: true });
  const lastId = await picker.getByRole('option').last().getAttribute('value');
  await picker.selectOption(lastId!);
  await expect(selection).toContainText('Bar 34 · beat 1');
  const next = page.getByRole('button', { name: 'Next long event', exact: true });
  await expect(next).toBeDisabled();
  const previous = page.getByRole('button', { name: 'Previous long event', exact: true });
  await previous.press('Enter');
  await expect(previous).toBeFocused();
  await expect(selection).toContainText('Bar 33 · beat 5');
  await next.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('fourpataka.project.v1');
        return raw ? JSON.parse(raw).scoreText : null;
      }),
    )
    .toBe(text);
  await page.getByRole('button', { name: 'Play score', exact: true }).press('Enter');
  await editor.fill('track short using brightReed {\n C4 quarter\n}');
  await expect(picker.getByRole('option')).toHaveCount(101);
  await previous.press('Enter');
  await expect(page.getByRole('button', { name: 'Stop all sound' })).toBeEnabled();
  await page.getByRole('button', { name: 'Stop all sound' }).press('Enter');
  await expect(picker).toHaveCount(0);
  await expect(
    page.getByRole('combobox', { name: 'Inspect short event', exact: true }).getByRole('option'),
  ).toHaveCount(2);
  await editor.fill(text);
  await expect(picker).toBeVisible();
  const widths = await notes.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().width),
  );
  expect(widths.every((width) => width > 0)).toBe(true);
  await page.screenshot({ path: '.test-results/timeline-keyboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await picker.selectOption(lastId!);
  await picker.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/timeline-keyboard-mobile.png', fullPage: true });
});
