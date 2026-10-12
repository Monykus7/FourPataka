import { expect, type Page } from '@playwright/test';

export const PERCUSSION_SCORE = `tempo 120
time 4/4
track kickTrack using kick {
  staccato[
    C2 16th
    rest 8th
    C2 16th
  ]
}
track snareTrack using snare {
  rest 8th
  staccato[
    D3 16th
  ]
  rest 16th
}
track hatTrack using hiHat {
  repeat 4 {
    staccato[
      C4 16th
    ]
  }
}`;

export async function hiHatEditingWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill('track hats using hiHat {\n C4 quarter\n}');
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
  await expect.poll(async () => (await saved()).tracks[0].key).toBe('hats');
  const before = await saved();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('button', { name: 'Closed hi-hat hiHat', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Noise level exact value' }).fill('60');
  await page.getByRole('spinbutton', { name: 'Noise high-pass exact value' }).fill('5200');
  await page.getByRole('spinbutton', { name: 'Hit decay exact value' }).fill('75');
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await saved()).instruments.find((p: any) => p.key === 'hiHat').sound.percussion.decay,
    )
    .toBe(0.075);
  expect((await saved()).tracks).toEqual(before.tracks);
  await page.getByRole('combobox', { name: 'Apply destination', exact: true }).selectOption('hats');
  await page.getByRole('button', { name: 'Apply to hats', exact: true }).click();
  await expect
    .poll(async () => (await saved()).tracks[0].sound.percussion)
    .toEqual({ noise: 0.6, highpass: 5200, decay: 0.075 });
  await page.reload();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('button', { name: 'Closed hi-hat hiHat', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Hit decay', exact: true })).toHaveValue('75');
  await page.getByRole('checkbox', { name: 'Percussive hit', exact: true }).uncheck();
  await expect(page.getByRole('slider', { name: 'Hit decay', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Hit decay', exact: true })).toHaveValue('75');
}

export async function drumEditingWorkflow(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Score editor' })
    .fill('track drums using kick {\n C2 quarter\n}');
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
  await expect.poll(async () => (await saved()).tracks[0].key).toBe('drums');
  const before = (await saved()).tracks;
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('button', { name: 'Kick kick', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Pitch drop', exact: true })).toHaveValue('24');
  await expect(page.getByRole('slider', { name: 'Noise decay', exact: true })).toHaveValue('12');
  await page.getByRole('spinbutton', { name: 'Pitch drop exact value' }).fill('18');
  await page.getByRole('spinbutton', { name: 'Pitch decay exact value' }).fill('35');
  await page.getByRole('spinbutton', { name: 'Noise decay exact value' }).fill('20');
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await saved()).instruments.find((preset: any) => preset.key === 'kick').sound.percussion
          .pitch,
    )
    .toEqual({ amount: 18, decay: 0.035 });
  expect((await saved()).tracks).toEqual(before);
  await page
    .getByRole('combobox', { name: 'Apply destination', exact: true })
    .selectOption('drums');
  await page.getByRole('button', { name: 'Apply to drums', exact: true }).click();
  await expect.poll(async () => (await saved()).tracks[0].sound.percussion.noiseDecay).toBe(0.02);
  await page.reload();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('button', { name: 'Kick kick', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Pitch decay', exact: true })).toHaveValue('35');
  await page.getByRole('button', { name: 'Snare snare', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Hit decay', exact: true })).toHaveValue('22');
  await expect(page.getByRole('slider', { name: 'Noise decay', exact: true })).toHaveValue('85');
  await page.getByRole('button', { name: 'Use hit preview', exact: true }).click();
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).not.toHaveClass(
    /playing/,
  );
  await page.screenshot({ path: '.test-results/drum-controls.png', fullPage: true });
}

export async function percussionAvailabilityWorkflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => !!localStorage.getItem('fourpataka.project.v1')))
    .toBe(true);
  const old = await page.evaluate(() => {
    const project = JSON.parse(localStorage.getItem('fourpataka.project.v1')!);
    project.instruments = project.instruments.filter(
      (p: any) => !['kick', 'hiHat', 'snare', 'mellowPluck'].includes(p.key),
    );
    project.instruments.find((p: any) => p.key === 'softBass').sound.trim = -17;
    project.tracks.find((t: any) => t.key === 'bass').sound.trim = -25;
    project.comparison.A.harmonics[1] = 0.15;
    return project;
  });
  // Simulate the user's existing saved session, not a fresh factory project.
  await page.addInitScript(
    (project) => localStorage.setItem('fourpataka.project.v1', JSON.stringify(project)),
    old,
  );
  await page.reload();
  await expect(page.locator('.preset-item')).toHaveCount(5);
  for (const name of ['Kick kick', 'Closed hi-hat hiHat', 'Snare snare'])
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Add percussion presets', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.toast[role=status]')).toContainText('kick, hiHat, snare');
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).instruments.length,
      ),
    )
    .toBe(9);
  const loaded = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  expect(loaded.scoreText).toBe(old.scoreText);
  expect(loaded.tracks).toEqual(old.tracks);
  expect(loaded.comparison).toEqual(old.comparison);
  expect(loaded.processing).toEqual(old.processing);
  expect(loaded.instruments.find((p: any) => p.key === 'softBass').sound.trim).toBe(-17);
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  await editor.fill('track drums using ki');
  await editor.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('kick');
  await editor.fill(PERCUSSION_SCORE);
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop score', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
}

