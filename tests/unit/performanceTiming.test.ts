import { expect, it } from 'vitest';
import {
  performanceMap,
  applyPerformance,
  parseSwing,
  type PerformanceEvent,
} from '../../src/core/performanceTiming';

const meter = { numerator: 4, denominator: 4 };
const setting = { subdivision: 'eighth' as const, amount: (100 * 2) / 3 };
it('keeps straight identity, exact pair endpoints and monotonic bounded swing without cumulative drift', () => {
  const straight = performanceMap(meter, [], [], 100000, { ...setting, amount: 50 });
  const map = performanceMap(meter, [], [], 100000, setting);
  for (const x of [0, 0.125, 0.5, 0.75, 1, 13.5, 99999.5, 100000]) expect(straight(x)).toBe(x);
  expect(map(0.5)).toBeCloseTo(2 / 3, 12);
  expect(map(0.75)).toBeCloseTo(5 / 6, 12);
  for (let n = 0; n <= 10000; n++) {
    expect(map(n)).toBe(n);
    if (n) expect(map(n - 0.1)).toBeLessThan(map(n));
  }
  const extreme = performanceMap(meter, [], [], 10, { ...setting, amount: 75 });
  expect(extreme(0.5)).toBe(0.75);
  expect(extreme(0.75)).toBe(0.875);
});
it('leaves incomplete odd-meter and final pairs straight, restarting the grid at each bar', () => {
  const odd = { numerator: 7, denominator: 8 };
  const map = performanceMap(odd, [], [], 7, setting);
  expect(map(3.25)).toBe(3.25);
  expect(map(3.5)).toBe(3.5);
  expect(map(4)).toBeCloseTo(3.5 + 2 / 3);
  const short = performanceMap(meter, [], [], 1.5, setting);
  expect(short(1.25)).toBe(1.25);
  const sixteenths = performanceMap(odd, [], [], 7, { subdivision: '16th', amount: 75 });
  expect(sixteenths(3.25)).toBe(3.375);
  const changed = performanceMap(
    meter,
    [{ beat: 4, meter: odd, from: 0, to: 1, line: 1 }],
    [],
    11,
    setting,
  );
  expect(changed(7.25)).toBe(7.25);
  expect(changed(8)).toBeCloseTo(7.5 + 2 / 3);
});
it('protects every whole pair touched by a tuplet, including adjacent notes', () => {
  const events = [{ beat: 0.5, duration: 1, tuplet: { notes: 3, inTimeOf: 2 } }];
  const map = performanceMap(meter, [], events, 4, setting);
  for (const x of [0.25, 0.5, 1, 1.25, 1.75, 2]) expect(map(x)).toBe(x);
  expect(map(2.5)).toBeCloseTo(2 + 2 / 3);
});
it('derives performed intervals and proportional gates without changing written timing', () => {
  const events: PerformanceEvent[] = [
    { beat: 0, duration: 1, gateDuration: 0.5 },
    { beat: 1, duration: 0.5, gateDuration: 0.25 },
  ];
  applyPerformance(events, performanceMap(meter, [], events, 2, setting));
  expect(events[0]).toMatchObject({
    beat: 0,
    duration: 1,
    performedDuration: 1,
    performedGateDuration: 0.5,
  });
  expect(events[1].performedDuration).toBeCloseTo(2 / 3);
  expect(events[1].performedGateDuration).toBeCloseTo(1 / 3);
});
it('validates explicit percent units and rejects malformed or unbounded amounts', () => {
  expect(parseSwing('swing off')).toBeNull();
  expect(parseSwing('swing 16th 62.5%')).toEqual({ subdivision: '16th', amount: 62.5 });
  for (const text of [
    'swing',
    'swing eighth NaN',
    'swing eighth 49',
    'swing eighth 76',
    'swing quarter 60',
    'swing eighth 1e2',
  ])
    expect(() => parseSwing(text)).toThrow();
});
