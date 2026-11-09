import type { EngineNote, EngineVoice } from '../engines';
import { dbToGain } from '../fourierComponents';
import { spectralContour, spectralValueAt, type SpectralPoint } from './contour';
import { spectralNoiseBuffer } from './noise';
import type { SpectralFrame, SpectralSettings } from './settings';

type Lane = { gain: GainNode; points: SpectralPoint[] };
type Tone = { oscillators: OscillatorNode[]; lanes: Lane[] };
const TRANSITION = 0.015;
const TAU = 2 * Math.PI;

export function createSpectralVoice(
  note: EngineNote<SpectralSettings>,
): EngineVoice<SpectralSettings> {
  const { context, startSeconds: start, durationSeconds: gate, frequencyHz } = note;
  const output = context.createGain();
  const trim = context.createGain();
  const tones: Tone[] = [];
  const sources: AudioScheduledSourceNode[] = [];
  const oscillators: OscillatorNode[] = [];
  const lanes: Lane[] = [];
  let noise: { lanes: Lane[]; splitter: ChannelSplitterNode } | undefined;
  let end = start + gate;
  let disposed = false;
  let stolen = false;
  let previous = note.settings;
  trim.gain.value = dbToGain(previous.trim);
  trim.connect(output).connect(note.destination);
  const lane = () => {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(trim);
    const result: Lane = { gain, points: [] };
    lanes.push(result);
    return result;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const source of sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
    }
    noise?.splitter.disconnect();
    for (const item of lanes) item.gain.disconnect();
    trim.disconnect();
    output.disconnect();
    oscillators.length = 0;
  };
  const register = (source: AudioScheduledSourceNode) => {
    source.onended = () => {
      if (context.currentTime >= end) dispose();
    };
    sources.push(source);
  };
  const createTone = (hz: number, at: number) => {
    const tone: Tone = { oscillators: [], lanes: [] };
    for (const offset of [Math.PI / 2, 0]) {
      const oscillator = context.createOscillator();
      const channel = lane();
      // Join the running note's age when this lane is allocated after onset.
      // A pair of fixed quadrature carriers can follow any complex envelope.
      const phase = (TAU * hz * (at - start) + offset) % TAU;
      oscillator.setPeriodicWave(
        context.createPeriodicWave(
          new Float32Array([0, Math.sin(phase)]),
          new Float32Array([0, Math.cos(phase)]),
          { disableNormalization: true },
        ),
      );
      oscillator.frequency.value = hz;
      oscillator.connect(channel.gain);
      register(oscillator);
      oscillator.start(at);
      tone.oscillators.push(oscillator);
      tone.lanes.push(channel);
      oscillators.push(oscillator);
    }
    return tone;
  };
  const createNoise = (at: number) => {
    const buffer = spectralNoiseBuffer(context);
    const source = context.createBufferSource();
    const splitter = context.createChannelSplitter(3);
    source.buffer = buffer;
    source.loop = true;
    source.connect(splitter);
    const channels = Array.from({ length: 3 }, (_, i) => {
      const channel = lane();
      splitter.connect(channel.gain, i);
      return channel;
    });
    register(source);
    source.start(at, (at - start) % buffer.duration);
    return { lanes: channels, splitter };
  };
  const schedule = (
    channel: Lane,
    contour: SpectralFrame[],
    value: (frame: SpectralFrame) => number,
    at: number,
    morph: boolean,
  ) => {
    const next = contour.map((frame) => ({ at: start + frame.time, value: value(frame) }));
    const parameter = channel.gain.gain;
    const anchor = morph ? spectralValueAt(channel.points, at) : spectralValueAt(next, at);
    parameter.cancelAndHoldAtTime(at);
    parameter.setValueAtTime(anchor, at);
    const transition = morph ? Math.min(at + TRANSITION, end) : at;
    const points: SpectralPoint[] = [{ at, value: anchor }];
    if (transition > at) points.push({ at: transition, value: spectralValueAt(next, transition) });
    points.push(...next.filter((point) => point.at > transition));
    for (const point of points.slice(1)) parameter.linearRampToValueAtTime(point.value, point.at);
    channel.points = points;
  };
  const apply = (settings: SpectralSettings, at: number, initial: boolean) => {
    const morph = !initial && context.currentTime > start;
    const release = Math.min(settings.release, note.releaseLimitSeconds ?? settings.release);
    end = Math.max(start + gate + release, morph ? at + TRANSITION : at);
    const contour = spectralContour(settings, gate, release);
    for (let i = 0; i < Math.max(tones.length, settings.ratios.length); i++) {
      const ratio = settings.ratios[i];
      const hz = ratio * frequencyHz;
      const available = hz < context.sampleRate / 2;
      if (!tones[i]) tones[i] = createTone(available ? hz : context.sampleRate * 0.49, at);
      if (available && ratio !== previous.ratios[i]) {
        // Existing carriers retune together and keep accumulated phase.
        for (const oscillator of tones[i].oscillators) {
          oscillator.frequency.cancelAndHoldAtTime(at);
          if (morph) oscillator.frequency.setTargetAtTime(hz, at, 0.005);
          else oscillator.frequency.setValueAtTime(hz, at);
        }
      }
      tones[i].lanes.forEach((channel, q) =>
        schedule(
          channel,
          contour,
          (frame) => (available ? (frame.tones[2 * i + q] ?? 0) * settings.tone : 0),
          at,
          morph,
        ),
      );
    }
    if (!noise && contour.some((frame) => frame.noise.some(Boolean))) noise = createNoise(at);
    noise?.lanes.forEach((channel, i) =>
      schedule(channel, contour, (frame) => frame.noise[i] * settings.noise, at, morph),
    );
    if (!initial) {
      trim.gain.cancelAndHoldAtTime(at);
      trim.gain.setTargetAtTime(dbToGain(settings.trim), at, 0.005);
    }
    sources.forEach((source) => source.stop(end + 0.005));
    previous = settings;
  };
  try {
    apply(note.settings, Math.max(start, context.currentTime), true);
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    envelope: output,
    oscillators,
    get end() {
      return end;
    },
    update(settings) {
      const at = Math.max(start, context.currentTime);
      if (disposed || stolen || at >= end || JSON.stringify(settings) === JSON.stringify(previous))
        return;
      apply(settings, at, false);
    },
    steal(at) {
      if (disposed || stolen || at >= end) return;
      stolen = true;
      end = Math.min(end, at + 0.01);
      output.gain.setValueAtTime(1, at);
      output.gain.linearRampToValueAtTime(0, end);
      sources.forEach((source) => source.stop(end + 0.005));
    },
    dispose,
  };
}
