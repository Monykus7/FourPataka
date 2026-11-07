import { WAV_IMPORT_LIMITS, wavSample, type ImportedWav, type WavChannel } from './wavImport';

export type WavRegion = { start: number; end: number };
export interface WavAnalysisOptions {
  channel: WavChannel;
  crop?: WavRegion;
  body?: WavRegion;
  onset?: number;
  noteOff?: number;
  frequency?: number;
}

export type WavEnvelope = {
  step: number;
  rms: number[];
  onset: number;
  attackEnd: number;
  end: number;
  noteOff: number | null;
  body: WavRegion;
  decay: number | null;
};

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
export const MIN_WAV_PITCH = 30;
export const MAX_WAV_PITCH = 2000;

export function readCrop(wav: ImportedWav, options: WavAnalysisOptions) {
  const rate = wav.sampleRate;
  const duration = wav.channels[0].length / rate;
  const crop = options.crop ?? { start: 0, end: Math.min(duration, WAV_IMPORT_LIMITS.cropSeconds) };
  const first = Math.round(crop.start * rate);
  const last = Math.round(crop.end * rate);
  if (
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first < 0 ||
    last > wav.channels[0].length ||
    last <= first ||
    last - first > WAV_IMPORT_LIMITS.cropSeconds * rate
  )
    throw new Error('Choose a crop within the recording, up to 8 seconds long.');
  const samples = new Float32Array(last - first);
  let energy = 0;
  let channelEnergy = 0;
  let clipped = 0;
  for (let i = first; i < last; i++) {
    const sample = wavSample(wav, options.channel, i);
    samples[i - first] = sample;
    energy += sample * sample;
    if (Math.abs(sample) >= 0.9999) clipped++;
    if (wav.channels.length === 2 && options.channel === 'mix')
      channelEnergy += (wav.channels[0][i] ** 2 + wav.channels[1][i] ** 2) / 2;
  }
  return {
    samples,
    offset: first / rate,
    clipped,
    cancellation: channelEnergy > 0 && energy / channelEnergy < 0.25,
  };
}

function exponentialDecay(rms: number[], first: number, last: number, step: number) {
  if (last - first < 12 || rms[last - 1] > rms[first] * 0.5) return null;
  let x = 0,
    y = 0,
    xx = 0,
    yy = 0,
    xy = 0;
  const count = last - first;
  for (let i = first; i < last; i++) {
    const t = (i - first) * step;
    const level = Math.log(Math.max(1e-7, rms[i]));
    x += t;
    y += level;
    xx += t * t;
    yy += level * level;
    xy += t * level;
  }
  const covariance = xy - (x * y) / count;
  const timeVariance = xx - (x * x) / count;
  const levelVariance = yy - (y * y) / count;
  const decay = -timeVariance / covariance;
  return covariance < 0 &&
    covariance ** 2 > 0.88 * timeVariance * levelVariance &&
    decay >= 0.01 &&
    decay <= 2
    ? decay
    : null;
}

export function measureNote(
  samples: Float32Array,
  rate: number,
  options: WavAnalysisOptions,
): WavEnvelope {
  const block = Math.round(rate * 0.005);
  const step = block / rate;
  const length = samples.length / rate;
  const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  const levels: number[] = [];
  for (let at = 0; at < samples.length; at += block) {
    const end = Math.min(at + block, samples.length);
    let energy = 0;
    for (let i = at; i < end; i++) energy += (samples[i] - mean) ** 2;
    levels.push(Math.sqrt(energy / (end - at)));
  }
  const rms = levels.map(
    (value, i) => (2 * value + (levels[i - 1] ?? value) + (levels[i + 1] ?? value)) / 4,
  );
  const peak = Math.max(...rms);
  if (peak < 0.0001) throw new Error('The selected crop is silent or too quiet to fit.');
  const threshold = Math.max(0.00008, peak * 0.035);
  const first = rms.findIndex((value) => value >= threshold);
  let last = rms.length;
  while (rms[last - 1] < threshold) last--;
  const attack = rms.findIndex((value) => value >= peak * 0.9);
  const end = Math.min(length, last * step);
  const onset = options.onset ?? first * step;
  if (!Number.isFinite(onset) || onset < 0 || onset >= end)
    throw new Error('Onset must be inside the audible crop.');
  const attackEnd = Math.min(end, Math.max(onset, (attack + 0.5) * step));
  const noteOff = options.noteOff ?? null;
  if (noteOff !== null && (!Number.isFinite(noteOff) || noteOff <= onset || noteOff >= length))
    throw new Error('Note-off must be after the detected onset and inside the crop.');
  const sustainEnd = Math.min(end, noteOff ?? end);
  const start = Math.min(attackEnd, Math.max(onset, sustainEnd - 0.1));
  const body = options.body ?? { start, end: Math.min(sustainEnd, start + 0.16) };
  if (
    !Number.isFinite(body.start) ||
    !Number.isFinite(body.end) ||
    body.start < 0 ||
    body.end > length ||
    body.end - body.start < 0.035 ||
    body.end - body.start > 0.5
  )
    throw new Error('Choose a body window between 35 and 500 ms inside the crop.');
  // Fit the pre-note-off slope only. The voice's key release is a separate linear ramp.
  const decay = exponentialDecay(rms, attack + 2, Math.floor(sustainEnd / step) - 2, step);
  return { step, rms, onset, attackEnd, end, noteOff, body, decay };
}

