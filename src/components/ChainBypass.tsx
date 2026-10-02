import { PEDAL_NAMES, type ChainInstance } from '../core/pedals';
import { boardRoute } from '../core/board';
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
  const route = boardRoute(chain);
  return (
    <div className="track-chain-controls">
      <span>
        {name} ·{' '}
        {route.connected
          ? route.pedals.map((p) => PEDAL_NAMES[p.kind]).join(' → ') || 'Clean chain'
          : 'Output unplugged'}
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
          {PEDAL_NAMES[pedal.kind]} {i + 1}
        </label>
      ))}
      <button className="text-button" onClick={onEdit}>
        Edit pedals
      </button>
    </div>
  );
}
