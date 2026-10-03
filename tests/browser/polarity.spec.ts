import { expect, test } from '@playwright/test';

const waveform = (page: import('@playwright/test').Page) =>
  page
    .getByRole('img', { name: 'Steady source waveform, after instrument trim, before envelope' })
    .locator('path')
    .nth(1);
const saved = async (page: import('@playwright/test').Page) => {
  await expect(page.getByText('Saved locally', { exact: true })).toBeVisible();
  return page.evaluate(() => JSON.parse(localStorage.getItem('fourpataka.project.v1')!));
};

test('visible sign buttons and exact inspector change waveform with separate undo and redo', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Triangle triangle', exact: true }).click();
  const sign = page.getByRole('button', { name: 'H3 inverted polarity', exact: true });
  await expect(sign).toHaveText('−');
  const originalPath = await waveform(page).getAttribute('d');
  await sign.click();
  await expect(sign).toHaveText('+');
  await expect(page.getByRole('combobox', { name: 'H3 polarity', exact: true })).toHaveValue('1');
  await expect(page.getByRole('spinbutton', { name: 'H3 exact magnitude' })).toHaveValue('0.111');
  await expect(waveform(page)).not.toHaveAttribute('d', originalPath!);
  await page.getByRole('combobox', { name: 'H3 polarity', exact: true }).selectOption('-1');
  await expect(waveform(page)).toHaveAttribute('d', originalPath!);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(sign).toHaveText('+');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(sign).toHaveText('−');
  await page.screenshot({ path: '.test-results/polarity-desktop.png', fullPage: true });
});

test('zero-magnitude sign stays editable, keyboard accessible and isolated in saved A/B copies', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Triangle triangle', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  await page.getByRole('button', { name: 'B', exact: true }).click();
  const sign = page.getByRole('button', { name: 'H2 inverted polarity', exact: true });
  const before = await waveform(page).getAttribute('d');
  await sign.focus();
  await sign.press('Enter');
  await expect(sign).toHaveAttribute('aria-pressed', 'true');
  await expect(waveform(page)).toHaveAttribute('d', before!);
  await page.getByRole('spinbutton', { name: 'H2 exact magnitude' }).fill('0.2');
  await expect(page.getByLabel('H2 signed coefficient', { exact: true })).toHaveText('−0.200');
  const project = await saved(page);
  expect(project.comparison.B.polarity[1]).toBe(-1);
  expect(project.comparison.A.polarity[1]).toBe(1);
  expect(
    project.instruments.find((preset: any) => preset.key === 'triangle').sound.polarity[1],
  ).toBe(1);
  await page.reload();
  await expect(sign).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(sign).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('spinbutton', { name: 'H2 exact magnitude' })).toHaveValue('0');
});

test('the UI sign change produces the expected inverted sine in actual rendered audio', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Triangle triangle', exact: true }).click();
  const before = (await saved(page)).comparison.A;
  await page.getByRole('button', { name: 'H3 inverted polarity', exact: true }).click();
  const after = (await saved(page)).comparison.A;
  const proof = await page.evaluate(
    async ({ before, after }) => {
      const voicePath = '/src/audio/voice.ts';
      const { createVoice } = await import(voicePath);
      const render = async (sound: any) => {
        const context = new OfflineAudioContext(1, 14400, 48000);
        createVoice(context, context.destination, sound, 480, 0, 0.3);
        const data = (await context.startRendering()).getChannelData(0);
        let h1 = 0,
          h3 = 0;
        for (let i = 4800; i < 9600; i++) {
          h1 += data[i] * Math.sin((2 * Math.PI * 480 * i) / 48000);
          h3 += data[i] * Math.sin((2 * Math.PI * 1440 * i) / 48000);
        }
        return { h1: h1 / 2400, h3: h3 / 2400 };
      };
      return { before: await render(before), after: await render(after) };
    },
    { before, after },
  );
  expect(proof.before.h3).toBeCloseTo(-(10 ** (-12 / 20)) / 9, 4);
  expect(proof.after.h3).toBeCloseTo(10 ** (-12 / 20) / 9, 4);
  expect(proof.after.h1).toBeCloseTo(proof.before.h1, 5);
});

test('sign controls remain reachable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const sign = page.getByRole('button', { name: 'H16 inverted polarity', exact: true });
  await sign.scrollIntoViewIfNeeded();
  await sign.click();
  await expect(page.getByRole('combobox', { name: 'H16 polarity', exact: true })).toHaveValue('-1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
