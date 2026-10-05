import { useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { clamp, type Sound } from '../core/music';
import {
  keepMatchingWavePoints,
  harmonicShape,
  insertWavePoint,
  resetWaveform,
  soundFromPoints,
  soundFromWaveform,
  waveformFromPoints,
  type WavePoint,
} from '../core/waveform';

const signature = (s: Sound) => JSON.stringify([s.harmonics, s.polarity]);
export default function FourierWorkspace({
  sound,
  onChange,
  children,
}: {
  sound: Sound;
  onChange: (sound: Sound, group?: string) => void;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<'harmonics' | 'waveform'>('harmonics');
  const [tool, setTool] = useState<'points' | 'draw'>('points');
  const [selected, setSelected] = useState(1);
  const wave = useRef<SVGSVGElement>(null);
  const focusAfterDelete = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (focusAfterDelete.current === null) return;
    wave.current
      ?.querySelector<SVGCircleElement>(`[data-point="${focusAfterDelete.current}"]`)
      ?.focus();
    focusAfterDelete.current = null;
  });
  const [target, setTarget] = useState<{ samples: number[]; signature: string } | null>(null);
  const stroke = useRef<{
    samples: number[];
    index: number;
    value: number;
    base: Sound;
    group: string;
    scale: number;
    points?: WavePoint[];
  } | null>(null);
  const points =
    keepMatchingWavePoints(sound).waveformPoints ??
    Array.from({ length: 7 }, (_, i) => ({
      x: i / 6,
      y: i === 0 || i === 6 ? 0 : harmonicShape(sound, i / 12),
    }));
  const pointIndex = clamp(selected, 1, points.length - 2);
  const point = points[pointIndex];
  const scale =
    stroke.current?.scale ??
    Math.max(
      1,
      ...points.map((p) => Math.abs(p.y)),
      ...Array.from({ length: 513 }, (_, i) => Math.abs(harmonicShape(sound, i / 512))),
    );
  const path = Array.from(
    { length: 513 },
    (_, i) =>
      `${i ? 'L' : 'M'}${(i * 600) / 512},${120 - (harmonicShape(sound, i / 512) * 100) / scale}`,
  ).join(' ');
  const targetSamples =
    tool === 'points'
      ? waveformFromPoints(points)
      : target?.signature === signature(sound)
        ? target.samples
        : null;
  const targetPath = targetSamples
    ?.map((value, i) => `${i ? 'L' : 'M'}${(i * 300) / 256},${120 - (value * 100) / scale}`)
    .join(' ');
  function applyPoints(next: WavePoint[], base = sound, group?: string) {
    onChange(soundFromPoints(base, next), group);
    setTarget(null);
  }
  function movePoint(index: number, x: number, y: number, group?: string) {
    const next = structuredClone(points);
    next[index] = {
      x: clamp(x, points[index - 1].x + 0.005, points[index + 1].x - 0.005),
      y: clamp(y, -16, 16),
    };
    applyPoints(next, sound, group);
  }
  function removePoint(index: number) {
    if (points.length <= 3 || index === 0 || index === points.length - 1) return;
    applyPoints(points.filter((_, i) => i !== index));
    setSelected(Math.max(1, index - 1));
  }
  function draw(e: PointerEvent<SVGSVGElement>) {
    const active = stroke.current;
    if (!active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 2, 0, 1);
    const y = clamp((1.2 - ((e.clientY - rect.top) / rect.height) * 2.4) * active.scale, -16, 16);
    if (active.points) {
      const index = active.index;
      active.points[index] = {
        x: clamp(x, active.points[index - 1].x + 0.005, active.points[index + 1].x - 0.005),
        y: clamp(y, -active.scale, active.scale),
      };
      applyPoints(active.points, active.base, active.group);
      return;
    }
    const index = Math.round(x * 256),
      value = clamp(y, -active.scale, active.scale);
    const distance = Math.abs(index - active.index);
    for (let step = 0; step <= distance; step++) {
      const at = active.index + Math.sign(index - active.index) * step;
      active.samples[at] = distance
        ? active.value + ((value - active.value) * step) / distance
        : value;
    }
    active.samples[0] = active.samples[256] = 0;
    active.index = index;
    active.value = value;
    const next = soundFromWaveform(active.base, active.samples);
    setTarget({ samples: [...active.samples], signature: signature(next) });
    onChange(next, active.group);
  }
  function start(e: PointerEvent<SVGSVGElement>) {
    if (mode !== 'waveform' || e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX > rect.left + rect.width / 2) return;
    const x = clamp(((e.clientX - rect.left) / rect.width) * 2, 0, 1);
    if (tool === 'points') {
      const raw = (e.target as Element).getAttribute('data-point');
      if (raw === null) {
        if (points.length >= 32 || points.some((p) => Math.abs(p.x - x) < 0.005)) return;
        const y = clamp(
          (1.2 - ((e.clientY - rect.top) / rect.height) * 2.4) * scale,
          -scale,
          scale,
        );
        const next = [...points, { x, y }].sort((a, b) => a.x - b.x);
        const index = next.findIndex((p) => p.x === x);
        setSelected(index);
        applyPoints(next);
        return;
      }
      const index = Number(raw);
      if (index === 0 || index === points.length - 1) return;
      setSelected(index);
      stroke.current = {
        samples: [],
        index,
        value: 0,
        base: structuredClone(sound),
        group: `waveform:${crypto.randomUUID()}`,
        scale,
        points: structuredClone(points),
      };
    } else {
      const samples = Array.from({ length: 257 }, (_, i) => harmonicShape(sound, i / 512));
      const index = Math.round(x * 256);
      stroke.current = {
        samples,
        index,
        value: samples[index],
        base: structuredClone(sound),
        group: `waveform:${crypto.randomUUID()}`,
        scale,
      };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'draw') draw(e);
  }
  return (
    <section className={`fourier-workspace mode-${mode}`} aria-label="Fourier workspace">
      <div className="fourier-toolbar" role="group" aria-label="Fourier editor view">
        <button
          className="secondary-button"
          aria-pressed={mode === 'harmonics'}
          onClick={() => setMode('harmonics')}
        >
          Harmonics
        </button>
        <button
          className="secondary-button"
          aria-pressed={mode === 'waveform'}
          onClick={() => setMode('waveform')}
        >
          Waveform
        </button>
      </div>
      <div className="fourier-views">
        <div className="fourier-harmonics">
          <div hidden={mode === 'waveform'}>{children}</div>
          {mode === 'waveform' && (
            <div className="graph-card">
              <div className="graph-heading">
                <span>Harmonics preview</span>
              </div>
              <svg
                viewBox="0 0 240 150"
                role="img"
                aria-label="Signed harmonic coefficients preview"
              >
                <line x1="0" x2="240" y1="75" y2="75" className="graph-grid" />
                {sound.harmonics.map((value, i) => (
                  <g key={i}>
                    <title>
                      H{i + 1}: {(value * sound.polarity[i]).toFixed(3)}
                    </title>
                    <line
                      x1={8 + i * 15}
                      x2={8 + i * 15}
                      y1="75"
                      y2={75 - value * sound.polarity[i] * 65}
                      stroke={
                        sound.polarity[i] < 0
                          ? 'var(--tertiary)'
                          : i % 2
                            ? 'var(--secondary)'
                            : 'var(--accent)'
                      }
                      strokeWidth="6"
                    />
                  </g>
                ))}
              </svg>
              <p className="footnote">H1–H16 · signed coefficients ±1</p>
              <button className="text-button" onClick={() => setMode('harmonics')}>
                Edit harmonics
              </button>
            </div>
          )}
        </div>
        <div className={`fourier-waveform graph-card tool-${tool}`}>
          <div className="graph-heading">
            <span>{mode === 'waveform' ? 'Source waveform' : 'Waveform preview'}</span>
            <span className="tag">ONE CYCLE</span>
          </div>
          {mode === 'waveform' && (
            <div className="wave-tools">
              <div role="group" aria-label="Waveform editing tool">
                <button
                  className="secondary-button"
                  aria-pressed={tool === 'points'}
                  onClick={() => {
                    setTool('points');
                    setTarget(null);
                  }}
                >
                  Dots
                </button>
                <button
                  className="secondary-button"
                  aria-pressed={tool === 'draw'}
                  onClick={() => setTool('draw')}
                >
                  Draw
                </button>
              </div>
              {tool === 'points' && (
                <button
                  className="secondary-button"
                  disabled={points.length >= 32}
                  onClick={() => {
                    const added = insertWavePoint(points);
                    if (!added) return;
                    applyPoints(added.points);
                    setSelected(added.index);
                  }}
                >
                  Add dot
                </button>
              )}
              <button
                className="secondary-button wave-reset"
                onClick={() => {
                  stroke.current = null;
                  setTarget(null);
                  setSelected(1);
                  onChange(resetWaveform(sound));
                }}
              >
                Reset waveform to sine
              </button>
            </div>
          )}
          {mode === 'waveform' && tool === 'points' && (
            <div className="wave-keyboard-help" role="note" aria-label="Waveform keyboard controls">
              <div className="wave-keyboard-keys" id="wave-keyboard-help">
                <strong>Keyboard editing</strong>
                <span>
                  <kbd>Tab</kbd> focus a dot
                </span>
                <span>
                  <kbd>←</kbd>
                  <kbd>→</kbd> position
                </span>
                <span>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd> amplitude
                </span>
                <span>
                  <kbd>Delete</kbd> remove
                </span>
              </div>
            </div>
          )}
          <svg
            viewBox="0 0 600 240"
            className="editable-wave"
            role="group"
            aria-label="Editable harmonic source waveform"
            style={{ touchAction: mode === 'waveform' ? 'none' : 'auto' }}
            ref={wave}
            onPointerDown={start}
            onPointerMove={draw}
            onPointerUp={() => {
              stroke.current = null;
            }}
            onPointerCancel={() => {
              stroke.current = null;
            }}
            onLostPointerCapture={() => {
              stroke.current = null;
            }}
          >
            <rect x="300" y="0" width="300" height="240" fill="var(--tertiary)" opacity=".045" />
            {[20, 120, 220].map((y) => (
              <line key={y} x1="0" x2="600" y1={y} y2={y} className="graph-grid" />
            ))}
            <line x1="300" x2="300" y1="0" y2="240" className="graph-grid" />
            {mode === 'waveform' && targetPath && (
              <path
                d={targetPath}
                className="wave-target"
                fill="none"
                stroke="var(--secondary-ink)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
            )}
            <path
              d={path}
              fill="none"
              stroke="var(--accent-ink)"
              strokeWidth="2"
              style={{ pointerEvents: 'none' }}
            />
            {mode === 'waveform' &&
              tool === 'points' &&
              points.map((p, i) => (
                <circle
                  key={i}
                  data-point={i}
                  cx={p.x * 300}
                  cy={120 - (p.y * 100) / scale}
                  r={i === pointIndex ? 7 : 5}
                  className="wave-point"
                  role={i > 0 && i < points.length - 1 ? 'button' : undefined}
                  tabIndex={i > 0 && i < points.length - 1 ? 0 : undefined}
                  aria-label={`Wave point ${i}`}
                  aria-describedby={
                    i > 0 && i < points.length - 1 ? 'wave-keyboard-help' : undefined
                  }
                  aria-pressed={i === pointIndex}
                  onFocus={() => setSelected(i)}
                  onKeyDown={(e) => {
                    if (i === 0 || i === points.length - 1) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(i);
                    }
                    if (e.key.startsWith('Arrow')) {
                      e.preventDefault();
                      movePoint(
                        i,
                        p.x + (e.key === 'ArrowRight' ? 0.01 : e.key === 'ArrowLeft' ? -0.01 : 0),
                        p.y +
                          (e.key === 'ArrowUp'
                            ? 0.02 * scale
                            : e.key === 'ArrowDown'
                              ? -0.02 * scale
                              : 0),
                        `point-key:${i}`,
                      );
                    }
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      e.preventDefault();
                      if (points.length > 3) focusAfterDelete.current = Math.max(1, i - 1);
                      removePoint(i);
                    }
                  }}
                />
              ))}
          </svg>
          <div className="graph-axis">
            <span>0</span>
            <span>½ cycle</span>
            <span>1 cycle</span>
          </div>
          {mode === 'waveform' && tool === 'points' && (
            <div className="point-controls">
              <span>
                Dot {pointIndex} / {points.length - 2}
              </span>
              <label>
                Position %{' '}
                <input
                  type="number"
                  aria-label="Selected dot position"
                  min={(points[pointIndex - 1].x + 0.005) * 100}
                  max={(points[pointIndex + 1].x - 0.005) * 100}
                  step=".5"
                  value={Number((point.x * 100).toFixed(2))}
                  onChange={(e) => {
                    if (e.target.value !== '' && Number.isFinite(Number(e.target.value)))
                      movePoint(pointIndex, Number(e.target.value) / 100, point.y, 'dot-position');
                  }}
                />
              </label>
              <label>
                Amplitude{' '}
                <input
                  type="number"
                  aria-label="Selected dot amplitude"
                  min="-16"
                  max="16"
                  step=".05"
                  value={Number(point.y.toFixed(3))}
                  onChange={(e) => {
                    if (e.target.value !== '' && Number.isFinite(Number(e.target.value)))
                      movePoint(pointIndex, point.x, Number(e.target.value), 'dot-amplitude');
                  }}
                />
              </label>
              <button
                className="text-button"
                disabled={points.length <= 3}
                onClick={() => removePoint(pointIndex)}
              >
                Remove dot
              </button>
            </div>
          )}
          <p className="footnote">
            {mode === 'waveform'
              ? tool === 'points'
                ? 'Add dot splits the widest gap. Click to place, drag to move, or use exact values below. Up to 30 editable dots.'
                : 'Draw in the left half; the right half mirrors it.'
              : 'Switch to Waveform to edit the source shape.'}
          </p>
          {mode === 'waveform' && (
            <div className="wave-legend">
              <span>Orange · 16-harmonic sound</span>
              <span>Coral · target curve</span>
              <span>Pink · dots</span>
            </div>
          )}
          <p className="footnote">
            Harmonic bank before trim and envelope · undertones stay separate · ±{scale.toFixed(2)}
          </p>
        </div>
      </div>
    </section>
  );
}
