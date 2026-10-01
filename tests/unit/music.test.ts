import { describe, expect, it } from 'vitest';
import {
  components,
  descriptors,
  mathematicalPreset,
  NEUTRAL_MACROS,
  pitch,
  sourceSamples,
  transform,
} from '../../src/core/music';

describe('scientific pitch notation', () => {
  it('resolves middle C, concert A, accidentals, and boundary pitches', () => {
    expect(pitch('A4').frequency).toBe(440);
    expect(pitch('C4').frequency).toBeCloseTo(261.625565, 5);
    expect(pitch('Bb4').midi).toBe(pitch('A#4').midi);
    expect(pitch('C0').midi).toBe(12);
    expect(pitch('B8').midi).toBe(119);
  });
  it.each(['Cb0', 'B#8', 'C9', 'A', 'H4', 'a4'])('rejects %s', (note) =>
    expect(() => pitch(note)).toThrow(),
  );
});
describe('source coefficient model', () => {
  it('uses finite odd-harmonic coefficients and triangle polarity', () => {
    const square = mathematicalPreset('square');
    const triangle = mathematicalPreset('triangle');
    expect(square.harmonics[1]).toBe(0);
    expect(square.harmonics[4]).toBe(0.2);
    expect(triangle.harmonics[2]).toBeCloseTo(1 / 9);
    expect(triangle.polarity[2]).toBe(-1);
    expect(triangle.polarity[4]).toBe(1);
  });
  it('excludes Nyquist and higher components without changing saved coefficients', () => {
    const sound = mathematicalPreset('saw');
    const partials = components(sound, 12000, 48000);
    expect(partials[0].available).toBe(true);
    expect(partials[1].available).toBe(false);
    expect(sound.harmonics[1]).toBe(0.5);
  });
  it('truly disables undertones and lengthens the active-bank source window', () => {
    const sound = mathematicalPreset('sine');
    sound.undertones[0] = 0.5;
    expect(components(sound, 440)[16].magnitude).toBe(0);
    sound.undertonesEnabled = true;
    const c = components(sound, 440);
    expect(c[16].frequency).toBe(220);
    expect(c[17].frequency).toBeCloseTo(146.666667);
    expect(sourceSamples(sound, 440).seconds).toBeCloseTo(6 / 440);
  });
  it('returns meaningful descriptors and a silence state', () => {
    const sine = mathematicalPreset('sine');
    expect(descriptors(sine, 440).centroid).toBe(440);
    expect(descriptors(sine, 440).oddShare).toBe(1);
    sine.harmonics[0] = 0;
    expect(descriptors(sine, 440).centroid).toBeNull();
  });
  it('calculates macros from a stable baseline and preserves zeroes, polarity, and bank state', () => {
    const baseline = mathematicalPreset('triangle');
    baseline.undertones[0] = 0.2;
    const altered = transform(baseline, {
      falloff: 1,
      brightness: 0.5,
      oddEven: 0.5,
      subWeight: 2,
    });
    expect(altered.harmonics[1]).toBe(0);
    expect(altered.polarity).toEqual(baseline.polarity);
    expect(altered.undertonesEnabled).toBe(false);
    expect(altered.undertones[0]).toBe(0.4);
    expect(transform(baseline, NEUTRAL_MACROS)).toEqual(baseline);
    expect(baseline.harmonics[0]).toBe(1);
  });
});
