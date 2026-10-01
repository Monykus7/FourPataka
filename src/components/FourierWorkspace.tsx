import { useRef, useState, type ReactNode, type PointerEvent } from 'react';
import type { Sound } from '../core/music';
import { harmonicShape, soundFromWaveform } from '../core/waveform';

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
  const [target, setTarget] = useState<number[] | null>(null);
  const stroke = useRef<{
    samples: number[];
    index: number;
    value: number;
    base: Sound;
    group: string;
    scale: number;
  } | null>(null);
  const scale =
    stroke.current?.scale ??
    Math.max(1, ...Array.from({ length: 513 }, (_, i) => Math.abs(harmonicShape(sound, i / 512))));
  const path = Array.from(
    { length: 513 },
    (_, i) =>
      `${i ? 'L' : 'M'}${(i * 600) / 512},${120 - (harmonicShape(sound, i / 512) * 100) / scale}`,
  ).join(' ');
  function draw(e: PointerEvent<SVGSVGElement>) {
    const active = stroke.current;
    if (!active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const phase = Math.min(0.5, Math.max(0, (e.clientX - rect.left) / rect.width));
    const index = Math.round(phase * 512);
    const value = Math.min(
      scale,
      Math.max(-scale, (1.2 - ((e.clientY - rect.top) / rect.height) * 2.4) * scale),
    );
    const distance = Math.abs(index - active.index);
    for (let step = 0; step <= distance; step++) {
      const at = active.index + Math.sign(index - active.index) * step;
      active.samples[at] = distance
        ? active.value + ((value - active.value) * step) / distance
        : value;
    }
    active.samples[0] = 0;
    active.samples[256] = 0;
    active.index = index;
    active.value = value;
    setTarget([...active.samples]);
    onChange(soundFromWaveform(active.base, active.samples), active.group);
  }
  const targetPath = target
    ?.map((value, i) => `${i ? 'L' : 'M'}${(i * 300) / 256},${120 - (value * 100) / scale}`)
    .join(' ');
  return (
    <section className={`fourier-workspace mode-${mode}`} aria-label="Fourier workspace">
      <div className="fourier-toolbar" role="group" aria-label="Fourier editor view">
        <button
          className="secondary-button"
          aria-pressed={mode === 'harmonics'}
          onClick={() => {
            setMode('harmonics');
            setTarget(null);
          }}
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
                      stroke="var(--accent)"
                      strokeWidth="6"
                    />
                  </g>
                ))}
              </svg>
              <p className="footnote">H1–H16 · signed coefficients ±1</p>
              <button
                className="text-button"
                onClick={() => {
                  setMode('harmonics');
                  setTarget(null);
                }}
              >
                Edit harmonics
              </button>
            </div>
          )}
        </div>
        <div className="fourier-waveform graph-card">
          <div className="graph-heading">
            <span>{mode === 'waveform' ? 'Draw source waveform' : 'Waveform preview'}</span>
            <span className="tag">ONE CYCLE</span>
          </div>
          <svg
            viewBox="0 0 600 240"
            className="editable-wave"
            role="img"
            aria-label="Editable harmonic source waveform"
            style={{ touchAction: mode === 'waveform' ? 'none' : 'auto' }}
            onPointerDown={(e) => {
              if (mode !== 'waveform' || e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              const samples = Array.from({ length: 257 }, (_, i) => harmonicShape(sound, i / 512));
              const rect = e.currentTarget.getBoundingClientRect();
              const index = Math.round(
                Math.min(0.5, Math.max(0, (e.clientX - rect.left) / rect.width)) * 512,
              );
              stroke.current = {
                samples,
                index,
                value: samples[index],
                base: structuredClone(sound),
                group: `waveform:${Date.now()}`,
                scale,
              };
              draw(e);
            }}
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
            <rect x="300" y="0" width="300" height="240" fill="var(--text-muted)" opacity=".05" />
            {[20, 120, 220].map((y) => (
              <line key={y} x1="0" x2="600" y1={y} y2={y} className="graph-grid" />
            ))}
            <line x1="300" x2="300" y1="0" y2="240" className="graph-grid" />
            {mode === 'waveform' && targetPath && (
              <path d={targetPath} fill="none" stroke="var(--text-muted)" strokeDasharray="4 4" />
            )}
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
          </svg>
          <div className="graph-axis">
            <span>0</span>
            <span>½ cycle</span>
            <span>1 cycle</span>
          </div>
          <p className="footnote">
            {mode === 'waveform'
              ? 'Draw in the left half; the right half mirrors it. Orange: 16-harmonic reconstruction. Dashed: drawn target. Coefficients are limited to ±1.'
              : 'Switch to Waveform to draw the source shape.'}
          </p>
          <p className="footnote">
            Harmonic bank before trim and envelope · undertones stay separate · ±{scale.toFixed(2)}
          </p>
        </div>
      </div>
    </section>
  );
}
