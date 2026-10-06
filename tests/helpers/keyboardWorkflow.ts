import { expect, type Locator, type Page } from '@playwright/test';

// Walk the actual Tab order: locator.focus()/click() would hide unreachable controls.
export async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (let i = 0; i < 220; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    if (
      await page.evaluate(
        () => document.activeElement?.getAttribute('aria-label') === 'Score editor',
      )
    )
      await page.keyboard.press('Control+m');
    await page.keyboard.press('Tab');
  }
  throw new Error(
    `Control is not reachable with Tab: ${(await target.getAttribute('aria-label')) || (await target.textContent())}`,
  );
}

export async function keyboardWorkflow(page: Page) {
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  const activate = async (name: string) => {
    await tabTo(page, button(name));
    await page.keyboard.press('Enter');
  };
  const type = async (target: Locator, value: string) => {
    await tabTo(page, target);
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText(value);
  };
  await activate('Waveform');
  await activate('Add dot');
  await type(page.getByRole('spinbutton', { name: 'Selected dot position' }), '12');
  await type(page.getByRole('spinbutton', { name: 'Selected dot amplitude' }), '.35');
  await activate('Copy A to B');
  await activate('Save sound as new preset');
  await type(page.getByRole('textbox', { name: 'Display name', exact: true }), 'Keyboard voice');
  await type(page.getByRole('textbox', { name: 'Score key', exact: true }), 'keyboardVoice');
  await activate('Save as new instrument');
  await activate('Listen');
  await expect(page.locator('.audition-button')).toHaveClass(/playing/);
  await activate('B');
  await expect(button('B')).toHaveAttribute('aria-pressed', 'true');
  await activate('A');
  await activate('Replay comparison');
  await activate('Stop all sound');
  await expect(page.locator('.audition-button')).not.toHaveClass(/playing/);
  await activate('Compose');
  await activate('Make a track');
  await type(page.getByRole('textbox', { name: 'New track name' }), 'keyboardLead');
  await expect(page.getByRole('combobox', { name: 'New track instrument' })).toHaveValue(
    'keyboardVoice',
  );
  await activate('Add track');
  await activate('Pedalboard');
  await tabTo(page, button('Equipment'));
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'Three-band EQ', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(button('Place pedal row 1 column 1')).toBeFocused();
  await page.keyboard.press('Enter');
  await activate('Board input output jack');
  await activate('eq 1 input jack');
  await activate('eq 1 output jack');
  await activate('Board output input jack');
  await activate('Cancel tool');
  await type(page.getByRole('spinbutton', { name: 'eq 1 low gain exact value', exact: true }), '3');
  await type(page.getByRole('textbox', { name: 'New chain preset name' }), 'Keyboard board');
  await type(page.getByRole('textbox', { name: 'New chain score key' }), 'keyboardBoard');
  await activate('Save chain as new');
  const destination = page.getByRole('combobox', { name: 'Chain application destination' });
  await tabTo(page, destination);
  await page.keyboard.press('End');
  await expect(destination).toHaveValue('track:keyboardLead');
  await activate('Apply chain to destination');
  await activate('Compose');
  const event = page.getByRole('combobox', { name: 'Inspect keyboardLead event', exact: true });
  await tabTo(page, event);
  await page.keyboard.press('End');
  await expect(page.getByRole('status', { name: 'Selected timeline event' })).toContainText(
    'keyboardLead · G4',
  );
  await activate('Play score');
  await expect(button('Stop score')).toBeVisible();
  await activate('Stop all sound');
  await activate('Play score');
  await expect(button('Stop score')).toBeVisible();
  await activate('Stop all sound');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('fourpataka.project.v1');
        return raw ? JSON.parse(raw).scoreText : '';
      }),
    )
    .toContain('track keyboardLead using keyboardVoice through keyboardBoard');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fourpataka.project.v1')!),
  );
  const instrument = saved.instruments.find((preset: any) => preset.key === 'keyboardVoice');
  const track = saved.tracks.find((track: any) => track.key === 'keyboardLead');
  expect(track.sound).toEqual(instrument.sound);
  expect(saved.comparison.A.waveformPoints).toHaveLength(8);
  expect(saved.comparison.B.waveformPoints).toEqual(saved.comparison.A.waveformPoints);
  expect(saved.processing.audition.A.pedals[0].params.low).toBe(3);
  expect(saved.processing.audition.B.pedals).toHaveLength(0);
  expect(saved.processing.tracks.keyboardLead.pedals[0].params.low).toBe(3);
  expect(saved.processing.master.pedals).toHaveLength(0);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!)))
    .toEqual(saved);
  return saved;
}
