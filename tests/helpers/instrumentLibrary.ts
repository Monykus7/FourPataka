import { expect, type Page } from '@playwright/test';

export async function showSimpleShapes(page: Page) {
  const toggle = page.getByRole('button', { name: 'Toggle Simple shapes folder', exact: true });
  if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
}

export async function instrumentFoldersWorkflow(page: Page) {
  const simple = page.getByRole('button', { name: 'Toggle Simple shapes folder', exact: true });
  await expect(simple).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Pure sine sine', exact: true })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Unfiled instruments', exact: true })).toContainText(
    'Kick',
  );
  await expect
    .poll(() => page.evaluate(() => !!localStorage.getItem('fourpataka.project.v1')))
    .toBe(true);
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  await page.getByRole('button', { name: 'New instrument folder', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Instrument folder name', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('textbox', { name: 'Instrument folder name', exact: true })
    .fill('Percussion');
  await page.getByRole('button', { name: 'Create instrument folder', exact: true }).click();
  const folder = page.getByRole('group', { name: 'Percussion folder', exact: true });
  const kick = page.getByRole('button', { name: 'Kick kick', exact: true });
  await kick.dragTo(folder.getByRole('button', { name: 'Toggle Percussion folder', exact: true }));
  await expect(folder.getByRole('button', { name: 'Kick kick', exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('group', { name: 'Unfiled instruments', exact: true })
      .getByRole('button', { name: 'Kick kick', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(folder.getByRole('button', { name: 'Kick kick', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(folder.getByRole('button', { name: 'Kick kick', exact: true })).toBeVisible();
  // A collapsed header is still a drop target; organization does not select a sound.
  await page.getByRole('button', { name: 'Toggle Percussion folder', exact: true }).click();
  await page
    .getByRole('button', { name: 'Snare snare', exact: true })
    .dragTo(folder.getByRole('button', { name: 'Toggle Percussion folder', exact: true }));
  await page.getByRole('button', { name: 'Toggle Percussion folder', exact: true }).click();
  await expect(folder.getByRole('button', { name: 'Snare snare', exact: true })).toBeVisible();
  await folder
    .getByRole('button', { name: 'Kick kick', exact: true })
    .dragTo(
      page
        .getByRole('group', { name: 'Unfiled instruments', exact: true })
        .locator('.library-unfiled-heading'),
    );
  await expect(
    page
      .getByRole('group', { name: 'Unfiled instruments', exact: true })
      .getByRole('button', { name: 'Kick kick', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rename Percussion folder', exact: true }).click();
  await page.getByRole('textbox', { name: 'Instrument folder name', exact: true }).fill('Drum kit');
  await page.getByRole('textbox', { name: 'Instrument folder name', exact: true }).press('Enter');
  await expect(
    page.getByRole('button', { name: 'Rename Drum kit folder', exact: true }),
  ).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('fourpataka.project.v1')!).instrumentFolders.some(
          (f: any) => f.label === 'Drum kit',
        ),
      ),
    )
    .toBe(true);
  const organized = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  expect(organized.scoreText).toBe(before.scoreText);
  expect(organized.tracks).toEqual(before.tracks);
  expect(organized.comparison).toEqual(before.comparison);
  expect(organized.processing).toEqual(before.processing);
  expect(organized.editorPresetId).toBe(before.editorPresetId);
  expect(
    organized.instruments.map((p: any) => ({
      id: p.id,
      key: p.key,
      version: p.version,
      sound: p.sound,
    })),
  ).toEqual(
    before.instruments.map((p: any) => ({
      id: p.id,
      key: p.key,
      version: p.version,
      sound: p.sound,
    })),
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Toggle Drum kit folder', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Toggle Drum kit folder', exact: true }).click();
  await expect(
    page
      .getByRole('group', { name: 'Drum kit folder', exact: true })
      .getByRole('button', { name: 'Snare snare', exact: true }),
  ).toBeVisible();
}
