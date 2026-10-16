import { expect, test } from '@playwright/test';
test('stereo meter preserves anti-phase energy, duplicates mono, and observes the pre-monitor bus', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createOutputMeter } = await import('/src/audio/' + 'outputMeter.ts');
    const output = [];
    for (const rate of [44100, 48000]) {
      const context = new AudioContext({ sampleRate: rate });
      const bus = context.createGain(),
        mute = context.createGain();
      mute.gain.value = 0;
      bus.connect(mute);
      mute.connect(context.destination);
      const meter = createOutputMeter(context, bus);
      const merger = context.createChannelMerger(2);
      const l = context.createConstantSource(),
        r = context.createConstantSource();
      l.offset.value = 0.5;
      r.offset.value = -0.5;
      l.connect(merger, 0, 0);
      r.connect(merger, 0, 1);
      merger.connect(bus);
      const downmix = context.createAnalyser();
      bus.connect(downmix);
      l.start();
      r.start();
      await context.resume();
      const wait = async (seconds = 0.25) => {
        const target = context.currentTime + seconds,
          deadline = performance.now() + 5000;
        while (context.currentTime < target) {
          if (performance.now() > deadline) throw new Error('Audio clock stalled');
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      };
      await wait();
      const stereo = meter.read();
      const downmixed = new Float32Array(downmix.fftSize);
      downmix.getFloatTimeDomainData(downmixed);
      merger.disconnect(bus);
      l.disconnect();
      r.disconnect();
      l.offset.setValueAtTime(0.25, context.currentTime);
      l.connect(bus);
      // Flush 100ms while older samples remain in the larger power-of-two FFT.
      await wait(0.13);
      const mono = meter.read();
      output.push({
        stereo,
        mono,
        window: meter.windowSamples,
        rate: context.sampleRate,
        cancellation: Math.max(...downmixed.map(Math.abs)),
      });
      l.stop();
      r.stop();
      meter.disconnect();
      await context.close();
    }
    return output;
  });
  for (const proof of result) {
    expect(proof.window).toBe(proof.rate / 10);
    expect(proof.stereo.rms).toBeCloseTo(0.5, 6);
    expect(proof.stereo.peak).toBeCloseTo(0.5, 6);
    expect(proof.stereo.crestDb).toBeCloseTo(0, 6);
    expect(proof.cancellation).toBe(0);
    expect(proof.mono.rms).toBeCloseTo(0.25, 6);
  }
});
