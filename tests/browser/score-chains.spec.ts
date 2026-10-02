import { expect, test } from '@playwright/test';

const source =
  '// private score\ntempo 60\nmaster through cleanGlue // mix\ntrack melody using brightReed through warmDrive { // lead\n A4 whole\n A4 whole\n}\ntrack bass using softBass {\n A2 whole\n}';

test('Compose edits only chain spans, undo restores copies, and unchanged reparsing preserves knobs', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(source);
  await expect(page.locator('.editor-status')).toContainText('Ready to play');
  const assignment = page.getByRole('combobox', { name: 'Pedal chain for melody', exact: true });
  await expect(assignment).toHaveValue('warmDrive');
  await assignment.selectOption('cleanGlue');
  await expect
    .poll(() => editor.innerText())
    .toBe(source.replace('brightReed through warmDrive', 'brightReed through cleanGlue'));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(assignment).toHaveValue('warmDrive');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination' })
    .selectOption('track:melody');
  await page
    .getByRole('spinbutton', { name: 'overdrive 1 drive exact value', exact: true })
    .fill('12');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await editor.fill(source.replace('A2 whole', 'B2 whole'));
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing.tracks.melody
            .pedals[0]?.params.drive,
      ),
    )
    .toBe(12);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination' })
    .selectOption('track:melody');
  await expect(
    page.getByRole('spinbutton', { name: 'overdrive 1 drive exact value', exact: true }),
  ).toHaveValue('12');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await assignment.selectOption('');
  await expect(editor).toContainText('track melody using brightReed { // lead');
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing.tracks.melody.pedals
            .length,
      ),
    )
    .toBe(0);
  await expect(
    page.getByRole('combobox', { name: 'Pedal chain for master', exact: true }),
  ).toHaveValue('cleanGlue');
  await page.screenshot({ path: '.test-results/score-chain-compose.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.test-results/score-chain-mobile.png', fullPage: true });
});

test('command cards and Track Maker emit valid chain directives without duplicates', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('combobox', { name: 'Command pedal chain' }).selectOption('cleanGlue');
  await page.getByRole('combobox', { name: 'Command insertion track' }).selectOption('bass');
  await page.getByRole('button', { name: 'Insert through command', exact: true }).click();
  await page.getByRole('button', { name: 'Insert master command', exact: true }).click();
  await page.getByRole('button', { name: 'Insert master command', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  expect((await editor.innerText()).match(/master through cleanGlue/g)).toHaveLength(1);
  await expect(editor).toContainText('track bass using softBass through cleanGlue');
  await page.getByRole('button', { name: 'Make a track', exact: true }).click();
  const maker = page.getByRole('dialog');
  await maker.getByRole('textbox', { name: 'New track name' }).fill('pad');
  await maker.getByRole('combobox', { name: 'New track pedal chain' }).selectOption('warmDrive');
  await expect(maker.locator('.maker-preview')).toContainText('through warmDrive');
  await maker.getByRole('button', { name: 'Add track', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Pedal chain for pad', exact: true }),
  ).toHaveValue('warmDrive');
  await expect(page.locator('.editor-status')).toContainText('Ready to play');
});

test('unknown and duplicate chain directives show diagnostics and preserve applied copies', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill(source);
  await editor.fill(source.replace('through warmDrive', 'through missingBoard'));
  await expect(page.locator('.diagnostics-list')).toContainText('missingBoard');
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('combobox', { name: 'Pedal chain for melody', exact: true }),
  ).toBeDisabled();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing.tracks.melody
            .assignmentKey,
      ),
    )
    .toBe('warmDrive');
  await editor.fill(`master through warmDrive\n${source}`);
  await expect(page.locator('.diagnostics-list')).toContainText('Duplicate master directive');
  await editor.fill(source);
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Pedal chain for master', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
});

test('through completion offers saved pedal keys and respects the autocomplete switch', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill('master through ');
  await editor.press('End');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('warmDrive');
  await expect(page.locator('.cm-tooltip-autocomplete')).not.toContainText('brightReed');
  await editor.press('Escape');
  await page.getByRole('switch', { name: 'Autocomplete', exact: true }).click();
  await editor.focus();
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toHaveCount(0);
});

