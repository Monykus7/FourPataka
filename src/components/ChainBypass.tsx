import type { ChainInstance } from '../core/pedals';
export default function ChainBypass({
  name,
  chain,
  onChange,
  onEdit,
}: {
  name: string;
  chain: ChainInstance;
  onChange: (chain: ChainInstance) => void;
  onEdit: () => void;
}) {
  return (
    <div className="track-chain-controls">
      <span>
        {name} · {chain.pedals.map((p) => p.kind).join(' → ') || 'Clean chain'}
      </span>
      <label>
        <input
          type="checkbox"
          aria-label={`Bypass ${name} pedals`}
          checked={chain.bypassed}
          onChange={(e) => onChange({ ...chain, bypassed: e.target.checked })}
        />
        Bypass chain
      </label>
      {chain.pedals.map((pedal, i) => (
        <label key={pedal.id}>
          <input
            type="checkbox"
            aria-label={`Bypass ${name} ${pedal.kind} ${i + 1}`}
            checked={pedal.bypassed}
            onChange={(e) =>
              onChange({
                ...chain,
                pedals: chain.pedals.map((p) =>
                  p.id === pedal.id ? { ...p, bypassed: e.target.checked } : p,
                ),
              })
            }
          />
          {pedal.kind} {i + 1}
        </label>
      ))}
      <button className="text-button" onClick={onEdit}>
        Edit pedals
      </button>
    </div>
  );
}