export async function percussionWorkflow(page: Page) {
  const paths = new Set<string>();
  await expect
    .poll(() => page.evaluate(() => !!localStorage.getItem('fourpataka.project.v1')))
    .toBe(true);
  const original = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  for (const [label, key, note, gate] of [
    ['Kick', 'kick', 'C2', '0.5'],
    ['Closed hi-hat', 'hiHat', 'C4', '0.0625'],
    ['Snare', 'snare', 'G3', '0.5'],
  ]) {
    await page.getByRole('button', { name: `${label} ${key}`, exact: true }).click();
    paths.add(
      (await page
        .getByRole('img', {
          name: 'Steady source waveform, after instrument trim, before envelope',
        })
        .locator('path')
        .nth(1)
        .getAttribute('d'))!,
    );
    await expect(page.locator('.percussion-hint')).toContainText(
      key === 'hiHat' ? 'Filtered noise' : key === 'kick' ? 'Falling pitch' : 'wire rattle',
    );
    if (key === 'hiHat') {
      await expect(
        page.getByRole('checkbox', { name: 'Percussive hit', exact: true }),
      ).toBeChecked();
      await expect(page.getByRole('slider', { name: 'Hit decay', exact: true })).toHaveValue('45');
      await expect(page.locator('.source-graphs')).toContainText('Fourier component only');
    }
    await page.getByRole('button', { name: 'Use hit preview', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Audition pitch', exact: true })).toHaveValue(
      note,
    );
    await expect(
      page.getByRole('combobox', { name: 'Audition gate length', exact: true }),
    ).toHaveValue(gate);
    await page.getByRole('button', { name: 'Listen', exact: true }).click();
    // A short gate plus finite release must return to Listen, not hang in audio.
    await expect(page.getByRole('button', { name: 'Listen', exact: true })).not.toHaveClass(
      /playing/,
    );
  }
  expect(paths.size).toBe(3);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).comparisonMaterial.note,
      ),
    )
    .toBe('G3');
  const preview = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  expect(preview.scoreText).toBe(original.scoreText);
  expect(preview.tracks).toEqual(original.tracks);
  expect(preview.comparison.B).toEqual(original.comparison.B);
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await page.getByRole('textbox', { name: 'Score editor' }).fill(PERCUSSION_SCORE);
  await expect(page.getByRole('button', { name: 'Play score', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Play score', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop score', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!).scoreText),
    )
    .toBe(PERCUSSION_SCORE);
  await page.reload();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Audition gate length', exact: true }),
  ).toHaveValue('0.5');
  await expect(
    page.getByRole('button', { name: 'Closed hi-hat hiHat', exact: true }),
  ).toBeVisible();
}

export async function snarePreviewWorkflow(page: Page, captureScreenshot = true) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'Score editor' });
  const source = 'track snares using snare {\n G3 quarter\n}';
  await editor.fill(source);
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
  await expect.poll(async () => (await saved()).scoreText).toBe(source);
  const before = await saved();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await page.getByRole('combobox', { name: 'Audition pitch', exact: true }).selectOption('C2');
  await page.getByRole('button', { name: 'Snare snare', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Audition pitch', exact: true })).toHaveValue(
    'C2',
  );
  await expect(page.getByRole('slider', { name: 'Pitch drop', exact: true })).toHaveValue('0');
  await expect(page.getByRole('slider', { name: 'Noise low-pass', exact: true })).toHaveValue(
    '7800',
  );
  await page.getByRole('button', { name: 'Preview hit', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Audition pitch', exact: true })).toHaveValue(
    'G3',
  );
  await expect(
    page.getByRole('combobox', { name: 'Audition gate length', exact: true }),
  ).toHaveValue('0.5');
  const hit = page.getByRole('img', {
    name: 'Rendered drum hit, including noise, pitch, envelope and trim',
  });
  await expect(hit).toHaveAttribute('data-ready', 'true');
  expect((await hit.locator('path').getAttribute('d'))!.length).toBeGreaterThan(1000);
  await expect(page.getByRole('button', { name: 'Listen', exact: true })).not.toHaveClass(
    /playing/,
  );
  await page.getByRole('spinbutton', { name: 'Noise low-pass exact value' }).fill('6000');
  await page.getByRole('button', { name: 'Save preset', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await saved()).instruments.find((p: any) => p.key === 'snare').sound.percussion.lowpass,
    )
    .toBe(6000);
  expect((await saved()).tracks).toEqual(before.tracks);
  expect((await saved()).comparison.B).toEqual(before.comparison.B);
  await page
    .getByRole('combobox', { name: 'Apply destination', exact: true })
    .selectOption('snares');
  await page.getByRole('button', { name: 'Apply to snares', exact: true }).click();
  await expect.poll(async () => (await saved()).tracks[0].sound.percussion.lowpass).toBe(6000);
  await page.reload();
  await page.getByRole('button', { name: 'Instrument', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Noise low-pass', exact: true })).toHaveValue(
    '6000',
  );
  await expect(hit).toHaveAttribute('data-ready', 'true');
  // Hidden Electron test windows can stall compositor capture; Chrome owns visual proof.
  if (captureScreenshot)
    await page.screenshot({ path: '.test-results/snare-complete-hit.png', fullPage: true });
}
