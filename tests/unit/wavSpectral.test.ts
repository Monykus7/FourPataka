import { describe, expect, it } from 'vitest';
import { reviewWav } from '../../src/core/wavReview';
import type { WavAnalysisOptions } from '../../src/core/wavNote';
import {
  createSpectralSound,
  readInstrumentSound,
  spectralSettings,
} from '../../src/core/engineSound';
import { spectralContour, spectralFrameAt } from '../../src/modules/foundation/spectral/contour';
import {
  defaultSpectralSettings,
  validateSpectralSettings,
} from '../../src/modules/foundation/spectral/settings';
import { evolvingWav, shortNoiseWav } from '../fixtures/wavSpectral';

const review = (bytes: ArrayBuffer, overrides: Partial<WavAnalysisOptions> = {}) =>
  reviewWav(
    {
      file: new File([bytes], 'capture.wav'),
      options: { channel: 'mix', model: 'evolving', ...overrides },
    },
    () => {},
  );
const magnitude = (values: number[], i: number) => Math.hypot(values[2 * i], values[2 * i + 1]);

describe('W2 analysis and owned settings', () => {
  it.each([44100, 48000])(
    'captures phase, partial decay, resonance and key release at %i Hz',
    async (rate) => {
      const result = await review(evolvingWav(rate), {
        frequency: 220,
        onset: 0.05,
        noteOff: 0.52,
      });
      expect(result.error).toBeUndefined();
      const { settings, resonances, pitched } = result.evolving!;
      expect(pitched).toBe(true);
      expect(resonances).toBeGreaterThanOrEqual(1);
      expect(settings.ratios.some((ratio) => Math.abs(ratio * 220 - 537.5) < 4)).toBe(true);
      const h1 = settings.ratios.findIndex((ratio) => Math.abs(ratio - 1) < 1e-7);
      const h2 = settings.ratios.findIndex((ratio) => Math.abs(ratio - 2) < 1e-7);
      const early = spectralFrameAt(settings.held, 0.04);
      const late = spectralFrameAt(settings.held, 0.24);
      expect(magnitude(early.tones, h2)).toBeGreaterThan(4 * magnitude(late.tones, h2));
      expect(magnitude(late.tones, h1) / magnitude(early.tones, h1)).toBeCloseTo(1, 1);
      expect(Math.atan2(late.tones[2 * h1], late.tones[2 * h1 + 1])).toBeCloseTo(0.3, 1);
      expect(settings.release).toBeCloseTo(0.17, 1);
      expect(settings.released.length).toBeGreaterThan(2);
      expect(() => validateSpectralSettings(settings)).not.toThrow();
    },
  );

  it('estimates a stable pitch through an evolving attack without rounding to a note', async () => {
    const result = await review(evolvingWav(), { body: { start: 0.23, end: 0.43 } });
    expect(result.error).toBeUndefined();
    expect(result.evolving!.settings.referenceHz).toBeCloseTo(220, 0);
    expect(result.evolving!.harmonics).toBeGreaterThanOrEqual(2);
  });

  it('fits a short aperiodic hit with a decaying high band and no invented harmonic', async () => {
    const result = await review(shortNoiseWav());
    expect(result.error).toBeUndefined();
    const { settings, pitched, harmonics, gate } = result.evolving!;
    expect(pitched).toBe(false);
    expect(harmonics).toBe(0);
    expect(gate).toBeLessThan(0.055);
    const peaks = [0, 1, 2].map((band) =>
      Math.max(...settings.held.map((frame) => frame.noise[band])),
    );
    expect(peaks[2]).toBeGreaterThan(3 * peaks[0]);
    expect(peaks[2]).toBeGreaterThan(0.01);
    expect(settings.held.at(-1)!.noise).toEqual([0, 0, 0]);
    expect(() => validateSpectralSettings(settings)).not.toThrow();
  });

  it('validates ordering, release endpoint and independent saved copies', () => {
    const settings = defaultSpectralSettings();
    const sound = createSpectralSound(settings);
    settings.held[1].tones[1] = 0.42;
    expect(spectralSettings(sound)!.held[1].tones[1]).toBe(1);
    const reopened = readInstrumentSound(JSON.parse(JSON.stringify(sound)));
    expect(reopened).toEqual(sound);
    const future = readInstrumentSound({ engine: { ...sound.engine, dataVersion: 2 } });
    expect(future).toMatchObject({
      unavailable: 'Unsupported engine version',
      engine: { settings: sound.engine.settings },
    });
    settings.held[1].time = 0;
    expect(() => validateSpectralSettings(settings)).toThrow('frames');
    settings.held[1].time = 0.02;
    settings.released[1].noise[0] = 0.01;
    expect(() => validateSpectralSettings(settings)).toThrow('end at zero');
  });

  it('anchors a shorter gate to the actual held amplitude before ending the release', () => {
    const settings = defaultSpectralSettings();
    const contour = spectralContour(settings, 0.01, 0.12);
    expect(contour[1]).toEqual({ time: 0.01, tones: [0, 0.5], noise: [0, 0, 0] });
    expect(contour.at(-1)).toEqual({ time: 0.13, tones: [0, 0], noise: [0, 0, 0] });
  });
});
