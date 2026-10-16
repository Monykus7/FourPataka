import { measureLength, meterSegments, type MeterChange, type TimeSignature } from './meter';

export interface SwingSetting {
  subdivision: 'eighth' | '16th';
  /** First subdivision's share of its pair, in percent. 50 is straight. */
  amount: number;
}
export interface PerformanceEvent {
  beat: number;
  duration: number;
  gateDuration?: number;
  tuplet?: { notes: number; inTimeOf: number };
  performedBeat?: number;
  performedDuration?: number;
  performedGateDuration?: number;
}
export const performanceBeat = (event: Pick<PerformanceEvent, 'beat' | 'performedBeat'>) =>
  event.performedBeat ?? event.beat;

export function parseSwing(line: string): SwingSetting | null {
  if (/^swing\s+off$/.test(line)) return null;
  const match = /^swing\s+(eighth|16th)\s+(\d+(?:\.\d+)?|\.\d+)%?$/.exec(line);
  const amount = Number(match?.[2]);
  if (!match || !Number.isFinite(amount) || amount < 50 || amount > 75)
    throw new Error('Use swing eighth <50–75> or swing 16th <50–75> (percent), or swing off.');
  return { subdivision: match[1] as SwingSetting['subdivision'], amount };
}

/** Pure written-quarter-beat to performed-quarter-beat map, never seconds. */
export function performanceMap(
  meter: TimeSignature,
  changes: readonly MeterChange[],
  events: readonly PerformanceEvent[],
  trackEnd: number,
  setting?: SwingSetting | null,
) {
  if (!setting || setting.amount === 50) return (beat: number) => beat;
  const segments = meterSegments(meter, changes);
  const pair = setting.subdivision === 'eighth' ? 1 : 0.5;
  const share = setting.amount / 100;
  const epsilon = 1e-9;
  const protectedSpans: { start: number; end: number }[] = [];
  for (const event of [...events].filter((e) => e.tuplet).sort((a, b) => a.beat - b.beat)) {
    const previous = protectedSpans.at(-1);
    const end = event.beat + event.duration;
    if (previous && event.beat <= previous.end + epsilon)
      previous.end = Math.max(previous.end, end);
    else protectedSpans.push({ start: event.beat, end });
  }
  return (beat: number) => {
    let low = 0,
      high = segments.length;
    while (low + 1 < high) {
      const mid = (low + high) >>> 1;
      if (segments[mid].beat <= beat) low = mid;
      else high = mid;
    }
    const segment = segments[low];
    const length = measureLength(segment.meter);
    const bar = segment.beat + Math.floor((beat - segment.beat) / length + epsilon) * length;
    const start = bar + Math.floor((beat - bar) / pair + epsilon) * pair;
    const end = start + pair;
    // Incomplete pairs stay straight at bars/meter changes and the track end.
    // Protect the whole pair touching a tuplet: mixing two maps at its edges
    // could otherwise reorder a straight tuplet and an adjacent swung note.
    if (end > bar + length + epsilon || end > trackEnd + epsilon) return beat;
    low = 0;
    high = protectedSpans.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (protectedSpans[mid].end <= start + epsilon) low = mid + 1;
      else high = mid;
    }
    if (protectedSpans[low]?.start < end - epsilon) return beat;
    const offset = beat - start;
    if (offset < epsilon || Math.abs(offset - pair) < epsilon) return beat;
    return (
      start +
      (offset <= pair / 2
        ? offset * 2 * share
        : pair * share + (offset - pair / 2) * 2 * (1 - share))
    );
  };
}

export function applyPerformance(events: PerformanceEvent[], map: (beat: number) => number) {
  for (const event of events) {
    event.performedBeat = map(event.beat);
    event.performedDuration = map(event.beat + event.duration) - event.performedBeat;
    // Staccato is a fraction of the performed note, not another swing warp
    // applied to the written gate midpoint (which would lengthen quarter gates).
    if (event.gateDuration !== undefined)
      event.performedGateDuration = (event.performedDuration * event.gateDuration) / event.duration;
  }
}
