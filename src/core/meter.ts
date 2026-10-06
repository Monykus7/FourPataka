export interface TimeSignature {
  numerator: number;
  denominator: number;
}
export interface MeterChange {
  beat: number;
  meter: TimeSignature;
  from: number;
  to: number;
  line: number;
}
export function meterSegments(initial: TimeSignature, changes: readonly MeterChange[] = []) {
  let previous = { beat: 0, meter: initial, bar: 1 };
  const segments = [previous];
  for (const change of changes) {
    const bars = (change.beat - previous.beat) / measureLength(previous.meter);
    previous = { beat: change.beat, meter: change.meter, bar: previous.bar + Math.round(bars) };
    segments.push(previous);
  }
  return segments;
}
export function measurePositionAt(
  beat: number,
  initial: TimeSignature,
  changes: readonly MeterChange[] = [],
) {
  const segment = meterSegments(initial, changes)
    .filter((segment) => segment.beat <= beat)
    .at(-1) ?? { beat: 0, meter: initial, bar: 1 };
  const position = measurePosition(Math.max(0, beat - segment.beat), segment.meter);
  return { bar: segment.bar + position.bar - 1, beat: position.beat, meter: segment.meter };
}
export const DEFAULT_METER: TimeSignature = { numerator: 4, denominator: 4 };
export const COMMON_METERS = [
  '2/2',
  '3/2',
  '2/4',
  '3/4',
  '4/4',
  '5/4',
  '5/8',
  '6/8',
  '7/8',
  '9/8',
  '11/8',
  '12/8',
  '13/8',
  '3/16',
];
export function parseMeter(value: string): TimeSignature {
  const match = /^(\d+)\/(\d+)$/.exec(value);
  const numerator = Number(match?.[1]);
  const denominator = Number(match?.[2]);
  if (!match || numerator < 1 || numerator > 32 || ![1, 2, 4, 8, 16].includes(denominator))
    throw new Error(
      'Time signature needs 1–32 beats over 1, 2, 4, 8, or 16 (for example 3/4 or 6/8).',
    );
  return { numerator, denominator };
}
export const meterLabel = (meter: TimeSignature) => `${meter.numerator}/${meter.denominator}`;
export const meterPulse = (meter: TimeSignature) => 4 / meter.denominator;
export const measureLength = (meter: TimeSignature) => meter.numerator * meterPulse(meter);
export function measurePosition(quarterBeats: number, meter: TimeSignature) {
  const length = measureLength(meter);
  return {
    bar: Math.floor(quarterBeats / length) + 1,
    beat: (quarterBeats % length) / meterPulse(meter) + 1,
  };
}
