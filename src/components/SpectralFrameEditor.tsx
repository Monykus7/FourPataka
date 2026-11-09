import { useState } from 'react';
import {
  SPECTRAL_NOISE_BANDS,
  type SpectralFrame,
  type SpectralSettings,
} from '../modules/engines/spectral/settings';
import DraftNumber from './DraftNumber';
import './SpectralFrameEditor.css';

export default function SpectralFrameEditor({
  settings,
  onChange,
}: {
  settings: SpectralSettings;
  onChange: (settings: SpectralSettings, field: string) => void;
}) {
  const [part, setPart] = useState<'held' | 'released'>('held');
  const [selection, setSelection] = useState(1);
  const frames = settings[part];
  const index = Math.min(selection, frames.length - 1);
  const frame = frames[index];
  const terminal = part === 'released' && index === frames.length - 1;
  const change = (patch: Partial<SpectralFrame>, field: string) =>
    onChange(
      {
        ...settings,
        [part]: frames.map((value, i) => (i === index ? { ...value, ...patch } : value)),
      },
      `${part}:${index}:${field}`,
    );
  return (
    <details className="spectral-editor">
      <summary>Spectral frames</summary>
      <div className="spectral-fields">
        <label>
          Contour stage
          <select
            value={part}
            onChange={(e) => {
              setPart(e.currentTarget.value === 'released' ? 'released' : 'held');
              setSelection(1);
            }}
          >
            <option value="held">While key is held</option>
            <option value="released">After note-off</option>
          </select>
        </label>
        <label>
          Frame
          <select value={index} onChange={(e) => setSelection(Number(e.currentTarget.value))}>
            {frames.map(({ time }, i) => (
              <option value={i} key={i}>
                {i + 1} · {part === 'held' ? `${time.toFixed(3)} s` : `${(time * 100).toFixed(1)}%`}
              </option>
            ))}
          </select>
        </label>
        {index > 0 && !terminal && (
          <DraftNumber
            key={`${part}:${index}:time`}
            label={part === 'held' ? 'Frame time (s)' : 'Release position (0–1)'}
            value={frame.time}
            min={frames[index - 1].time + 0.000001}
            max={(frames[index + 1]?.time ?? 8) - (frames[index + 1] ? 0.000001 : 0)}
            onChange={(time) => change({ time }, 'time')}
          />
        )}
      </div>
      {terminal ? (
        <p className="footnote">The final release frame is silent.</p>
      ) : (
        <div key={`${part}:${index}`}>
          <div className="spectral-fields">
            {SPECTRAL_NOISE_BANDS.map((label, i) => (
              <DraftNumber
                key={label}
                label={label}
                value={frame.noise[i]}
                min={0}
                max={1}
                onChange={(value) =>
                  change({ noise: frame.noise.map((n, k) => (i === k ? value : n)) }, label)
                }
              />
            ))}
          </div>
          {settings.ratios.length > 0 && (
            <details>
              <summary>Tonal components</summary>
              <p className="footnote">
                Cosine and sine together set each tone’s amplitude and phase. Frequencies below use
                the {settings.referenceHz.toFixed(2)} Hz reference.
              </p>
              {settings.ratios.map((ratio, i) => (
                <div key={ratio} className="spectral-fields">
                  <span>
                    {Number.isInteger(ratio) && ratio <= 32 ? `H${ratio}` : 'Resonance'} ·{' '}
                    {(ratio * settings.referenceHz).toFixed(1)} Hz
                  </span>
                  {['cosine', 'sine'].map((axis, q) => {
                    const lane = 2 * i + q;
                    return (
                      <DraftNumber
                        key={axis}
                        label={`Tone ${i + 1} ${axis}`}
                        value={frame.tones[lane]}
                        min={-1}
                        max={1}
                        onChange={(value) =>
                          change(
                            { tones: frame.tones.map((n, k) => (k === lane ? value : n)) },
                            `tone:${lane}`,
                          )
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </details>
  );
}
