import { useState } from 'react';

export default function DraftNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step="any"
        value={draft ?? Number(value.toFixed(6))}
        onChange={(event) => {
          const { value, valueAsNumber } = event.currentTarget;
          setDraft(value);
          if (Number.isFinite(valueAsNumber) && valueAsNumber >= min && valueAsNumber <= max)
            onChange(valueAsNumber);
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
}
