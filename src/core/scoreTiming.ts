import { beatExpression } from './beatExpression';
import { DEFAULT_METER, parseMeter, measureLength, type TimeSignature } from './meter';
import { addBeats, beatValue, fraction, type BeatFraction } from './rhythm';
import type { ScoreToken } from './scoreLexer';

export function scoreTiming(tokens: ScoreToken[]) {
  let meter = { ...DEFAULT_METER },
    depth = 0;
  const requested: { position: BeatFraction; meter: TimeSignature }[] = [];
  for (const token of tokens) {
    if (token.kind === 'file-boundary') {
      depth = 0;
      continue;
    }
    if (['repeat-open', 'section-open', 'ending-open'].includes(token.kind)) {
      depth++;
      continue;
    }
    if (token.kind === 'brace-close') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (token.kind !== 'text') continue;
    if (/^track\b.*\{$/.test(token.text)) {
      depth++;
      continue;
    }
    if (depth) continue;
    try {
      const initial = /^time\s+(\S+)$/.exec(token.text);
      const change = /^time\s+(\S+)\s+at\s+(.+)$/.exec(token.text);
      if (initial) meter = parseMeter(initial[1]);
      if (change) {
        const position = beatExpression(change[2]);
        const beat = beatValue(position);
        if (Number.isFinite(beat) && beat > 0 && beat <= 1000000)
          requested.push({ position, meter: parseMeter(change[1]) });
      }
    } catch {
      /* The authoritative parser reports these source diagnostics. */
    }
  }
  let start = 0,
    previous = meter;
  const changes = requested
    .sort((a, b) => beatValue(a.position) - beatValue(b.position))
    .filter((change) => {
      const beat = beatValue(change.position);
      const bars = (beat - start) / measureLength(previous);
      if (beat <= start || Math.abs(bars - Math.round(bars)) > 1e-8) return false;
      start = beat;
      previous = change.meter;
      return true;
    })
    .slice(0, 64);
  return { meter, changes };
}

export function restToBar(
  position: BeatFraction,
  timing: ReturnType<typeof scoreTiming>,
): BeatFraction {
  let start = fraction(0n, 1n),
    meter = timing.meter;
  for (const change of timing.changes) {
    if (
      change.position.numerator * position.denominator >
      position.numerator * change.position.denominator
    )
      break;
    start = change.position;
    meter = change.meter;
  }
  const elapsed = addBeats(position, fraction(-start.numerator, start.denominator));
  const length = fraction(BigInt(meter.numerator * 4), BigInt(meter.denominator));
  const bars = (elapsed.numerator * length.denominator) / (elapsed.denominator * length.numerator);
  // Even at a boundary rest bar advances one whole bar; tuplets must not rescale this target.
  const end = addBeats(start, fraction((bars + 1n) * length.numerator, length.denominator));
  return addBeats(end, fraction(-position.numerator, position.denominator));
}
