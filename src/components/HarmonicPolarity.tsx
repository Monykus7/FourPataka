import type { HarmonicPolarity as Polarity } from '../core/music';

interface Props {
  harmonic: string;
  value: number;
  onChange: (polarity: Polarity) => void;
  compact?: boolean;
}

export default function HarmonicPolarity({ harmonic, value, onChange, compact = false }: Props) {
  if (compact)
    return (
      <button
        className={`harmonic-sign ${value < 0 ? 'negative' : ''}`}
        aria-label={`${harmonic} inverted polarity`}
        aria-pressed={value < 0}
        title={`${harmonic}: ${value < 0 ? 'negative' : 'positive'}. Click to change sign.`}
        onClick={() => onChange(value < 0 ? 1 : -1)}
      >
        {value < 0 ? '−' : '+'}
      </button>
    );
  return (
    <label className="polarity-control">
      Sign
      <select
        aria-label={`${harmonic} polarity`}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as Polarity)}
      >
        <option value="1">+ Positive</option>
        <option value="-1">− Negative</option>
      </select>
    </label>
  );
}
