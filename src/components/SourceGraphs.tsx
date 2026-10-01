import { components, sourceSamples, type Sound } from '../core/music';
export default function SourceGraphs({
  sound,
  frequency,
  sampleRate,
  selected,
  onSelect,
}: {
  sound: Sound;
  frequency: number;
  sampleRate: number;
  selected: string;
  onSelect: (label: string) => void;
}) {
  const wave = sourceSamples(sound, frequency, sampleRate);
  const width = 600;
  const height = 140;
  const scale = Math.max(1, ...wave.values.map(Math.abs));
  const path = wave.values
    .map(
      (value, index) =>
        `${index === 0 ? 'M' : 'L'}${((index * width) / (wave.values.length - 1)).toFixed(2)},${(height / 2 - (value / scale) * 56).toFixed(2)}`,
    )
    .join(' ');
  const partials = components(sound, frequency, sampleRate).filter((p) => p.magnitude > 0);
  const maxFrequency = Math.max(frequency * 16, 1000);
  return (
    <div className="source-graphs">
      <section className="graph-card">
        <div className="graph-heading">
          <span>Source waveform</span>
          <span className="tag">STEADY SHAPE</span>
        </div>
        <svg
          className="wave-graph"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Steady source waveform, after instrument trim, before envelope"
        >
          <defs>
            <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#ff8906" stopOpacity=".15" />
              <stop offset="1" stopColor="#ff8906" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[28, 70, 112].map((y) => (
            <line key={y} x1="0" x2={width} y1={y} y2={y} className="graph-grid" />
          ))}
          {[0, 150, 300, 450, 600].map((x) => (
            <line key={x} x1={x} x2={x} y1="0" y2={height} className="graph-grid" />
          ))}
          <path d={`${path} L600,140 L0,140 Z`} fill="url(#wave-fill)" />
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
        </svg>
        <div className="graph-axis">
          <span>0 ms</span>
          <span>
            ±{scale.toFixed(1)} amplitude scale · trim {sound.trim} dB
          </span>
          <span>{(wave.seconds * 1000).toFixed(1)} ms</span>
        </div>
      </section>
      <section className="graph-card">
        <div className="graph-heading">
          <span>Source spectrum</span>
          <span className="tag">COEFFICIENTS</span>
        </div>
        <svg
          className="wave-graph spectrum"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Source coefficients plotted at their actual frequencies, before trim"
        >
          {[28, 70, 112].map((y) => (
            <line key={y} x1="0" x2={width} y1={y} y2={y} className="graph-grid" />
          ))}
          {partials.map((p) => {
            const x = 8 + (p.frequency / maxFrequency) * 580;
            return (
              <g key={p.label} onClick={() => onSelect(p.label)}>
                <title>
                  {p.label}: {p.frequency.toFixed(2)} Hz, magnitude {p.magnitude.toFixed(3)}
                  {!p.available ? ' (above Nyquist; excluded from playback)' : ''}
                </title>
                <line
                  x1={x}
                  x2={x}
                  y1="130"
                  y2={130 - p.magnitude * 112}
                  stroke={p.kind === 'undertone' ? 'var(--tertiary)' : 'var(--accent)'}
                  strokeWidth={selected === p.label ? 4 : 2}
                  opacity={p.available ? 1 : 0.25}
                />
                <circle
                  cx={x}
                  cy={130 - p.magnitude * 112}
                  r={selected === p.label ? 4 : 2}
                  fill={p.kind === 'undertone' ? 'var(--tertiary)' : 'var(--accent)'}
                />
              </g>
            );
          })}
        </svg>
        <div className="graph-axis">
          <span>0 Hz</span>
          <span>Magnitude 0–1 · before trim</span>
          <span>{(maxFrequency / 1000).toFixed(2)} kHz</span>
        </div>
      </section>
    </div>
  );
}
