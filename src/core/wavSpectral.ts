import {
  defaultSpectralSettings,
  SPECTRAL_TONES,
  spectralFrame,
  type SpectralFrame,
  type SpectralSettings,
} from '../modules/engines/spectral/settings';
import { splitSpectralNoise } from '../modules/engines/spectral/noise';
import {
  estimatePitch,
  MAX_WAV_PITCH,
  MIN_WAV_PITCH,
  type WavAnalysisOptions,
  type WavEnvelope,
} from './wavNote';
import { wavSpectralPeaks } from './wavPeaks';

const TAU = 2 * Math.PI;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
type Tone = { hz: number; harmonic: boolean };

export interface WavSpectralFit {
  settings: SpectralSettings;
  pitched: boolean;
  gate: number;
  harmonics: number;
  resonances: number;
  warnings: string[];
}

function windowAt(
  samples: Float32Array,
  rate: number,
  center: number,
  seconds: number,
  onset: number,
) {
  const count = Math.max(8, Math.round(seconds * rate));
  const first = Math.round(center * rate) - Math.floor(count / 2);
  const age = first / rate - onset;
  const weights = Float64Array.from(
    { length: count },
    (_, i) => 0.5 - 0.5 * Math.cos((TAU * i) / count),
  );
  const weight = weights.reduce((sum, value) => sum + value, 0);
  const mean =
    weights.reduce((sum, value, i) => sum + value * (samples[first + i] ?? 0), 0) / weight;
  const signal = weights.map((_, i) => (samples[first + i] ?? 0) - mean);
  return { age, signal, weights, weight };
}

function project(window: ReturnType<typeof windowAt>, rate: number, hz: number): [number, number] {
  const { age, signal, weights, weight } = window;
  const step = (TAU * hz) / rate;
  const phase = (TAU * hz * age) % TAU;
  let cosine = 0,
    sine = 0;
  for (let i = 0; i < signal.length; i++) {
    const value = signal[i] * weights[i];
    cosine += value * Math.cos(phase + step * i);
    sine += value * Math.sin(phase + step * i);
  }
  return [(2 * cosine) / weight, (2 * sine) / weight];
}

function choosePitch(
  samples: Float32Array,
  rate: number,
  timing: WavEnvelope,
  gate: number,
  options: WavAnalysisOptions,
) {
  if (options.frequency !== undefined) {
    if (
      !Number.isFinite(options.frequency) ||
      options.frequency < MIN_WAV_PITCH ||
      options.frequency > MAX_WAV_PITCH
    )
      throw new Error('Enter a reference pitch between 30 and 2000 Hz.');
    return options.frequency;
  }
  const start = timing.onset;
  const later = start + gate * 0.35;
  const regions = [timing.body];
  if (!options.body && gate > 0.11)
    regions.push({ start: later, end: Math.min(start + gate, later + 0.16) });
  const estimates = regions.flatMap((region) => {
    const estimate = estimatePitch(samples, rate, region);
    return estimate && estimate.periodicity >= 0.79 ? [{ ...estimate, region }] : [];
  });
  const best = estimates.sort((a, b) => b.periodicity - a.periodicity)[0];
  if (!best) return null;
  const { frequency, region } = best;
  const window = windowAt(
    samples,
    rate,
    (region.start + region.end) / 2,
    region.end - region.start,
    timing.onset,
  );
  let harmonic = 1;
  let power = 0;
  for (let h = 1; h <= 32 && h * frequency < rate * 0.48; h++) {
    const magnitude = Math.hypot(...project(window, rate, h * frequency));
    if (magnitude > power) {
      harmonic = h;
      power = magnitude;
    }
  }
  // Refine the strongest partial around the lag estimate. Small reference
  // errors would otherwise look like phase drift at higher harmonics.
  let hz = harmonic * frequency;
  for (const step of [0.5, 0.1, 0.02]) {
    const center = hz;
    for (let i = -4; i <= 4; i++) {
      const candidate = center + i * step;
      const magnitude = Math.hypot(...project(window, rate, candidate));
      if (magnitude > power) {
        hz = candidate;
        power = magnitude;
      }
    }
  }
  return clamp(hz / harmonic, MIN_WAV_PITCH, MAX_WAV_PITCH);
}

