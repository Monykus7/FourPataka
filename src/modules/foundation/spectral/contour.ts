import type { SpectralFrame, SpectralSettings } from './settings';

const blend = (a: number, b: number, mix: number) => a + (b - a) * mix;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function spectralFrameAt(frames: SpectralFrame[], time: number) {
  const index = frames.findIndex((frame) => frame.time > time);
  if (index < 0) return frames.at(-1)!;
  if (index === 0) return frames[0];
  const next = frames[index];
  const previous = frames[index - 1];
  const mix = (time - previous.time) / (next.time - previous.time);
  return {
    time,
    tones: previous.tones.map((value, i) => blend(value, next.tones[i], mix)),
    noise: previous.noise.map((value, i) => blend(value, next.noise[i], mix)),
  };
}

export function spectralContour(settings: SpectralSettings, gate: number, release: number) {
  const keyAge = gate * settings.timeScale;
  const held = settings.held
    .filter((frame) => frame.time < keyAge)
    .map((frame) => ({ ...frame, time: frame.time / settings.timeScale }));
  const anchor = spectralFrameAt(settings.held, keyAge);
  if (release === 0)
    return [...held, { time: gate, tones: anchor.tones.map(() => 0), noise: [0, 0, 0] }];
  const baseline = settings.released[0];
  // Correct the release start to the actual note's key-off level. Fade that
  // correction away with release age so a shortened gate never jumps.
  return [
    ...held,
    { ...anchor, time: gate },
    ...settings.released.slice(1).map((frame) => ({
      time: gate + frame.time * release,
      tones: frame.tones.map((value, i) =>
        clamp(value + (anchor.tones[i] - baseline.tones[i]) * (1 - frame.time), -1, 1),
      ),
      noise: frame.noise.map((value, i) =>
        clamp(value + (anchor.noise[i] - baseline.noise[i]) * (1 - frame.time), 0, 1),
      ),
    })),
  ];
}

export type SpectralPoint = { at: number; value: number };

export function spectralValueAt(points: SpectralPoint[], time: number) {
  const index = points.findIndex((point) => point.at > time);
  if (index < 0) return points.at(-1)?.value ?? 0;
  if (index === 0) return points[0].value;
  const next = points[index];
  const previous = points[index - 1];
  return blend(previous.value, next.value, (time - previous.at) / (next.at - previous.at));
}
