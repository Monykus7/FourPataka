import { measureLength, meterPulse, type TimeSignature } from './meter';

// Bound visual density independently of score length; playback retains every event.
export function timelineGrid(beats: number, meter: TimeSignature) {
  const barLength = measureLength(meter);
  const extent = Math.max(beats, barLength);
  const barCount = Math.ceil(extent / barLength);
  const barStride = Math.max(1, Math.ceil(barCount / 64));
  const bars = Array.from({ length: Math.ceil(barCount / barStride) }, (_, i) => ({
    bar: i * barStride + 1,
    beat: i * barStride * barLength,
  }));
  const pulse = meterPulse(meter);
  const pulses =
    extent / pulse > 256
      ? []
      : Array.from({ length: Math.ceil(extent / pulse) }, (_, i) => i * pulse);
  return { extent, bars, pulses };
}