function modes(
  samples: Float32Array,
  rate: number,
  timing: WavEnvelope,
  gate: number,
  pitch: number | null,
) {
  const early = timing.onset + Math.min(0.055, gate * 0.27);
  const body = Math.min(timing.onset + gate, (timing.body.start + timing.body.end) / 2);
  const later = Math.max(timing.onset + gate * 0.5, body);
  const first = wavSpectralPeaks(samples, rate, early);
  const second = wavSpectralPeaks(samples, rate, later);
  const resolution = rate / 2 ** Math.ceil(Math.log2(rate * 0.064));
  const found: Tone[] = [];
  for (const peak of first) {
    if (peak.power < first[0].power * 0.008) break;
    const match = second.find(
      (item) =>
        Math.abs(item.hz - peak.hz) < resolution * 0.62 && item.power > second[0].power * 0.008,
    );
    if (!match) continue;
    const hz = (peak.hz * peak.power + match.hz * match.power) / (peak.power + match.power);
    const harmonic = pitch ? Math.round(hz / pitch) : 0;
    if (
      pitch &&
      harmonic >= 1 &&
      harmonic <= 32 &&
      Math.abs(hz - harmonic * pitch) < Math.max(2.4 * resolution, hz * 0.008)
    )
      continue;
    if (found.some((tone) => Math.abs(tone.hz - hz) < 2.4 * resolution)) continue;
    found.push({ hz, harmonic: false });
    if (found.length >= 3) break;
  }
  return found;
}

function residualNoise(
  window: ReturnType<typeof windowAt>,
  rate: number,
  tones: Tone[],
  values: number[],
) {
  const { age, signal, weights, weight } = window;
  const residual = signal.slice();
  tones.forEach(({ hz }, i) => {
    const phase = (TAU * hz * age) % TAU;
    const step = (TAU * hz) / rate;
    for (let k = 0; k < residual.length; k++)
      residual[k] -=
        values[2 * i] * Math.cos(phase + step * k) + values[2 * i + 1] * Math.sin(phase + step * k);
  });
  const split = splitSpectralNoise(rate);
  const power = [0, 0, 0];
  let sourcePower = 0;
  for (let i = 0; i < residual.length; i++) {
    const bands = split(residual[i]);
    for (let band = 0; band < 3; band++) power[band] += bands[band] ** 2 * weights[i];
    sourcePower += signal[i] ** 2 * weights[i];
  }
  const floor = Math.max(0.0001, Math.sqrt(sourcePower / weight) * 0.035);
  return power.map((value) => Math.max(0, Math.sqrt(value / weight) - floor));
}

