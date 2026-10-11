import { addBeats, beatValue, fraction, type BeatFraction } from './rhythm';

export const subtractBeats = (a: BeatFraction, b: BeatFraction) =>
  addBeats(a, fraction(-b.numerator, b.denominator));
// Cross multiplication keeps cuts on exact tuplet boundaries; float epsilon
// comparisons could retain a zero-length note or drop a tiny positive remainder.
export const compareBeats = (a: BeatFraction, b: BeatFraction) => {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};
export const minBeats = (a: BeatFraction, b: BeatFraction) => (compareBeats(a, b) < 0 ? a : b);
export function sectionCut(start: BeatFraction, end: BeatFraction, trim: BeatFraction) {
  const value = beatValue(trim);
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000)
    throw new Error('Section trim must be 0–1,000,000 quarter-note beats.');
  if (compareBeats(trim, subtractBeats(end, start)) > 0)
    throw new Error('Section trim exceeds this invocation’s expanded length.');
  return subtractBeats(end, trim);
}
