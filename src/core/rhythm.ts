import { DURATIONS } from './music';

export interface BeatFraction {
  numerator: bigint;
  denominator: bigint;
}
export interface WrittenDuration {
  beats: BeatFraction;
  duration: number;
  tuplet?: { notes: number; inTimeOf: number };
}
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
export function fraction(numerator: bigint, denominator: bigint): BeatFraction {
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
export function addBeats(a: BeatFraction, b: BeatFraction): BeatFraction {
  return fraction(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  );
}
export const beatValue = (value: BeatFraction) =>
  Number(value.numerator) / Number(value.denominator);

export function parseDuration(token: string, modifier?: string): WrittenDuration {
  const match = /^(whole|half|quarter|8th|16th|32nd|64th)(\.{0,2})$/.exec(token);
  if (!match)
    throw new Error('Use whole, half, quarter, 8th, 16th, 32nd or 64th, optionally dotted.');
  const base = DURATIONS[match[1]];
  const dots = match[2].length;
  let beats = fraction(BigInt(Math.round(base * 16)), 16n);
  if (dots)
    beats = fraction(
      beats.numerator * BigInt(2 ** (dots + 1) - 1),
      beats.denominator * BigInt(2 ** dots),
    );
  let tuplet: WrittenDuration['tuplet'];
  if (modifier) {
    const ratio =
      modifier === 'triplet' ? ['3', '2'] : /^tuplet:(\d+):(\d+)$/.exec(modifier)?.slice(1);
    const notes = Number(ratio?.[0]),
      inTimeOf = Number(ratio?.[1]);
    if (!ratio || notes < 2 || notes > 32 || inTimeOf < 1 || inTimeOf > 32)
      throw new Error(
        'Use triplet or tuplet:<notes>:<inTimeOf>, with 2–32 notes in the time of 1–32.',
      );
    tuplet = { notes, inTimeOf };
    beats = fraction(beats.numerator * BigInt(inTimeOf), beats.denominator * BigInt(notes));
  }
  return { beats, duration: beatValue(beats), ...(tuplet ? { tuplet } : {}) };
}
