import RotaryDial from './RotaryDial';
import { EQ_DEFAULTS, PEDAL_CONTROLS, PEDAL_NAMES, type Pedal } from '../core/pedals';

export const pedalParameterLabel = (kind: Pedal['kind'], key: string) =>
  kind === 'eq'
    ? ({ low: 'low gain', mid: 'mid gain', high: 'high gain', frequency: 'mid frequency' }[key] ??
      key)
    : key;
export type ParameterChange = (id: string, key: string, value: number, group?: string) => void;

export function SmallPedalDials({
  pedal,
  index,
  onChange,
}: {
  pedal: Pedal;
  index: number;
  onChange: ParameterChange;
}) {
  return (
    <div className="small-pedal-dials">
      {Object.entries(PEDAL_CONTROLS[pedal.kind]).map(([key, [min, max, step, unit]]) => (
        <div key={key} className="small-dial-control">
          <RotaryDial
            label={`${pedal.kind} ${index + 1} ${pedalParameterLabel(pedal.kind, key)}`}
            value={pedal.params[key]}
            min={min}
            max={max}
            step={step}
            unit={unit}
            onChange={(value, group) => onChange(pedal.id, key, value, group)}
          />
          <span>{key === 'frequency' ? 'mid Hz' : key}</span>
        </div>
      ))}
    </div>
  );
}

export default function PedalControls({
  pedal,
  index,
  onChange,
  onReplace,
  onRemove,
  tailActive,
}: {
  pedal: Pedal | undefined;
  index: number;
  onChange: ParameterChange;
  onReplace: (pedal: Pedal) => void;
  onRemove: () => void;
  tailActive: boolean;
}) {
  return (
    <section
      className={`board-inspector ${pedal?.kind ?? ''}`}
      aria-label="Selected pedal controls"
    >
      <span className="eyebrow">SELECTED PEDAL</span>
      <h3>{pedal ? PEDAL_NAMES[pedal.kind] : 'No pedal selected'}</h3>
      {pedal ? (
        <>
          <div className="pedal-parameters">
            {Object.entries(PEDAL_CONTROLS[pedal.kind]).map(([key, [min, max, step, unit]]) => {
              const label = pedalParameterLabel(pedal.kind, key),
                controlName = `${pedal.kind} ${index + 1} ${label}`;
              return (
                <label key={key} className="range-control">
                  <span className="range-title">
                    {label}
                    <span className="numeric-value">
                      <input
                        type="number"
                        aria-label={`${controlName} exact value`}
                        min={min}
                        max={max}
                        step={step}
                        value={pedal.params[key]}
                        onChange={(e) => {
                          if (e.target.value !== '' && Number.isFinite(Number(e.target.value)))
                            onChange(
                              pedal.id,
                              key,
                              Math.min(max, Math.max(min, Number(e.target.value))),
                            );
                        }}
                      />
                      {unit}
                    </span>
                  </span>
                  <input
                    type="range"
                    aria-label={controlName}
                    min={min}
                    max={max}
                    step={step}
                    value={pedal.params[key]}
                    onChange={(e) => onChange(pedal.id, key, Number(e.target.value))}
                  />
                </label>
              );
            })}
          </div>
          {pedal.kind === 'eq' && (
            <>
              <p className="eq-shape">Shelves 200 Hz / 4 kHz · mid Q 1</p>
              <button
                className="secondary-button"
                aria-label={`Reset EQ ${index + 1} to flat`}
                onClick={() => onReplace({ ...pedal, params: { ...EQ_DEFAULTS } })}
              >
                Reset to flat
              </button>
            </>
          )}
          {pedal.kind === 'delay' && (
            <p className="delay-note">
              {tailActive
                ? 'Tail active · stored echoes are finishing.'
                : 'Bypass stops new echoes; existing echoes finish. Stop clears them.'}
            </p>
          )}
          <button
            className="text-button"
            aria-label={`Remove ${pedal.kind} ${index + 1}`}
            onClick={onRemove}
          >
            Remove pedal
          </button>
        </>
      ) : (
        <p className="footnote">
          Choose equipment, place a pedal, then select it to adjust exact values.
        </p>
      )}
    </section>
  );
}