export function estimatePitch(samples: Float32Array, rate: number, body: WavRegion) {
  const first = Math.round(body.start * rate);
  const last = Math.round(body.end * rate);
  const stride = Math.max(1, Math.floor(rate / 8000));
  const reducedRate = rate / stride;
  const reduced = new Float32Array(Math.floor((last - first) / stride));
  for (let i = 0; i < reduced.length; i++)
    for (let j = 0; j < stride; j++) reduced[i] += samples[first + i * stride + j] / stride;
  const mean = reduced.reduce((sum, sample) => sum + sample, 0) / reduced.length;
  const minLag = Math.floor(reducedRate / MAX_WAV_PITCH);
  const maxLag = Math.min(Math.ceil(reducedRate / MIN_WAV_PITCH), Math.floor(reduced.length / 3));
  if (maxLag < minLag + 2) return null;
  const difference = (read: (i: number) => number, length: number, lag: number, step: number) => {
    let error = 0,
      energy = 0;
    const index = Math.floor(lag);
    const fraction = lag - index;
    for (let i = 0; i < length; i += step) {
      const a = read(i) - mean;
      const b = read(i + index) * (1 - fraction) + read(i + index + 1) * fraction - mean;
      error += (a - b) ** 2;
      energy += a * a + b * b;
    }
    return energy > 1e-10 ? error / energy : 1;
  };
  const scores = Array.from({ length: maxLag + 2 }, (_, lag) =>
    lag < minLag - 1 ? 1 : difference((i) => reduced[i], reduced.length - maxLag - 2, lag, 1),
  );
  const valleys = scores.slice(minLag, maxLag + 1).flatMap((error, i) => {
    const lag = i + minLag;
    return error <= scores[lag - 1] && error < scores[lag + 1] ? [{ lag, error }] : [];
  });
  if (!valleys.length) return null;
  const best = Math.min(...valleys.map((item) => item.error));
  // Prefer the shortest convincing repeat. Taking the global minimum alone
  // often mistakes two or three cycles of a clean note for one lower note.
  const coarse = valleys.find((item) => item.error <= Math.min(0.32, best + 0.075));
  if (!coarse) return null;
  const left = scores[coarse.lag - 1],
    right = scores[coarse.lag + 1];
  const offset = clamp((left - right) / (2 * (left - 2 * coarse.error + right)), -0.5, 0.5);
  let lag = (coarse.lag + offset) * stride;
  let error = Infinity;
  const length = last - first - Math.ceil(lag + stride) - 2;
  // Refine on the original samples so low-rate lag quantization cannot smear H32.
  for (const resolution of [stride / 6, stride / 36, stride / 216]) {
    const center = lag;
    for (let i = -6; i <= 6; i++) {
      const next = center + i * resolution;
      if (
        next < rate / MAX_WAV_PITCH ||
        next > rate / MIN_WAV_PITCH ||
        Math.ceil(next) + length >= last - first
      )
        continue;
      const score = difference((index) => samples[first + index], length, next, stride);
      if (score < error) {
        lag = next;
        error = score;
      }
    }
  }
  return Number.isFinite(error)
    ? { frequency: rate / lag, periodicity: clamp(1 - error, 0, 1) }
    : null;
}
