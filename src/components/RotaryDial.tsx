import { useRef, useState, type PointerEvent } from 'react';
import { angleDelta, dialRotation, dialStep, pointerAngle, rotateValue } from '../core/rotary';

interface Gesture {
  pointerId: number;
  centerX: number;
  centerY: number;
  angle: number | null;
  value: number;
  group: string;
}
export interface RotaryDialProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number, group?: string) => void;
}
export default function RotaryDial({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: RotaryDialProps) {
  const gesture = useRef<Gesture | null>(null);
  const [dragging, setDragging] = useState(false);
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (
    <div
      className={`pedal-dial ${dragging ? 'dial-dragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label={`${label} dial`}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value}${unit === ':1' ? ' to 1' : ` ${unit}`}`}
      title="Drag around the dial clockwise to increase; counterclockwise to decrease."
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0 || gesture.current) return;
        event.preventDefault();
        event.currentTarget.focus();
        const box = event.currentTarget.getBoundingClientRect();
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        gesture.current = {
          pointerId: event.pointerId,
          centerX,
          centerY,
          angle: pointerAngle(event.clientX - centerX, event.clientY - centerY),
          value,
          group: `rotary:${crypto.randomUUID()}`,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        event.preventDefault();
        const nextAngle = pointerAngle(
          event.clientX - current.centerX,
          event.clientY - current.centerY,
        );
        if (nextAngle !== null && current.angle !== null) {
          current.value = rotateValue(
            current.value,
            angleDelta(current.angle, nextAngle),
            min,
            max,
          );
          const next = dialStep(current.value, min, max, step);
          if (next !== value) onChange(next, current.group);
        }
        current.angle = nextAngle;
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
    >
      <span
        aria-hidden="true"
        style={{ transform: `rotate(${dialRotation(value, min, max)}deg)` }}
      />
    </div>
  );
}
