import { expect, test } from '@playwright/test';

test('export applies the master pedal order and preserves its independent copy while rendering', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { makePedal, emptyChain } = await import('/src/core/' + 'pedals.ts');
    let project = createProject();
    project.scoreText = 'tempo 120\ntrack test using sine {\n A4 quarter\n}';
    project = reconcileTracks(
      project,
      parseScore(
        project.scoreText,
        project.instruments.map((p: any) => p.key),
      ),
    );
    project.tracks[0].level = 1;
    project.tracks[0].sound.trim = 0;
    project.mixGain = 0.6;
    const drive = makePedal('overdrive'),
      eq = makePedal('eq');
    drive.params.drive = 24;
    drive.params.mix = 100;
    eq.params.frequency = 440;
    eq.params.mid = -18;
    project.processing.master = { ...emptyChain(), pedals: [drive, eq] };
    const pending = renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 });
    project.processing.master.pedals.reverse();
    const first = await pending;
    const second = await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 });
    const rms = (render: any) => {
      const data = render.buffer.getChannelData(0);
      let energy = 0;
      for (let i = 4800; i < 9600; i++) energy += data[i] ** 2;
      return Math.sqrt(energy / 4800);
    };
    return {
      first: rms(first),
      second: rms(second),
      order: first.plan.snapshot.processing.master.pedals.map((p: any) => p.kind),
    };
  });
  expect(proof.order).toEqual(['overdrive', 'eq']);
  expect(proof.first).toBeGreaterThan(0.01);
  expect(proof.second).toBeGreaterThan(0.01);
  expect(Math.abs(proof.first - proof.second)).toBeGreaterThan(0.02);
});

test('offline polyphony follows the same scheduled 32-voice admission as playback at both sample rates', async ({
  page,
}) => {
  await page.goto('/');
  const amplitudes = await page.evaluate(async () => {
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    let project = createProject();
    project.scoreText =
      'tempo 120\ntrack many using sine {\n chord:(' +
      Array(32).fill('A').join(' ') +
      ')4 quarter\n}\ntrack last using sine {\n A4 quarter\n}';
    project = reconcileTracks(
      project,
      parseScore(
        project.scoreText,
        project.instruments.map((p: any) => p.key),
      ),
    );
    project.mixGain = 1;
    project.tracks.forEach((t: any, i: number) => {
      t.level = 0.01;
      t.sound.trim = -20;
      t.sound.polarity[0] = i ? -1 : 1;
    });
    const values: number[] = [];
    for (const sampleRate of [44100, 48000]) {
      const rendered = await renderWav(project, { sampleRate, channels: 1, tailSeconds: 0 });
      const data = rendered.buffer.getChannelData(0);
      let energy = 0;
      for (let i = sampleRate / 10; i < sampleRate / 5; i++) energy += data[i] ** 2;
      values.push(Math.sqrt(energy / (sampleRate / 10)) * Math.sqrt(2));
    }
    return values;
  });
  // The 33rd voice retires one of 32 positive sources: 31 positive + 1 negative.
  amplitudes.forEach((value) => expect(value).toBeCloseTo(0.03, 5));
});

