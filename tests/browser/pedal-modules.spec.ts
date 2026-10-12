import { expect, test } from '@playwright/test';
import { levelModuleWorkflow } from '../helpers/pedalModules';

test('independent level module drags patches adjusts resets and keeps owned copies through reload', async ({
  page,
}) => {
  await page.goto('/');
  await levelModuleWorkflow(page);
  await page.screenshot({ path: '.test-results/level-module-desktop.png', fullPage: true });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('fourpataka.project.v1')!).processing.master.pedals[0]
            ?.params.output,
      ),
    )
    .toBe(-6);
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Pedal editing destination', exact: true })
    .selectOption('master');
  await expect(
    page.getByRole('spinbutton', { name: 'example:pedal/level 1 output exact value', exact: true }),
  ).toHaveValue('-6');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('region', { name: 'Selected pedal controls' })).toContainText(
    'Level',
  );
  await page.screenshot({ path: '.test-results/level-module-narrow.png', fullPage: true });
});

test('all registered pedals satisfy shared dry bypass isolation finite and disposal checks at both rates', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { pedalModules } = await import('/src/modules/' + 'assembly.ts');
    const { makePedal } = await import('/src/core/' + 'pedals.ts');
    const { createEffect, measureOversamplingLatency, measureCompressorLatency } = await import(
      '/src/audio/' + 'effects.ts'
    );
    const results = [];
    for (const rate of [44100, 48000]) {
      const driveLatency = await measureOversamplingLatency(rate),
        compressorLatency = await measureCompressorLatency(rate);
      for (const module of pedalModules.definitions) {
        const kind = module.legacyKind ?? module.id;
        const render = async (bypass: boolean, mix: number) => {
          const context = new OfflineAudioContext(1, rate / 2, rate);
          const source = context.createBufferSource();
          source.buffer = context.createBuffer(1, rate / 2, rate);
          const sourceData = source.buffer.getChannelData(0);
          for (let i = 0; i < rate / 4; i++)
            sourceData[i] = 0.1 * Math.sin((2 * Math.PI * 220 * i) / rate);
          const pedal = makePedal(kind);
          pedal.bypassed = bypass;
          pedal.params.mix = mix;
          const effect = createEffect(context, pedal, driveLatency, compressorLatency);
          source.connect(effect.input);
          effect.output.connect(context.destination);
          source.start();
          const data = (await context.startRendering()).getChannelData(0);
          const latency = effect.latency;
          const peak = Math.max(...data.map(Math.abs));
          effect.dispose();
          effect.dispose();
          return { data: Array.from(data), latency, peak };
        };
        const dry = await render(false, 0),
          bypass = await render(true, 100),
          wet = await render(false, 100);
        results.push({
          kind,
          rate,
          finite: wet.data.every(Number.isFinite),
          peak: wet.peak,
          error: Math.max(...dry.data.map((sample, i) => Math.abs(sample - bypass.data[i]))),
          latency: wet.latency,
        });
      }
    }
    return results;
  });
  expect(proof).toHaveLength(10);
  for (const result of proof) {
    expect(result.finite).toBe(true);
    expect(result.peak).toBeLessThan(1);
    expect(result.error).toBeLessThan(1e-6);
    expect(result.latency).toBeGreaterThanOrEqual(0);
  }
});

test('level gain and mix agree with its analytic transfer and frozen WAV at 44.1 and 48 kHz', async ({
  page,
}) => {
  await page.goto('/');
  const proof = await page.evaluate(async () => {
    const { makePedal } = await import('/src/core/' + 'pedals.ts');
    const { createEffect } = await import('/src/audio/' + 'effects.ts');
    const { createProject } = await import('/src/core/' + 'project.ts');
    const { renderWav } = await import('/src/audio/' + 'export.ts');
    const results = [];
    for (const rate of [44100, 48000]) {
      for (const mix of [0, 50, 100]) {
        const context = new OfflineAudioContext(1, rate / 10, rate),
          source = context.createConstantSource();
        source.offset.value = 0.1;
        const pedal = makePedal('example:pedal/level');
        pedal.params.output = -6;
        pedal.params.mix = mix;
        const effect = createEffect(context, pedal);
        source.connect(effect.input);
        effect.output.connect(context.destination);
        source.start();
        const data = (await context.startRendering()).getChannelData(0);
        results.push(Math.abs(data[1000] - 0.1 * (1 - mix / 100 + (mix / 100) * 10 ** (-6 / 20))));
        effect.dispose();
      }
      const project = createProject();
      project.scoreText = 'tempo 120\ntrack test using sine {\n A4 quarter\n}';
      const pedal = makePedal('example:pedal/level');
      pedal.params.output = -6;
      project.processing.master.pedals = [pedal];
      const options = {
        sampleRate: rate,
        channels: 1,
        bitDepth: 16,
        normalize: false,
        tailSeconds: 0,
      } as any;
      const first = renderWav(project, options);
      pedal.params.output = 12;
      const frozen = await first;
      pedal.params.output = -6;
      const repeated = await renderWav(project, options);
      results.push(
        Math.max(
          ...frozen.buffer
            .getChannelData(0)
            .map((v: number, i: number) => Math.abs(v - repeated.buffer.getChannelData(0)[i])),
        ),
      );
    }
    return results;
  });
  for (const error of proof) expect(error).toBeLessThan(1e-7);
});

test('unavailable module stays visible recoverable and blocks DSP and WAV', async ({ page }) => {
  await page.goto('/');
  const seed = await page.evaluate(async () => {
    const { createProject } = await import('/src/core/' + 'project.ts');
    const project: any = createProject();
    project.processing.audition.A.pedals = [
      {
        id: 'missing',
        kind: 'future:pedal/color',
        bypassed: false,
        module: { id: 'future:pedal/color', apiVersion: 2, dataVersion: 3 },
        params: { curve: [0, 1], mode: 'warm' },
      },
    ];
    return project;
  });
  await page.addInitScript(
    (project) => localStorage.setItem('fourpataka.project.v1', JSON.stringify(project)),
    seed,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Pedalboard', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected pedal controls' })).toContainText(
    'Settings are retained for recovery',
  );
  const proof = await page.evaluate(async () => {
    const { importProject } = await import('/src/core/' + 'project.ts');
    const project = importProject(localStorage.getItem('fourpataka.project.v1')!);
    const { createChain } = await import('/src/audio/' + 'effects.ts');
    const { prepareExport } = await import('/src/audio/' + 'export.ts');
    let chainError = '',
      exportError = '';
    try {
      createChain(new OfflineAudioContext(1, 4800, 48000), project.processing.audition.A);
    } catch (error) {
      chainError = String(error);
    }
    project.processing.master = structuredClone(project.processing.audition.A);
    try {
      prepareExport(project, {
        sampleRate: 48000,
        channels: 1,
        bitDepth: 16,
        normalize: false,
        tailSeconds: 0,
      } as any);
    } catch (error) {
      exportError = String(error);
    }
    return {
      chainError,
      exportError,
      original: project.processing.audition.A.pedals[0].unavailable!.original.params,
    };
  });
  expect(proof.chainError).toContain('Unavailable pedal');
  expect(proof.exportError).toContain('Unavailable pedal');
  expect(proof.original).toEqual({ curve: [0, 1], mode: 'warm' });
});
