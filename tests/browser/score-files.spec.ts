import { expect, test } from '@playwright/test';
import { scoreFilesWorkflow } from '../helpers/scoreFiles';
import { completeCommand } from '../helpers/autocomplete';

test('selected-file Track Maker and commands add audio without touching sibling music', async ({
  page,
}) => {
  await page.goto('/');
  await scoreFilesWorkflow(page);
  await page.getByRole('button', { name: 'Make a track', exact: true }).click();
  await page.getByRole('textbox', { name: 'New track name' }).fill('harmony');
  await page.getByRole('button', { name: 'Add track', exact: true }).click();
  await expect
    .poll(async () => {
      const source = await page.evaluate(
        () => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText,
      );
      return source.indexOf('track harmony') > source.indexOf('"name":"rhythm-section.fourier"');
    })
    .toBe(true);
  await page.getByRole('textbox', { name: 'Search commands' }).fill('note');
  await page.getByRole('combobox', { name: 'Command insertion track' }).selectOption('harmony');
  await page.getByRole('button', { name: 'Insert note command', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toContainText('C5 quarter');
  await expect(page.locator('.editor-status')).toContainText('Ready to play');
});

test('shared-track completion and navigation find definitions in a closed sibling file', async ({
  page,
}) => {
  await page.goto('/');
  await scoreFilesWorkflow(page);
  const editor = await completeCommand(
    page,
    'from song Demo\ntrack melody using sine {\n play A\n}\n',
    'A',
    2,
  );
  await expect(page.locator('.editor-status')).toContainText('Ready to play');
  await page.getByRole('button', { name: 'Close score.fourier tab', exact: true }).click();
  await page.getByRole('combobox', { name: 'Score section', exact: true }).selectOption('melody:A');
  await page.getByRole('button', { name: 'Go to section', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'score.fourier', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(editor).toContainText('section A');
  await expect(editor).not.toContainText('from song');
});

test('virtual file tabs keep multiple tracks, shared clocks, closed-file playback and persistent editing', async ({
  page,
}) => {
  await page.goto('/');
  await scoreFilesWorkflow(page);
  await page.screenshot({ path: '.test-results/score-files-1440.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '.test-results/score-files-390.png', fullPage: true });
});

test('linked files produce real audio matching a flattened score at both sample rates', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const { emptyChain } = await import('/src/core/' + 'pedals.ts');
    const files =
      '// @fourpataka-file {"id":"main","name":"main.fourier"}\nfrom song Demo\ntempo 120\ntrack a using sine {\n A4 quarter\n}\n// @fourpataka-file {"id":"other","name":"other.fourier"}\nfrom song Demo\ntrack a using sine {\n C5 quarter\n}\ntrack b using sine {\n D3 half\n}';
    const flat =
      'tempo 120\ntrack a using sine {\n A4 quarter\n C5 quarter\n}\ntrack b using sine {\n D3 half\n}';
    const prepare = (source: string) => {
      let project = createProject();
      project.scoreText = source;
      project = reconcileTracks(
        project,
        parseScore(
          source,
          project.instruments.map((i: any) => i.key),
        ),
      );
      project.processing.master = emptyChain();
      project.tracks.forEach((t: any) => {
        t.level = 0.1;
        project.processing.tracks[t.key] = emptyChain();
      });
      return project;
    };
    const proofs = [];
    for (const sampleRate of [44100, 48000]) {
      const a = await renderWav(prepare(files), { sampleRate, channels: 1, tailSeconds: 0 });
      const b = await renderWav(prepare(flat), { sampleRate, channels: 1, tailSeconds: 0 });
      const first = a.buffer.getChannelData(0),
        second = b.buffer.getChannelData(0);
      let delta = 0,
        energy = 0;
      for (let i = 0; i < first.length; i++) {
        delta = Math.max(delta, Math.abs(first[i] - second[i]));
        if (i > sampleRate / 2) energy += first[i] ** 2;
      }
      proofs.push({ length: first.length, otherLength: second.length, delta, energy });
    }
    return proofs;
  });
  for (const row of proof) {
    expect(row.length).toBe(row.otherLength);
    expect(row.delta).toBeLessThan(1e-7);
    expect(row.energy).toBeGreaterThan(0.1);
  }
});