test('WAV rendering uses applied sounds, timing, mix, independent snapshots and shared latency alignment', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const exportPath = '/src/audio/export.ts',
      projectPath = '/src/core/project.ts',
      pedalsPath = '/src/core/pedals.ts';
    const { renderWav } = await import(exportPath);
    const { createProject, reconcileTracks } = await import(projectPath);
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { makePedal, emptyChain } = await import(pedalsPath);
    const project = createProject();
    project.scoreText =
      'tempo 120\ntime 3/4\ntrack one using sine {\n A4 quarter\n rest quarter\n}\ntrack two using sine {\n A4 quarter\n}';
    let owned = reconcileTracks(
      project,
      parseScore(
        project.scoreText,
        project.instruments.map((p: any) => p.key),
      ),
    );
    owned.mixGain = 0.6;
    owned.tracks.forEach((t: any) => {
      t.level = 0.5;
      t.sound.trim = 0;
      t.sound.release = 0.2;
    });
    owned.tracks[1].sound.polarity[0] = -1;
    const compressor = makePedal('compressor');
    compressor.params.ratio = 1;
    compressor.params.mix = 100;
    owned.processing.tracks.one = { ...emptyChain(), pedals: [compressor] };
    const canceled = await renderWav(owned, { sampleRate: 48000, channels: 2, tailSeconds: 0 });
    const cancelPeak = canceled.peak;
    owned.tracks[1].level = 0;
    const pending = renderWav(owned, { sampleRate: 44100, channels: 1, tailSeconds: 0 });
    owned.tracks[0].sound.harmonics[0] = 0;
    owned.mixGain = 0;
    const rendered = await pending;
    const samples = rendered.buffer.getChannelData(0);
    let energy = 0;
    for (let i = 4410; i < 8820; i++) energy += samples[i] ** 2;
    return {
      cancelPeak,
      rms: Math.sqrt(energy / 4410),
      duration: rendered.buffer.duration,
      latency: rendered.plan.latency,
      channels: rendered.buffer.numberOfChannels,
      releasePeak: Math.max(...Array.from(samples.slice(23000, 26000), Math.abs)),
      endPeak: Math.max(...Array.from(samples.slice(-1000), Math.abs)),
      unchanged: rendered.plan.snapshot.mixGain,
    };
  });
  expect(proof.cancelPeak).toBeLessThan(0.0002);
  expect(proof.rms).toBeCloseTo(0.3 / Math.sqrt(2), 3);
  expect(proof.duration).toBeCloseTo(1.3 + proof.latency, 4);
  expect(proof.channels).toBe(1);
  expect(proof.releasePeak).toBeGreaterThan(0.05);
  expect(proof.endPeak).toBe(0);
  expect(proof.unchanged).toBe(0.6);
});

test('export retains echoes, reports a capped tail and fades the cap; bypass and unplugged paths agree', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const { createProject, reconcileTracks } = await import('/src/core/' + 'project.ts');
    const { parseScore } = await import('/src/core/' + 'parser.ts');
    const { makePedal, emptyChain } = await import('/src/core/' + 'pedals.ts');
    let project = createProject();
    project.scoreText = 'tempo 120\ntrack test using sine {\n A4 16th\n}';
    project = reconcileTracks(
      project,
      parseScore(
        project.scoreText,
        project.instruments.map((p: any) => p.key),
      ),
    );
    project.tracks[0].sound.trim = 0;
    project.tracks[0].sound.release = 0.01;
    const delay = makePedal('delay');
    delay.params = { time: 400, feedback: 80, mix: 100, output: 0 };
    project.processing.master = { ...emptyChain(), pedals: [delay] };
    const capped = await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0.25 });
    const full = await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 2 });
    const fullData = full.buffer.getChannelData(0);
    const echoPeak = Math.max(...Array.from(fullData.slice(19200, 25000), Math.abs));
    project.processing.master.board = {
      positions: { [delay.id]: { column: 0, row: 0 } },
      cables: [],
    };
    const unplugged = await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 });
    project.processing.master.bypassed = true;
    const bypass = await renderWav(project, { sampleRate: 48000, channels: 1, tailSeconds: 0 });
    return {
      capped: capped.capped,
      last: capped.buffer.getChannelData(0).at(-1),
      echoPeak,
      silent: unplugged.peak,
      dry: bypass.peak,
      bypassCap: bypass.capped,
    };
  });
  expect(proof.capped).toBe(true);
  expect(proof.last).toBe(0);
  expect(proof.echoPeak).toBeGreaterThan(0.1);
  expect(proof.silent).toBe(0);
  expect(proof.dry).toBeGreaterThan(0.1);
  expect(proof.bypassCap).toBe(false);
});
