import { pedalModules } from '../modules/assembly';
import { defaultModuleSettings } from '../modules';
import RotaryDial from './RotaryDial';
import { PEDAL_CONTROLS, pedalName, type Pedal } from '../core/pedals';

export const pedalParameterLabel = (kind: Pedal['kind'], key: string) =>
  pedalModules.find(kind)?.parameters[key]?.label ?? key;
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
  if (pedal.unavailable) return <p role="status">Unavailable module</p>;
  return (
    <div
      className={`small-pedal-dials ${Object.keys(PEDAL_CONTROLS[pedal.kind] ?? {}).length > 6 ? 'many-controls' : ''}`}
    >
      {Object.entries(PEDAL_CONTROLS[pedal.kind] ?? {}).map(([key, [min, max, step, unit]]) => (
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
          <span>
            {key === 'frequency'
              ? pedalParameterLabel(pedal.kind, key).replace('frequency', 'Hz')
              : key}
          </span>
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
  if (pedal?.unavailable)
    return (
      <section className="board-inspector" aria-label="Selected pedal controls">
        <h3>Unavailable: {pedal.kind}</h3>
        <p role="status">
          {pedal.unavailable.reason} Settings are retained for recovery. Playback/export is blocked
          while this pedal is in the signal path.
        </p>
        <button
          className="text-button"
          aria-label={`Remove ${pedal.kind} ${index + 1}`}
          onClick={onRemove}
        >
          Remove pedal
        </button>
      </section>
    );
  return (
    <section
      className={`board-inspector ${pedal?.kind ?? ''}`}
      aria-label="Selected pedal controls"
    >
      <span className="eyebrow">SELECTED PEDAL</span>
      <h3>{pedal ? pedalName(pedal.kind) : 'No pedal selected'}</h3>
      {pedal ? (
        <>
          <div className="pedal-parameters">
            {Object.entries(PEDAL_CONTROLS[pedal.kind] ?? {}).map(
              ([key, [min, max, step, unit]]) => {
                const label = pedalParameterLabel(pedal.kind, key),
                  controlName = `${pedal.kind} ${index + 1} ${label}`,
                  choices = pedalModules.get(pedal.kind).parameters[key].choices;
                return (
                  <label key={key} className="range-control">
                    <span className="range-title">
                      {label}
                      <span className="numeric-value">
                        {choices ? (
                          <select
                            aria-label={`${controlName} exact value`}
                            value={pedal.params[key]}
                            onChange={(e) => onChange(pedal.id, key, Number(e.target.value))}
                          >
                            {choices.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
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
                        )}
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
              },
            )}
          </div>
          {pedalModules.find(pedal.kind)?.note && (
            <p className="eq-shape">
              {tailActive
                ? 'Tail active · stored echoes are finishing.'
                : pedalModules.get(pedal.kind).note}
            </p>
          )}
          {pedalModules.find(pedal.kind)?.reset && (
            <button
              className="secondary-button"
              aria-label={pedalModules
                .get(pedal.kind)
                .reset!.accessibleLabel.replace('{index}', String(index + 1))}
              onClick={() =>
                onReplace({ ...pedal, params: defaultModuleSettings(pedalModules.get(pedal.kind)) })
              }
            >
              {pedalModules.get(pedal.kind).reset!.label}
            </button>
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
