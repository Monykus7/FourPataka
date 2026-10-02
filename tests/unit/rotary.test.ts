import { describe, expect, it } from 'vitest';
import {
  angleDelta,
  dialRotation,
  dialStep,
  pointerAngle,
  rotateValue,
} from '../../src/core/rotary';
describe('rotary dial math', () => {
  it('matches the visible 270-degree sweep and ignores the unstable center', () => {
    expect(dialRotation(-60, -60, 0)).toBe(-135);
    expect(dialRotation(-30, -60, 0)).toBe(0);
    expect(dialRotation(0, -60, 0)).toBe(135);
    expect(pointerAngle(0, -20)).toBe(0);
    expect(pointerAngle(20, 0)).toBe(90);
    expect(pointerAngle(-20, 0)).toBe(-90);
    expect(pointerAngle(2, 2)).toBeNull();
  });
  it('takes the short continuous path across the angle seam in both directions', () => {
    expect(angleDelta(175, -175)).toBe(10);
    expect(angleDelta(-175, 175)).toBe(-10);
    expect(rotateValue(6, 90, 0, 24)).toBe(14);
  });
  it('clamps endpoints and lets an overshot knob reverse immediately', () => {
    expect(rotateValue(23, 90, 0, 24)).toBe(24);
    expect(rotateValue(24, -45, 0, 24)).toBe(20);
    expect(rotateValue(-59, -90, -60, 0)).toBe(-60);
  });
  it('quantizes actual parameter steps without accumulating floating-point artifacts', () => {
    expect(dialStep(4.26, 1, 20, 0.1)).toBe(4.3);
    expect(dialStep(-5.26, -24, 12, 0.5)).toBe(-5.5);
    expect(dialStep(6093, 80, 16000, 20)).toBe(6100);
    expect(dialStep(99.99, 0, 100, 1)).toBe(100);
  });
});
