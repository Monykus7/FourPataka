import { useEffect, useState } from 'react';
import { COMMON_METERS, meterLabel, type TimeSignature } from '../core/meter';

export default function CompositionSettings({
  tempo,
  meter,
  disabled,
  onApply,
}: {
  tempo: number;
  meter: TimeSignature;
  disabled: boolean;
  onApply: (tempo: string, meter: string) => void;
}) {
  const [bpm, setBpm] = useState(String(tempo));
  const [numerator, setNumerator] = useState(String(meter.numerator));
  const [denominator, setDenominator] = useState(String(meter.denominator));
  useEffect(() => {
    setBpm(String(tempo));
  }, [tempo]);
  useEffect(() => {
    setNumerator(String(meter.numerator));
    setDenominator(String(meter.denominator));
  }, [meter.numerator, meter.denominator]);
  const value = `${numerator}/${denominator}`;
  const dirty = bpm !== String(tempo) || value !== meterLabel(meter);
  return (
    <form
      className="composition-settings"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(bpm, value);
      }}
    >
      <fieldset disabled={disabled}>
        <label>
          Tempo{' '}
          <input
            aria-label="Composition tempo"
            type="number"
            min="20"
            max="300"
            step="any"
            required
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
          />
          <small>quarter-note BPM</small>
        </label>
        <label>
          Time signature{' '}
          <select
            aria-label="Time signature preset"
            value={COMMON_METERS.includes(value) ? value : 'custom'}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                const [n, d] = e.target.value.split('/');
                setNumerator(n);
                setDenominator(d);
              }
            }}
          >
            {COMMON_METERS.map((m) => (
              <option key={m}>{m}</option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        <label>
          Beats per bar{' '}
          <input
            aria-label="Beats per bar"
            type="number"
            min="1"
            max="32"
            step="1"
            required
            value={numerator}
            onChange={(e) => setNumerator(e.target.value)}
          />
        </label>
        <label>
          Beat unit{' '}
          <select
            aria-label="Beat unit"
            value={denominator}
            onChange={(e) => setDenominator(e.target.value)}
          >
            {[1, 2, 4, 8, 16].map((d) => (
              <option key={d} value={d}>
                1/{d}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-button" type="submit" disabled={!dirty}>
          Apply timing
        </button>
      </fieldset>
      <p className="footnote">
        {disabled
          ? 'Stop playback and fix diagnostics to apply timing.'
          : 'Updates the score in one undo step. Changing meter keeps note lengths unchanged.'}
      </p>
    </form>
  );
}
