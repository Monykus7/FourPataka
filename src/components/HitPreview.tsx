import { useEffect, useState } from 'react';
import type { Sound } from '../core/music';
import { renderHitPreview, type HitPreview as Preview } from '../audio/hitPreview';

export default function HitPreview({
  sound,
  frequency,
  compact = false,
}: {
  sound: Sound;
  frequency: number;
  compact?: boolean;
}) {
  const [preview, setPreview] = useState<{ key: string; data: Preview } | null>(null);
  const [failed, setFailed] = useState('');
  const key = JSON.stringify([sound, frequency]);
  useEffect(() => {
    let current = true;
    // Debounce dials and discard stale renders; this never drives the transport.
    const timer = window.setTimeout(() => {
      void renderHitPreview(JSON.parse(key)[0], frequency)
        .then((data) => {
          if (current) setPreview({ key, data });
        })
        .catch(() => {
          if (current) setFailed(key);
        });
    }, 120);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [key, frequency]);
  const data = preview?.key === key ? preview.data : null;
  const lines = data?.bins
    .map(({ low, high }, i) => `M${(i * 600) / 179},${70 - high * 65}V${70 - low * 65}`)
    .join(' ');
  const graph = (
    <svg
      viewBox="0 0 600 140"
      className={compact ? undefined : 'wave-graph'}
      role={compact ? undefined : 'img'}
      aria-hidden={compact || undefined}
      aria-label={
        compact ? undefined : 'Rendered drum hit, including noise, pitch, envelope and trim'
      }
      data-ready={!!data}
    >
      <line x1="0" y1="70" x2="600" y2="70" className="graph-grid" />
      <path d={lines} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
  if (compact) return graph;
  return (
    <section className="graph-card hit-preview">
      <div className="graph-heading">
        <span>Complete hit</span>
        <span className="tag">DRY RENDER</span>
      </div>
      {graph}
      <div className="graph-axis">
        <span>0 ms</span>
        <span>
          {data
            ? 'Noise + body · fixed amplitude scale ±1'
            : failed === key
              ? 'Preview unavailable'
              : 'Rendering hit…'}
        </span>
        <span>{data ? `${Math.round(data.duration * 1000)} ms` : ''}</span>
      </div>
      <p className="hint">
        250 ms gate at {Math.round(frequency)} Hz, before pedals. Fourier editing below controls the
        pitched body.
      </p>
    </section>
  );
}
