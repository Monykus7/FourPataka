import { expect, it } from 'vitest';
import { createPitchEnvelope } from '../../src/audio/pitchEnvelope';

it('falling pitch integrates frequency for phase rather than multiplying instantaneous pitch by age', () => {
  const curve = createPitchEnvelope(2, { amount: 24, decay: 0.025 });
  expect(curve.sample(2).ratio).toBe(4);
  expect(curve.sample(2.2).ratio).toBeCloseTo(1, 2);
  let integrated = 0;
  const step = 0.00001;
  for (let t = 2; t < 2.199999; t += step) integrated += curve.sample(t + step / 2).ratio * step;
  expect(curve.sample(2.2).integral).toBeCloseTo(integrated, 7);
  expect(curve.sample(2.2).integral).toBeGreaterThan(curve.sample(2.2).ratio * 0.2);
});

it('rapid pitch changes preserve frequency and accumulated phase while targets retain original note age', () => {
  const curve = createPitchEnvelope(0, { amount: 24, decay: 0.025 });
  const before = curve.sample(0.12);
  curve.update({ amount: 12, decay: 0.04 }, 0.12);
  expect(curve.sample(0.12)).toEqual(before);
  const during = curve.sample(0.13);
  curve.update(undefined, 0.13);
  expect(curve.sample(0.13)).toEqual(during);
  expect(curve.sample(0.15).ratio).toBe(1);
  expect(curve.sample(0.2).integral - curve.sample(0.15).integral).toBeCloseTo(0.05, 10);
  expect(curve.update(undefined, 0.2)).toBe(false);
});

it('ordinary sources retain the constant pitch and shared scheduler includes pending ramps', () => {
  const curve = createPitchEnvelope(1);
  expect(curve.sample(1.5)).toEqual({ ratio: 1, integral: 0.5 });
  curve.update({ amount: 12, decay: 0.2 }, 1.1);
  const calls: number[][] = [];
  curve.schedule(
    {
      cancelScheduledValues() {},
      setValueAtTime(...args: number[]) {
        calls.push(args);
      },
      linearRampToValueAtTime(...args: number[]) {
        calls.push(args);
      },
      setTargetAtTime(...args: number[]) {
        calls.push(args);
      },
    } as unknown as AudioParam,
    100,
    1.11,
  );
  expect(calls[0][0]).toBeCloseTo(100 * curve.sample(1.11).ratio);
  expect(calls[1]).toEqual([100 * curve.sample(1.12).ratio, 1.12]);
  expect(calls[2]).toEqual([100, 1.12, 0.2]);
});
