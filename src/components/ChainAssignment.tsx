import type { ChainPreset } from '../core/pedals';

export default function ChainAssignment({
  name,
  value,
  presets,
  disabled,
  onChange,
}: {
  name: string;
  value: string | null;
  presets: ChainPreset[];
  disabled: boolean;
  onChange: (key: string | null) => void;
}) {
  return (
    <label className="track-instrument-choice">
      Pedal chain
      <select
        aria-label={`Pedal chain for ${name}`}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">No score assignment</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.key}>
            {preset.label} · {preset.key}
          </option>
        ))}
      </select>
    </label>
  );
}
