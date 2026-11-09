import { decodeWav, wavSample, WAV_IMPORT_LIMITS } from './wavImport';
import { measureNote, readCrop, type WavAnalysisOptions, type WavEnvelope } from './wavNote';
import { fitWavNote, type WavFit } from './wavFit';
import { fitWavSpectrum, type WavSpectralFit } from './wavSpectral';

export interface WavReviewRequest {
  file: File;
  options: WavAnalysisOptions;
}

export type WavPeaks = [low: number, high: number][];

export interface WavReview {
  sampleRate: number;
  stereo: boolean;
  duration: number;
  offset: number;
  overview: WavPeaks;
  waveform: WavPeaks;
  samples: Float32Array;
  timing?: WavEnvelope;
  fit?: WavFit;
  evolving?: WavSpectralFit;
  error?: string;
  warnings: string[];
}

export type WavWorkerMessage =
  | { stage: 'progress'; text: string }
  | { stage: 'done'; review: WavReview }
  | { stage: 'error'; text: string };

function peaks(length: number, sampleAt: (i: number) => number): WavPeaks {
  const bins = Math.min(480, length);
  return Array.from({ length: bins }, (_, i) => {
    let low = 0,
      high = 0;
    const end = Math.floor(((i + 1) * length) / bins);
    for (let frame = Math.floor((i * length) / bins); frame < end; frame++) {
      const sample = sampleAt(frame);
      low = Math.min(low, sample);
      high = Math.max(high, sample);
    }
    return [low, high];
  });
}

export async function reviewWav(
  { file, options }: WavReviewRequest,
  progress: (text: string) => void,
): Promise<WavReview> {
  if (file.size > WAV_IMPORT_LIMITS.bytes) throw new Error('Choose a WAV file up to 32 MiB.');
  progress('Reading WAV…');
  const wav = decodeWav(await file.arrayBuffer());
  progress('Measuring timing and fitting the selected model…');
  const { samples, offset, clipped, cancellation } = readCrop(wav, options);
  const frames = wav.channels[0].length;
  const warnings: string[] = [];
  if (cancellation)
    warnings.push('The mono mix loses energy through stereo cancellation. Try Left or Right.');
  if (clipped)
    warnings.push(`${clipped} crop samples reach full scale. The recording may be clipped.`);
  const result: WavReview = {
    sampleRate: wav.sampleRate,
    stereo: wav.channels.length === 2,
    duration: frames / wav.sampleRate,
    offset,
    overview: peaks(frames, (frame) => wavSample(wav, options.channel, frame)),
    waveform: peaks(samples.length, (frame) => samples[frame]),
    samples,
    warnings,
  };
  try {
    result.timing = measureNote(samples, wav.sampleRate, options);
    if (options.model === 'evolving')
      result.evolving = fitWavSpectrum(samples, wav.sampleRate, result.timing, options);
    else result.fit = fitWavNote(samples, wav.sampleRate, result.timing, options);
  } catch (error) {
    result.error = (error as Error).message;
  }
  return result;
}
