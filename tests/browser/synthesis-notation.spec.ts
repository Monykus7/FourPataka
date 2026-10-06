import { expect, test } from '@playwright/test';
import { synthesisNotationWorkflow } from '../helpers/synthesisNotation';
import { completeCommand } from '../helpers/autocomplete';

test('upper harmonic controls and keyboard chord previews preserve written source', async ({
  page,
}) => {
  await page.goto('/');
  await synthesisNotationWorkflow(page);
});

test('symbol completion has blank fields and shape choices insert only the selected suffix', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = await completeCommand(page, 'chord:', 'chord-symbol');
  await expect(editor).toHaveText('chord:@ ');
  await page.keyboard.insertText('Bbmaj7');
  await editor.press('Tab');
  await page.keyboard.insertText('3');
  await editor.press('Tab');
  await page.keyboard.insertText('quarter');
  await expect(editor).toHaveText('chord:Bbmaj7@3 quarter');
  await editor.fill('chord:Cmaj');
  await editor.press('Control+Space');
  await page
    .locator('.cm-tooltip-autocomplete')
    .getByRole('option', { name: /^maj13#11/ })
    .click();
  await expect(editor).toHaveText('chord:Cmaj13#11');
});

test('32-partial voices and chord symbols reach the shared WAV synthesis path', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { createVoice } = await import('/src/audio/' + 'voice.ts');
    const { mathematicalPreset } = await import('/src/core/' + 'music.ts');
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const sound = mathematicalPreset('sine');
    sound.harmonics.fill(0);
    sound.harmonics[16] = 0.2;
    sound.polarity[16] = -1;
    sound.harmonics[31] = 0.3;
    sound.trim = 0;
    const context = new OfflineAudioContext(1, 24000, 48000);
    createVoice(context, context.destination, sound, 200, 0, 0.4);
    const data = (await context.startRendering()).getChannelData(0);
    const coefficient = (frequency: number) => {
      let sum = 0;
      for (let i = 4800; i < 9600; i++)
        sum += data[i] * Math.sin((2 * Math.PI * frequency * i) / 48000);
      return (2 * sum) / 4800;
    };
    let project = createProject();
    project.scoreText = 'track test using sine {\n chord:Cmaj13#11@3 quarter\n}';
    project = reconcileTracks(
      project,
      parseScore(
        project.scoreText,
        project.instruments.map((p: any) => p.key),
      ),
    );
    project.tracks[0].sound = sound;
    const symbolic = await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 });
    project.scoreText = 'track test using sine {\n chord:(C3 E3 G3 B3 D4 F#4 A4) quarter\n}';
    const explicit = await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 });
    const a = symbolic.buffer.getChannelData(0),
      b = explicit.buffer.getChannelData(0);
    let difference = 0,
      peak = 0;
    for (let i = 0; i < a.length; i++) {
      difference = Math.max(difference, Math.abs(a[i] - b[i]));
      peak = Math.max(peak, Math.abs(a[i]));
    }
    return {
      h17: coefficient(3400),
      h32: coefficient(6400),
      difference,
      peak,
      notes: symbolic.plan.score.events[0].notes,
    };
  });
  expect(proof.h17).toBeCloseTo(-0.2, 3);
  expect(proof.h32).toBeCloseTo(0.3, 3);
  expect(proof.difference).toBeLessThan(0.0001);
  expect(proof.peak).toBeGreaterThan(0.01);
  expect(proof.notes).toEqual(['C3', 'E3', 'G3', 'B3', 'D4', 'F#4', 'A4']);
});

test('legacy autosave migrates silently and schema-2 upper edits survive reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('fourpataka.project.v1')))
    .not.toBeNull();
  const fixture = await page.evaluate(() => {
    const project = JSON.parse(localStorage.getItem('fourpataka.project.v1')!);
    project.schemaVersion = 1;
    for (const sound of [
      ...project.instruments.map((p: any) => p.sound),
      ...project.tracks.map((t: any) => t.sound),
      project.comparison.A,
      project.comparison.B,
    ]) {
      sound.harmonics = sound.harmonics.slice(0, 16);
      sound.polarity = sound.polarity.slice(0, 16);
    }
    project.comparison.A.harmonics[0] = 0.37;
    return JSON.stringify(project);
  });
  await page.addInitScript((fixture) => {
    if (!sessionStorage.getItem('legacy-fixture-loaded')) {
      localStorage.setItem('fourpataka.project.v1', fixture);
      sessionStorage.setItem('legacy-fixture-loaded', '1');
    }
  }, fixture);
  await page.reload();
  await expect(
    page.getByRole('spinbutton', { name: 'H1 exact magnitude', exact: true }),
  ).toHaveValue('0.37');
  await page.getByRole('button', { name: /^Show H17–H32/ }).click();
  const upper = page.getByRole('spinbutton', { name: 'H32 exact magnitude', exact: true });
  await expect(upper).toHaveValue('0');
  await upper.fill('.43');
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).comparison.A.harmonics[31],
      ),
    )
    .toBe(0.43);
  await page.reload();
  await page.getByRole('button', { name: /^Show H17–H32/ }).click();
  await expect(upper).toHaveValue('0.43');
});
