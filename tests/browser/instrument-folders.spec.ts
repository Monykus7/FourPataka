import { expect, test } from '@playwright/test';
import { instrumentFoldersWorkflow, showSimpleShapes } from '../helpers/instrumentLibrary';

test('folders accept real pointer drags with collapsed targets unfiling undo and reload', async ({
  page,
}) => {
  await page.goto('/');
  await instrumentFoldersWorkflow(page);
  await page.screenshot({ path: '.test-results/instrument-folders-desktop.png', fullPage: true });
});

test('folder management keeps instruments and offers keyboard placement at narrow widths', async ({
  page,
}) => {
  await page.goto('/');
  await showSimpleShapes(page);
  await page.getByRole('button', { name: 'Triangle triangle', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Instrument folder', exact: true })).toHaveValue(
    'simple-shapes',
  );
  await page.getByRole('combobox', { name: 'Instrument folder', exact: true }).selectOption('');
  await expect(
    page
      .getByRole('group', { name: 'Unfiled instruments', exact: true })
      .getByRole('button', { name: 'Triangle triangle', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Instrument folder', exact: true })).toHaveValue(
    'simple-shapes',
  );
  await page.getByRole('button', { name: 'New instrument folder', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Instrument folder name', exact: true })
    .fill('simple SHAPES');
  await page.getByRole('textbox', { name: 'Instrument folder name', exact: true }).press('Enter');
  await expect(page.getByRole('alert')).toContainText('already exists');
  await page.getByRole('textbox', { name: 'Instrument folder name', exact: true }).press('Escape');
  await expect(
    page.getByRole('button', { name: 'New instrument folder', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Remove Simple shapes folder', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Toggle Simple shapes folder', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pure sine sine', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.setViewportSize({ width: 540, height: 900 });
  await page.getByRole('combobox', { name: 'Instrument folder', exact: true }).selectOption('');
  await expect(page.getByRole('combobox', { name: 'Instrument folder', exact: true })).toHaveValue(
    '',
  );
  await page.screenshot({ path: '.test-results/instrument-folders-mobile.png', fullPage: true });
});

test('legacy project migration groups factory shapes without changing edited sounds or score keys', async ({
  page,
}) => {
  await page.goto('/');
  const old = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const project = createProject();
    delete project.instrumentFolders;
    for (const preset of project.instruments) delete preset.folderId;
    project.instruments.find((p: any) => p.key === 'triangle').sound.trim = -27;
    return project;
  });
  await page.addInitScript(
    (project) => localStorage.setItem('fourpataka.project.v1', JSON.stringify(project)),
    old,
  );
  await page.reload();
  await showSimpleShapes(page);
  await page.getByRole('button', { name: 'Triangle triangle', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Output trim exact value', exact: true }),
  ).toHaveValue('-27');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill('track test using triangle {\n C4 quarter\n}');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
});
