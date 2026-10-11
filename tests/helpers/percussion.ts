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

export async function percussionWorkflow(page: Page) {
  const paths = new Set<string>();
  await expect
    .poll(() => page.evaluate(() => !!localStorage.getItem('fourpataka.project.v1')))
    .toBe(true);
  const original = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  for (const [label, key, note, gate] of [
    ['Kick', 'kick', 'C2', '0.125'],
    ['Closed hi-hat', 'hiHat', 'C4', '0.0625'],
    ['Snare', 'snare', 'D3', '0.125'],
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
    await expect(page.locator('.percussion-hint')).toContainText('long notes sustain');
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
    .toBe('D3');
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
  ).toHaveValue('0.125');
  await expect(
    page.getByRole('button', { name: 'Closed hi-hat hiHat', exact: true }),
  ).toBeVisible();
}