test('custom score keys survive GUI application and library saving without overwriting track copies', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal preset', exact: true })
    .selectOption('warm-drive');
  await page.getByRole('button', { name: 'Load chain preset', exact: true }).click();
  await page.getByRole('textbox', { name: 'New chain preset name' }).fill('Personal drive');
  const key = page.getByRole('textbox', { name: 'New chain score key' });
  await key.fill('warmDrive');
  await expect(page.getByRole('button', { name: 'Save chain as new', exact: true })).toBeDisabled();
  await key.fill('myDrive');
  await page.getByRole('button', { name: 'Save chain as new', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Chain application destination' })
    .selectOption('track:melody');
  await page.getByRole('button', { name: 'Apply chain to destination', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'overdrive 1 drive exact value', exact: true })
    .fill('15');
  await page.getByRole('button', { name: 'Save chain preset', exact: true }).click();
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Score editor' })).toContainText(
    'track melody using brightReed through myDrive',
  );
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem('fourpataka.project.v1')!);
        return [
          p.processing.library.find((p: any) => p.key === 'myDrive').chain.pedals[0].params.drive,
          p.processing.tracks.melody.pedals[0]?.params.drive,
        ];
      }),
    )
    .toEqual([15, 6]);
});

test('parsed track and master chains affect audio on replay while the running score keeps its clock', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const projectPath = '/src/core/project.ts',
      parserPath = '/src/core/parser.ts',
      pedalPath = '/src/core/pedals.ts',
      enginePath = '/src/audio/engine.ts',
      musicPath = '/src/core/music.ts';
    const { createProject, reconcileTracks } = await import(projectPath),
      { parseScore } = await import(parserPath),
      { makePedal } = await import(pedalPath),
      { AudioEngine } = await import(enginePath),
      { mathematicalPreset } = await import(musicPath);
    let p = createProject();
    const eq = makePedal('eq');
    eq.params.mid = -6;
    eq.params.frequency = 440;
    p.processing.library.push({
      id: 'notch',
      key: 'notch',
      label: 'Notch',
      chain: { pedals: [eq], bypassed: false },
    });
    const compile = () =>
      parseScore(
        p.scoreText,
        p.instruments.map((i: any) => i.key),
        p.processing.library.map((i: any) => i.key),
      );
    p.scoreText = 'tempo 60\ntrack melody using sine {\n A4 whole\n A4 whole\n}';
    p = reconcileTracks(p, compile());
    p.tracks[0].sound = mathematicalPreset('sine');
    p.tracks[0].sound.attack = 0.005;
    p.tracks[0].sound.trim = 0;
    p.tracks[0].level = 0.2;
    const e = new AudioEngine();
    e.setMonitor(0);
    e.setMix(1);
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await e.play(compile(), p.tracks, p.processing);
    // A fresh device context can take longer than a fixed timer to advance.
    const deadline = performance.now() + 5000;
    while (e.measure().peak < 0.01 && performance.now() < deadline) await delay(25);
    await delay(350);
    const dry = e.measure().peak,
      before = e.progress;
    p.scoreText = p.scoreText.replace('using sine', 'using sine through notch');
    p = reconcileTracks(p, compile());
    e.updateProcessing(p.processing, 'A');
    await delay(200);
    const frozen = e.measure().peak,
      after = e.progress,
      pending = e.processingPending(p.processing, 'A');
    e.stop();
    await delay(100);
    await e.play(compile(), p.tracks, p.processing);
    await delay(350);
    const track = e.measure().peak;
    e.stop();
    await delay(100);
    p.scoreText = `master through notch\n${p.scoreText}`;
    p = reconcileTracks(p, compile());
    await e.play(compile(), p.tracks, p.processing);
    await delay(350);
    const master = e.measure().peak;
    e.stop();
    await e.context!.close();
    return { dry, frozen, before, after, pending, track, master };
  });
  expect(proof.dry).toBeGreaterThan(0.1);
  expect(proof.frozen).toBeCloseTo(proof.dry, 3);
  expect(proof.after).toBeGreaterThan(proof.before + 0.1);
  expect(proof.pending).toBe(true);
  expect(proof.track / proof.dry).toBeCloseTo(10 ** (-6 / 20), 2);
  expect(proof.master / proof.dry).toBeCloseTo(10 ** (-12 / 20), 2);
});
