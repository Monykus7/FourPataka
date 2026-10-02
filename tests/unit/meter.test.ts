import { describe, expect, it } from 'vitest';
import { COMMON_METERS, measureLength, measurePosition, parseMeter } from '../../src/core/meter';
import { parseScore } from '../../src/core/parser';
const phrase = 'track lead using sine {\nC4 whole\nrest 8th\n}';
describe('project meter', () => {
  it.each(COMMON_METERS)('compiles %s without changing quarter-note timing', (value) => {
    const score = parseScore(`tempo 60\ntime ${value}\n${phrase}`, ['sine']);
    expect(score.diagnostics).toEqual([]);
    expect(score.meter).toEqual(parseMeter(value));
    expect(score.beats).toBe(4.5);
    expect(score.seconds).toBe(4.5);
    expect(score.events[1].beat).toBe(4);
  });
  it.each(['0/4', '33/4', '3/3', '3/32', '3.5/4', '3', '-3/4'])('diagnoses %s', (value) => {
    expect(parseScore(`time ${value}\n${phrase}`, ['sine']).diagnostics[0].message).toContain(
      'Time signature',
    );
  });
  it('defaults old scores to 4/4 and rejects duplicates', () => {
    expect(parseScore(phrase, ['sine']).meter).toEqual({ numerator: 4, denominator: 4 });
    expect(parseScore(`time 3/4\ntime 6/8\n${phrase}`, ['sine']).diagnostics[0].message).toContain(
      'Duplicate',
    );
  });
  it('counts denominator pulses, partial bars and notes crossing bars', () => {
    const meter = parseMeter('6/8');
    expect(measureLength(meter)).toBe(3);
    expect(measurePosition(2.5, meter)).toEqual({ bar: 1, beat: 6 });
    expect(measurePosition(3, meter)).toEqual({ bar: 2, beat: 1 });
    expect(measurePosition(3.25, meter)).toEqual({ bar: 2, beat: 1.5 });
  });
});
