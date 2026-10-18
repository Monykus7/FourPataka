import { expect, test } from '@playwright/test';

test('feedback-cycle quantum is measured independently before assigning phaser tail units', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const rows = [];
    for (const rate of [3000, 44100, 48000, 192000])
      for (const requested of [0, 128]) {
        const context = new OfflineAudioContext(1, 1024, rate),
          source = context.createBufferSource();
        const buffer = context.createBuffer(1, 1, rate);
        buffer.getChannelData(0)[0] = 0.1;
        source.buffer = buffer;
        const sum = context.createGain(),
          feedback = context.createGain(),
          loop = context.createDelay(0.1);
        feedback.gain.value = 0.5;
        loop.delayTime.value = requested / rate;
        source.connect(sum).connect(context.destination);
        sum.connect(feedback).connect(loop).connect(sum);
        source.start();
        const data = (await context.startRendering()).getChannelData(0),
          peaks = [];
        for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) > 0.001) peaks.push(i);
        rows.push({ rate, requested, peaks });
        source.disconnect();
        sum.disconnect();
        feedback.disconnect();
        loop.disconnect();
      }
    return rows;
  });
  for (const row of proof) {
    expect(row.peaks[0]).toBe(0);
    expect(row.peaks[1], JSON.stringify(row)).toBe(128 + row.requested);
  }
});
