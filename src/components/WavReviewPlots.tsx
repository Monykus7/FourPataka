import { fittedEnvelope } from '../core/wavFit';
import type { WavPeaks, WavReview } from '../core/wavReview';
import { dbToGain } from '../modules/foundation/fourierComponents';
import type { FourierSound } from '../modules/foundation/fourier';
import { spectralContour } from '../modules/engines/spectral/contour';
import type { SpectralSettings } from '../modules/engines/spectral/settings';

export function WavSpectralPlot({
  review,
  settings,
}: {
  review: WavReview;
  settings: SpectralSettings;
}) {
  const { evolving, timing } = review;
  if (!evolving || !timing) return null;
  const points = spectralContour(settings, evolving.gate, settings.release);
  const length = Math.max(
    review.samples.length / review.sampleRate,
    timing.onset + points.at(-1)!.time,
  );
  const gain = dbToGain(settings.trim);
  const tonal = points.map(
    (frame) => (Math.hypot(...frame.tones) * settings.tone * gain) / Math.SQRT2,
  );
  const noise = points.map((frame) => Math.hypot(...frame.noise) * settings.noise * gain);
  const max = Math.max(0.0001, ...timing.rms, ...tonal, ...noise);
  const path = (values: number[], time: (index: number) => number) =>
    values
      .map((value, i) => `${i ? 'L' : 'M'}${(600 * time(i)) / length} ${73 - (70 * value) / max}`)
      .join(' ');
  const modelTime = (i: number) => timing.onset + points[i].time;
  return (
    <figure>
      <figcaption>Evolving spectrum · amplitude over time</figcaption>
      <svg
        className="wav-plot"
        viewBox="0 0 600 76"
        preserveAspectRatio="none"
        role="img"
        aria-label="Measured RMS and estimated tonal and noise envelopes"
      >
        <path d={path(timing.rms, (i) => timing.step * i)} className="wav-source" />
        <path d={path(tonal, modelTime)} className="wav-model" />
        <path d={path(noise, modelTime)} className="wav-noise" />
      </svg>
      <small className="wav-legend">
        <span>Original RMS</span>
        <span>Modeled tone</span>
        <span>Modeled noise</span>
      </small>
    </figure>
  );
}

function WavePlot({
  peaks,
  label,
  selection,
  markers = [],
}: {
  peaks: WavPeaks;
  label: string;
  selection?: [number, number];
  markers?: [name: string, position: number][];
}) {
  const limit = Math.max(0.0001, ...peaks.map(([low, high]) => Math.max(-low, high)));
  return (
    <svg
      className="wav-plot"
      viewBox="0 0 600 76"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      {selection && (
        <rect
          x={600 * selection[0]}
          width={600 * (selection[1] - selection[0])}
          height="76"
          className="wav-selection"
        />
      )}
      <path d="M0 38H600" className="wav-axis" />
      <path
        className="wav-source"
        d={peaks
          .map(([low, high], i) => {
            const x = (600 * (i + 0.5)) / peaks.length;
            return `M${x} ${38 - (35 * high) / limit}V${38 - (35 * low) / limit}`;
          })
          .join(' ')}
      />
      {markers.map(([name, position]) => (
        <line key={name} className="wav-marker" x1={600 * position} x2={600 * position} y2="76">
          <title>{name}</title>
        </line>
      ))}
    </svg>
  );
}

export function WavWaveforms({ review }: { review: WavReview }) {
  const { offset, duration, sampleRate, samples, timing } = review;
  const length = samples.length / sampleRate;
  const markers: [string, number][] = timing
    ? [
        ['Onset', timing.onset / length],
        ['Attack end', timing.attackEnd / length],
        ['Audible end', timing.end / length],
        ...(timing.noteOff === null
          ? []
          : [['Note-off', timing.noteOff / length] as [string, number]]),
      ]
    : [];
  return (
    <>
      <WavePlot
        peaks={review.overview}
        label="Full recording and analyzed crop"
        selection={[offset / duration, (offset + length) / duration]}
      />
      <WavePlot
        peaks={review.waveform}
        label="Crop waveform, timing markers and body window"
        markers={markers}
        selection={timing ? [timing.body.start / length, timing.body.end / length] : undefined}
      />
    </>
  );
}

export function WavFitPlots({ review, sound }: { review: WavReview; sound: FourierSound }) {
  const { fit, timing } = review;
  if (!fit || !timing) return null;
  const gain = dbToGain(sound.trim);
  const midpoint = (timing.body.start + timing.body.end) / 2 - timing.onset;
  const bodyGain = fittedEnvelope(sound, fit.gate, midpoint);
  // Preview uses the recording rate. Edited partials can become audible in a
  // lower score note even when the reference playback excludes them.
  const audible = sound.harmonics.map((value, i) =>
    fit.frequency * (i + 1) < review.sampleRate / 2 ? value : 0,
  );
  const amplitudes = audible.map((value) => value * gain * bodyGain);
  const peak = Math.max(1e-7, ...fit.spectrum, ...amplitudes);
  const length = Math.max(
    review.samples.length / review.sampleRate,
    timing.onset + fit.gate + sound.release,
  );
  const rms = (Math.hypot(...audible) * gain) / Math.SQRT2;
  const render = Array.from(
    { length: 240 },
    (_, i) => rms * fittedEnvelope(sound, fit.gate, (length * i) / 239 - timing.onset),
  );
  const limit = Math.max(1e-7, ...timing.rms, ...render);
  const path = (values: number[], step: number) =>
    values
      .map(
        (value, i) =>
          `${i === 0 ? 'M' : 'L'}${(600 * i * step) / length} ${73 - (70 * value) / limit}`,
      )
      .join(' ');
  return (
    <div className="wav-plot-pair">
      <figure>
        <figcaption>Body spectrum · H1–H32</figcaption>
        <svg
          className="wav-plot"
          viewBox="0 0 600 76"
          preserveAspectRatio="none"
          role="img"
          aria-label="Original and reconstructed harmonic magnitudes at the body"
        >
          {fit.spectrum.map((value, i) => (
            <g key={i}>
              <title>
                H{i + 1} · original {value.toFixed(4)} · reconstruction {amplitudes[i].toFixed(4)}
              </title>
              <rect
                x={i * 18.75 + 1}
                width="7.5"
                y={73 - (70 * value) / peak}
                height={(70 * value) / peak}
                className="wav-source-fill"
              />
              <rect
                x={i * 18.75 + 9}
                width="7.5"
                y={73 - (70 * amplitudes[i]) / peak}
                height={(70 * amplitudes[i]) / peak}
                className="wav-model-fill"
              />
            </g>
          ))}
        </svg>
      </figure>
      <figure>
        <figcaption>Amplitude envelope · RMS</figcaption>
        <svg
          className="wav-plot"
          viewBox="0 0 600 76"
          preserveAspectRatio="none"
          role="img"
          aria-label="Measured RMS and approximate reconstructed RMS over time"
        >
          <path d={path(timing.rms, timing.step)} className="wav-source" />
          <path d={path(render, length / 239)} className="wav-model" />
        </svg>
      </figure>
      <small className="wav-legend">
        <span>Original</span>
        <span>Reconstruction</span>
      </small>
    </div>
  );
}
