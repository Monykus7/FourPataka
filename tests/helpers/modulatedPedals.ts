import { expect, type Page } from '@playwright/test';
export async function verifyModulatedListenStop(page: Page) {
  await page.evaluate(() => {
    const proof = { started: 0, stopped: 0 };
    (window as any).modulatedPedalProof = proof;
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const oscillator = create.call(this),
        start = oscillator.start.bind(oscillator),
        stop = oscillator.stop.bind(oscillator);
      let modulation = false;
      oscillator.start = (at = 0) => {
        modulation = oscillator.frequency.value <= 5;
        if (modulation) proof.started++;
        start(at);
      };
      oscillator.stop = (at = 0) => {
        if (modulation) proof.stopped++;
        stop(at);
      };
      return oscillator;
    };
  });
  await page.getByRole('slider', { name: 'Monitor volume', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).modulatedPedalProof.started)).toBe(1);
  await page.getByRole('button', { name: 'Stop all sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).modulatedPedalProof.stopped)).toBe(1);
}
