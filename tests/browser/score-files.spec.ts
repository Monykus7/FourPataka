import { expect, test } from '@playwright/test';
import { scoreFilesWorkflow } from '../helpers/scoreFiles';

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
