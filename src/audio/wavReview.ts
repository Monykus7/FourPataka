import { createFourierVoice } from '../modules/foundation/fourierVoice';
import type { FourierSound } from '../modules/foundation/fourier';
import type { WavReview } from '../core/wavReview';

export async function renderWavReconstruction(review: WavReview, sound: FourierSound) {
  const { fit, timing, sampleRate, samples } = review;
  if (!fit || !timing) throw new Error('Analyze a pitched note before previewing it.');
  const frames = Math.ceil(
    Math.max(samples.length, (timing.onset + fit.gate + sound.release) * sampleRate),
  );
  const context = new OfflineAudioContext(1, frames, sampleRate);
  const voice = createFourierVoice(
    context,
    context.destination,
    sound,
    fit.frequency,
    timing.onset,
    fit.gate,
  );
  try {
    return (await context.startRendering()).getChannelData(0);
  } finally {
    voice.dispose();
  }
}

function levels(samples: Float32Array) {
  let sum = 0,
    peak = 0;
  for (const sample of samples) {
    sum += sample ** 2;
    peak = Math.max(peak, Math.abs(sample));
  }
  return { rms: Math.sqrt(sum / samples.length), peak };
}

export function matchedGains(original: Float32Array, reconstruction?: Float32Array) {
  const source = levels(original);
  if (!reconstruction) return { original: Math.min(1, 0.9 / source.peak), reconstruction: 1 };
  const rebuilt = levels(reconstruction);
  // Match RMS over the same timeline, including its silence and release. Use
  // attenuation only so a quiet or silent result never produces a loud boost.
  const durationRatio = Math.sqrt(original.length / reconstruction.length);
  const sourceRms = source.rms * durationRatio;
  if (sourceRms < 1e-7 || rebuilt.rms < 1e-7)
    return {
      original: Math.min(1, 0.9 / source.peak),
      reconstruction: Math.min(1, 0.9 / rebuilt.peak),
    };
  const rms = Math.min(
    sourceRms,
    rebuilt.rms,
    (0.9 * sourceRms) / source.peak,
    (0.9 * rebuilt.rms) / rebuilt.peak,
  );
  return { original: rms / sourceRms, reconstruction: rms / rebuilt.rms };
}