export function fitWavSpectrum(
  samples: Float32Array,
  rate: number,
  timing: WavEnvelope,
  options: WavAnalysisOptions,
): WavSpectralFit {
  const gate = Math.max(0.005, (timing.noteOff ?? timing.end) - timing.onset);
  const release = timing.noteOff === null ? 0.06 : clamp(timing.end - timing.noteOff, 0.01, 3);
  const pitch = choosePitch(samples, rate, timing, gate, options);
  const referenceHz = pitch ?? 220;
  const candidates: Tone[] = modes(samples, rate, timing, gate, pitch);
  if (pitch) {
    for (let h = 1; h <= 32 && h * pitch < rate * 0.49; h++)
      candidates.push({ hz: h * pitch, harmonic: true });
  }
  const heldTimes = [
    0,
    0.004,
    0.009,
    0.018,
    0.036,
    0.072,
    0.144,
    0.288,
    0.576,
    1.152,
    2.304,
    4.608,
    timing.attackEnd - timing.onset,
    (timing.body.start + timing.body.end) / 2 - timing.onset,
    gate / 2,
    gate,
  ]
    .filter((time) => time >= 0 && time <= gate)
    .sort((a, b) => a - b)
    .filter((time, i, times) => i === 0 || time - times[i - 1] >= 1 / rate);
  if (heldTimes.at(-1) !== gate) heldTimes[heldTimes.length - 1] = gate;
  const releaseTimes = timing.noteOff === null ? [0, 1] : [0, 0.08, 0.2, 0.38, 0.6, 0.82, 1];
  const positions = [...heldTimes, ...releaseTimes.slice(1).map((time) => gate + time * release)];
  const tonalWindow = clamp(4 / (pitch ?? 150), 0.018, 0.115);
  const recorded = positions.map((age, i) => {
    const center = timing.onset + age;
    if (i === 0 || i === positions.length - 1) return Array<number>(candidates.length * 2).fill(0);
    const window = windowAt(samples, rate, center, tonalWindow, timing.onset);
    return candidates.flatMap((tone) => project(window, rate, tone.hz));
  });
  const ranked = candidates
    .map((tone, index) => ({
      tone,
      index,
      peak: Math.max(
        ...recorded.map((frame) => Math.hypot(frame[index * 2], frame[index * 2 + 1])),
      ),
    }))
    .sort((a, b) => b.peak - a.peak);
  const selected = ranked
    .filter((item) => item.peak > Math.max(0.00025, ranked[0].peak * 0.018))
    .slice(0, SPECTRAL_TONES)
    .sort((a, b) => a.tone.hz - b.tone.hz);
  const tones = selected.map((item) => item.tone);
  const frames = positions.map((age, i): SpectralFrame => {
    if (i === 0 || i === positions.length - 1) return spectralFrame(age, tones.length);
    const amplitudes = selected.flatMap(({ index }) => [
      recorded[i][2 * index],
      recorded[i][2 * index + 1],
    ]);
    const window = windowAt(samples, rate, timing.onset + age, 0.016, timing.onset);
    return { time: age, tones: amplitudes, noise: residualNoise(window, rate, tones, amplitudes) };
  });
  if (timing.noteOff === null && timing.end < samples.length / rate - 2 * timing.step)
    frames[heldTimes.length - 1] = spectralFrame(gate, tones.length);
  const bound = (frame: SpectralFrame) =>
    tones.reduce((sum, _, i) => sum + Math.hypot(frame.tones[2 * i], frame.tones[2 * i + 1]), 0) +
    5 * frame.noise.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(...frames.map(bound));
  if (peak < 0.00015) throw new Error('No audible spectral contour found in the selected crop.');
  const scale = Math.min(1, 0.9 / peak);
  const trim = clamp(20 * Math.log10(peak * scale), -36, 0);
  const normalize = (frame: SpectralFrame, time: number): SpectralFrame => ({
    time,
    tones: frame.tones.map((value) => (value * scale) / 10 ** (trim / 20)),
    noise: frame.noise.map((value) => (value * scale) / 10 ** (trim / 20)),
  });
  const harmonics = tones.filter((tone) => tone.harmonic).length;
  const warnings: string[] = [];
  if (!pitch)
    warnings.push(
      'No stable fundamental found. Noise stays at fixed bands. Any resonances transpose from an A3 reference.',
    );
  if (pitch && !options.frequency && !tones.some((tone) => tone.hz === pitch))
    warnings.push('The fundamental is weak or missing. Check the reference octave.');
  if (timing.noteOff === null)
    warnings.push(
      'Key release is unknown. The measured decay is part of the held contour; preview uses a 60 ms release.',
    );
  if (scale < 0.999) warnings.push('The fitted contour was attenuated for output headroom.');
  return {
    settings: {
      ...defaultSpectralSettings(),
      referenceHz,
      ratios: tones.map((tone) => tone.hz / referenceHz),
      trim,
      release,
      held: frames.slice(0, heldTimes.length).map((frame) => normalize(frame, frame.time)),
      released: releaseTimes.map((time, i) => normalize(frames[heldTimes.length - 1 + i], time)),
    },
    pitched: pitch !== null,
    gate,
    harmonics,
    resonances: tones.length - harmonics,
    warnings,
  };
}
