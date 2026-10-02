import { clamp } from './music';

export const DIAL_SWEEP = 270;
export const dialRotation = (value: number, min: number, max: number) =>
  -135 + (DIAL_SWEEP * (clamp(value, min, max) - min)) / (max - min);

// Clockwise from twelve o'clock, matching the CSS indicator's rotation.
export function pointerAngle(x: number, y: number): number | null {
  if (Math.hypot(x, y) < 5) return null;
  return (Math.atan2(x, -y) * 180) / Math.PI;
}
export const angleDelta = (previous: number, next: number) =>
  ((((next - previous + 180) % 360) + 360) % 360) - 180;
export const rotateValue = (value: number, delta: number, min: number, max: number) =>
  clamp(value + (delta / DIAL_SWEEP) * (max - min), min, max);
export function dialStep(value: number, min: number, max: number, step: number) {
  return clamp(Number((min + Math.round((value - min) / step) * step).toFixed(8)), min, max);
}
