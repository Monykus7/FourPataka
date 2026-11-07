import { fourierShape, HARMONIC_COUNT, type FourierSound } from '../modules/foundation/fourier';
import { dbToGain } from '../modules/foundation/fourierComponents';
import {
  estimatePitch,
  MAX_WAV_PITCH,
  MIN_WAV_PITCH,
  type WavAnalysisOptions,
  type WavEnvelope,
} from './wavNote';

const TAU = 2 * Math.PI;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export interface WavFit {
  sound: FourierSound;
  frequency: number;
  gate: number;
  periodicity: number | null;
  explainedEnergy: number;
  harmonicEnergy: number;
  dc: number;
  scale: number;
  spectrum: number[];
  warnings: string[];
}

export function fittedEnvelope(sound: FourierSound, gate: number, time: number) {
  if (time < 0 || time > gate + sound.release) return 0;
  const attack = Math.min(1, Math.min(time, gate) / sound.attack);
  const release = time <= gate ? 1 : 1 - (time - gate) / sound.release;
  return attack * release * (sound.percussion ? Math.exp(-time / sound.percussion.decay) : 1);
}

export function fitWavNote(
  samples: Float32Array,
  rate: number,
  timing: WavEnvelope,
  options: WavAnalysisOptions,
): WavFit {
  const automatic = estimatePitch(samples, rate, timing.body);
  const frequency = options.frequency ?? automatic?.frequency;
  if (
    frequency === undefined ||
    !Number.isFinite(frequency) ||
    frequency < MIN_WAV_PITCH ||
    frequency > MAX_WAV_PITCH
  )
    throw new Error(
      'No reliable pitch found. Try a steadier body or enter 30–2000 Hz. Noise-only hits need a different model.',
    );
  const period = rate / frequency;
  const cycles = Math.floor((timing.body.end - timing.body.start) * frequency);
  if (cycles < 3) throw new Error('The body needs at least three cycles at the reference pitch.');
  const length = Math.floor(cycles * period);
  const first = Math.round(((timing.body.start + timing.body.end) * rate) / 2 - length / 2);
  const count = Math.min(HARMONIC_COUNT, Math.ceil(rate / (2 * frequency)) - 1);
  const weights = Float64Array.from({ length }, (_, i) => 0.5 - 0.5 * Math.cos((TAU * i) / length));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  let dc = 0,
    energy = 0;
  for (let i = 0; i < length; i++) {
    dc += samples[first + i] * weights[i];
    energy += samples[first + i] ** 2 * weights[i];
  }
  dc /= weightSum;
  energy /= weightSum;
  if (energy - dc * dc < 1e-8)
    throw new Error('The body window contains too little audible signal.');
  const spectrum = Array<number>(HARMONIC_COUNT).fill(0);
  const partials = Array.from({ length: count }, (_, h) => {
    const speed = (TAU * (h + 1)) / period;
    let cosine = 0,
      sine = 0;
    for (let i = 0; i < length; i++) {
      const sample = (samples[first + i] - dc) * weights[i];
      cosine += sample * Math.cos(speed * i);
      sine += sample * Math.sin(speed * i);
    }
    cosine *= 2 / weightSum;
    sine *= 2 / weightSum;
    spectrum[h] = Math.hypot(cosine, sine);
    return { cosine, sine, h: h + 1 };
  });
  const harmonicPower = spectrum.reduce((sum, magnitude) => sum + magnitude ** 2 / 2, 0);
  const harmonicEnergy = clamp(harmonicPower / energy, 0, 1);
  if (harmonicEnergy < 0.2)
    throw new Error(
      'Too little energy follows this harmonic series. Try another pitch or a cleaner body.',
    );

  // A single time origin rotates partial h by h*theta. Project each complex
  // coefficient onto that sine axis; the leftover quadrature is unrepresentable.
  const project = ({ cosine, sine, h }: (typeof partials)[number], theta: number) =>
    sine * Math.cos(h * theta) + cosine * Math.sin(h * theta);
  let origin = 0,
    best = -1;
  const score = (theta: number) => {
    const power = partials.reduce((sum, partial) => sum + project(partial, theta) ** 2, 0);
    if (power > best + 1e-14) {
      best = power;
      origin = theta;
    }
  };
  const step = TAU / 512;
  for (let i = 0; i < 512; i++) score(i * step);
  for (const resolution of [step / 8, step / 64]) {
    const center = origin;
    for (let i = -8; i <= 8; i++) score(center + i * resolution);
  }
  const threshold = Math.max(...spectrum) * 0.003;
  const coefficients = partials.map((partial) => {
    const value = project(partial, origin);
    return Math.abs(value) < threshold ? 0 : value;
  });
  // Measure the signed reconstruction on the same source window, including
  // original DC in the error. This is a body fit, not whole-note fidelity.
  const prediction = new Float64Array(length);
  coefficients.forEach((value, h) => {
    if (!value) return;
    const speed = (TAU * (h + 1)) / period;
    for (let i = 0; i < length; i++)
      prediction[i] += value * Math.sin(speed * i + (h + 1) * origin);
  });
  const residual =
    prediction.reduce((sum, value, i) => sum + weights[i] * (samples[first + i] - value) ** 2, 0) /
    weightSum;
  const explainedEnergy = clamp(1 - residual / energy, 0, 1);
  const sound = fourierShape('sine');
  const gate = Math.max(0.005, (timing.noteOff ?? timing.end) - timing.onset);
  sound.attack = clamp(timing.attackEnd - timing.onset, 0.005, 2);
  sound.release = timing.noteOff === null ? 0.06 : clamp(timing.end - timing.noteOff, 0.01, 3);
  if (timing.decay !== null) sound.percussion = { decay: timing.decay, noise: 0, highpass: 20 };
  // Undo the modeled envelope's mean gain in the fit window before encoding
  // absolute amplitudes. Bound the dry peak for any transposition/phase.
  let meanGain = 0;
  for (let i = 0; i < length; i++)
    meanGain += weights[i] * fittedEnvelope(sound, gate, (first + i) / rate - timing.onset);
  meanGain = Math.max(0.05, meanGain / weightSum);
  const absoluteSum = coefficients.reduce((sum, value) => sum + Math.abs(value), 0) / meanGain;
  const scale = Math.min(1, 0.9 / absoluteSum);
  const loudest = (Math.max(...coefficients.map(Math.abs)) * scale) / meanGain;
  sound.trim = clamp(20 * Math.log10(loudest), -36, 0);
  sound.harmonics = sound.harmonics.map((_, i) =>
    clamp((Math.abs(coefficients[i] ?? 0) * scale) / (meanGain * dbToGain(sound.trim)), 0, 1),
  );
  sound.polarity = sound.polarity.map((_, i) => ((coefficients[i] ?? 0) < 0 ? -1 : 1));
  const warnings: string[] = [];
  if (spectrum[0] < Math.max(...spectrum) * 0.12)
    warnings.push('The fundamental is weak or missing. Check the reference octave.');
  if (
    !automatic ||
    Math.abs(Math.log2(frequency / automatic.frequency)) > 0.03 ||
    automatic.periodicity < 0.85
  )
    warnings.push(
      'The body does not repeat cleanly at this pitch. Check for vibrato, noise or other notes.',
    );
  if (explainedEnergy < 0.8)
    warnings.push(
      'Some source energy is lost to phase, DC, inharmonic content or harmonics outside H1–H32.',
    );
  if (scale < 0.999) warnings.push('Output level was reduced to keep dry peak headroom.');
  if (timing.noteOff === null)
    warnings.push('Key release is unknown. The preview uses the audible end and a 60 ms release.');
  return {
    sound,
    frequency,
    gate,
    periodicity: automatic?.periodicity ?? null,
    explainedEnergy,
    harmonicEnergy,
    dc,
    scale,
    spectrum,
    warnings,
  };
}
