import { expect, test } from '@playwright/test';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
test('touch rotation prevents page scrolling, clears canceled gestures and preserves snapshot isolation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page.getByRole('button', { name: 'Add overdrive', exact: true }).click();
  await page.getByRole('button', { name: 'Copy A to B', exact: true }).click();
  const dial = page.getByRole('slider', { name: 'overdrive 1 drive dial', exact: true });
  const exact = page.getByRole('spinbutton', {
    name: 'overdrive 1 drive exact value',
    exact: true,
  });
  await dial.scrollIntoViewIfNeeded();
  const box = (await dial.boundingBox())!;
  const point = (angle: number) => ({
    x: box.x + box.width / 2 + Math.sin((angle * Math.PI) / 180) * 18,
    y: box.y + box.height / 2 - Math.cos((angle * Math.PI) / 180) * 18,
  });
  const client = await page.context().newCDPSession(page);
  const initialScroll = await page.evaluate(() => scrollY);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(0)] });
  for (let angle = 15; angle <= 90; angle += 15)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [point(angle)],
    });
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(exact).toHaveValue('14');
  await expect(dial).not.toHaveClass(/dial-dragging/);
  expect(await page.evaluate(() => scrollY)).toBe(initialScroll);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(90)] });
  for (let angle = 75; angle >= 0; angle -= 15)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [point(angle)],
    });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(exact).toHaveValue('6');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(exact).toHaveValue('14');
  await page.getByRole('button', { name: 'B', exact: true }).click();
  await expect(exact).toHaveValue('6');
  await page.getByRole('button', { name: 'A', exact: true }).click();
  await expect(exact).toHaveValue('14');
  await page.screenshot({
    path: '.test-results/interactive-pedal-dials-touch.png',
    fullPage: true,
  });
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await expect(exact).toHaveValue('14');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await client.detach();
});
