import {
  measureLength,
  meterPulse,
  meterSegments,
  type MeterChange,
  type TimeSignature,
} from './meter';

// Thin across the entire meter map, never allocate every bar of a long score.
export function timelineGrid(
  beats: number,
  meter: TimeSignature,
  changes: readonly MeterChange[] = [],
) {
  const extent = Math.max(beats, measureLength(meter));
  const segments = meterSegments(meter, changes).filter((segment) => segment.beat < extent);
  const counts = segments.map((segment, i) =>
    Math.ceil(((segments[i + 1]?.beat ?? extent) - segment.beat) / measureLength(segment.meter)),
  );
  const stride = Math.max(1, Math.ceil(counts.reduce((sum, count) => sum + count, 0) / 64));
  const bars: { bar: number; beat: number; meter?: TimeSignature }[] = [];
  segments.forEach((segment, i) => {
    const length = measureLength(segment.meter);
    bars.push({ bar: segment.bar, beat: segment.beat, ...(i ? { meter: segment.meter } : {}) });
    const first = Math.ceil(segment.bar / stride) * stride + 1;
    for (let bar = first; bar < segment.bar + counts[i]; bar += stride)
      bars.push({ bar, beat: segment.beat + (bar - segment.bar) * length });
  });
  const pulseCounts = segments.map((segment, i) =>
    Math.ceil(((segments[i + 1]?.beat ?? extent) - segment.beat) / meterPulse(segment.meter)),
  );
  const pulses =
    pulseCounts.reduce((sum, count) => sum + count, 0) > 256
      ? []
      : segments.flatMap((segment, i) =>
          Array.from(
            { length: pulseCounts[i] },
            (_, j) => segment.beat + j * meterPulse(segment.meter),
          ),
        );
  return { extent, bars, pulses };
}
