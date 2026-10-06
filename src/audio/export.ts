import { playbackTiming } from '../core/articulation';
import { parseScore } from '../core/parser';
import { reconcileTracks, type Project } from '../core/project';
import { boardRoute } from '../core/board';
import { delayTail, emptyChain, type Chain } from '../core/pedals';
import { exportSize, inspectSamples, type WavOptions } from '../core/wav';
import { chainLatency, measureCompressorLatency, measureOversamplingLatency } from './effects';
import { createScoreGraph } from './scoreGraph';
import { createVoice, type Voice } from './voice';
import { admitVoice } from './voiceLimit';

const routedTail = (chain: Chain) =>
  chain.bypassed
    ? 0
    : boardRoute(chain).pedals.reduce(
        (sum, pedal) =>
          sum +
          (pedal.kind === 'delay' && !pedal.bypassed && pedal.params.mix > 0
            ? delayTail(pedal.params.time, pedal.params.feedback)
            : 0),
        0,
      );

export function prepareExport(
  project: Project,
  options: WavOptions,
  driveLatency = 0,
  compressorLatency = 0.006,
) {
  const score = parseScore(
    project.scoreText,
    project.instruments.map((p) => p.key),
    project.processing.library.map((p) => p.key),
  );
  if (score.diagnostics.length) throw new Error('Fix the score diagnostics before exporting WAV.');
  if (!score.events.some((event) => event.frequencies.length))
    throw new Error('Add at least one note before exporting WAV.');
  const snapshot = reconcileTracks(structuredClone(project), score);
  const master = snapshot.processing.master;
  const trackChains = snapshot.tracks.map((t) => snapshot.processing.tracks[t.key] ?? emptyChain());
  const latency =
    chainLatency(master, driveLatency, compressorLatency) +
    Math.max(0, ...trackChains.map((c) => chainLatency(c, driveLatency, compressorLatency)));
  const release = Math.max(0, ...snapshot.tracks.map((t) => t.sound.release));
  const estimatedTail = routedTail(master) + Math.max(0, ...trackChains.map(routedTail));
  const voices = score.events.reduce((count, event) => count + event.frequencies.length, 0);
  // Preserve score rests, releases and processing latency. A small settling
  // allowance covers non-delay filter state even when the echo budget is zero.
  const soundingSeconds = score.events.reduce(
    (end, event) =>
      event.frequencies.length
        ? Math.max(
            end,
            (event.beat * 60) / score.tempo + playbackTiming(event, score.tempo).duration,
          )
        : end,
    score.seconds,
  );
  const size = exportSize(
    soundingSeconds + release + latency + 0.1 + options.tailSeconds,
    voices,
    options,
  );
  return {
    snapshot,
    score,
    latency,
    release,
    estimatedTail,
    capped: estimatedTail > options.tailSeconds,
    ...size,
  };
}

export async function renderWav(project: Project, options: WavOptions) {
  // Preflight precedes every large allocation, including the calibration pass.
  const frozen = structuredClone(project);
  const format = { ...options };
  prepareExport(frozen, format);
  const [driveLatency, compressorLatency] = await Promise.all([
    measureOversamplingLatency(format.sampleRate),
    measureCompressorLatency(format.sampleRate),
  ]);
  const plan = prepareExport(frozen, format, driveLatency, compressorLatency);
  const context = new OfflineAudioContext(format.channels, plan.frames, format.sampleRate);
  const mix = context.createGain();
  mix.gain.value = plan.snapshot.mixGain;
  mix.connect(context.destination);
  const graph = createScoreGraph(
    context,
    mix,
    plan.snapshot.tracks,
    plan.snapshot.processing,
    driveLatency,
    compressorLatency,
  );
  const all: Voice[] = [];
  let active: Voice[] = [];
  try {
    for (const event of [...plan.score.events].sort((a, b) => a.beat - b.beat)) {
      const track = plan.snapshot.tracks.find((t) => t.key === event.track)!;
      const start = (event.beat * 60) / plan.score.tempo;
      for (const frequency of event.frequencies) {
        active = admitVoice(active, start);
        const voice = createVoice(
          context,
          graph.buses.get(track.key)!,
          track.sound,
          frequency,
          start,
          playbackTiming(event, plan.score.tempo).duration,
          undefined,
          playbackTiming(event, plan.score.tempo).releaseLimit,
        );
        active.push(voice);
        all.push(voice);
      }
    }
    const buffer = await context.startRendering();
    const channels = Array.from({ length: format.channels }, (_, i) => buffer.getChannelData(i));
    const endFrames = Math.min(buffer.length, Math.ceil(0.02 * format.sampleRate));
    let endPeak = 0;
    for (const channel of channels)
      for (let i = buffer.length - endFrames; i < buffer.length; i++) {
        endPeak = Math.max(endPeak, Math.abs(channel[i]));
        if (plan.capped) channel[i] *= (buffer.length - 1 - i) / Math.max(1, endFrames - 1);
      }
    return {
      buffer,
      ...inspectSamples(channels),
      capped: plan.capped,
      endPeak,
      plan,
      options: format,
    };
  } finally {
    all.forEach((voice) => voice.dispose());
    graph.dispose();
    mix.disconnect();
  }
}
export type WavRender = Awaited<ReturnType<typeof renderWav>>;
