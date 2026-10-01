import { useEffect, useState } from 'react';
export default function ProcessedGraphs({
  analyser,
  sampleRate,
  label,
}: {
  analyser: AnalyserNode | null;
  sampleRate: number;
  label: string;
}) {
  const [data, setData] = useState<{ wave: number[]; spectrum: number[] } | null>(null);
  useEffect(() => {
    setData(null);
    if (!analyser) return;
    const wave = new Float32Array(analyser.fftSize),
      spectrum = new Float32Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getFloatTimeDomainData(wave);
      analyser.getFloatFrequencyData(spectrum);
      setData({ wave: Array.from(wave), spectrum: Array.from(spectrum) });
    };
    update();
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [analyser]);
  const wavePath = data?.wave
    .filter((_, i) => i % 4 === 0)
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${(i * 600) / (data.wave.length / 4 - 1)},${70 - Math.max(-2, Math.min(2, v)) * 28}`,
    )
    .join(' ');
  const spectrumPath = data?.spectrum
    .filter((_, i) => i % 4 === 0)
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${(i * 600) / (data.spectrum.length / 4 - 1)},${130 - Math.max(0, Math.min(1, (v + 100) / 100)) * 120}`,
    )
    .join(' ');
  return (
    <section className="processed-graphs" aria-label="After pedals signal">
      <div className="graph-heading">
        <span>After pedals · {label}</span>
        <span className="tag">LIVE OUTPUT</span>
      </div>
      {!data ? (
        <p className="footnote">Listen or Play to inspect this signal path.</p>
      ) : (
        <div className="source-graphs">
          <div>
            <svg viewBox="0 0 600 140" role="img" aria-label="After pedals waveform">
              <line x1="0" x2="600" y1="70" y2="70" className="graph-grid" />
              <path d={wavePath} fill="none" stroke="var(--secondary)" strokeWidth="2" />
            </svg>
            <p className="footnote">
              ±2 amplitude display · {((data.wave.length / sampleRate) * 1000).toFixed(1)} ms
            </p>
          </div>
          <div>
            <svg viewBox="0 0 600 140" role="img" aria-label="After pedals spectrum">
              <path d={spectrumPath} fill="none" stroke="var(--tertiary)" strokeWidth="2" />
            </svg>
            <p className="footnote">−100…0 dBFS · 0…{(sampleRate / 2000).toFixed(1)} kHz</p>
          </div>
        </div>
      )}
    </section>
  );
}
