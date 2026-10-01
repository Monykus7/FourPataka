import { useState } from 'react';
import {
  applyAssociated,
  emptyChain,
  makePedal,
  PEDAL_CONTROLS,
  type ChainInstance,
  type Processing,
  type PedalKind,
} from '../core/pedals';

export default function Pedalboard({
  processing,
  trackKeys,
  active,
  destination,
  onDestination,
  onChange,
  pending,
  onReplay,
}: {
  processing: Processing;
  trackKeys: string[];
  active: 'A' | 'B';
  destination: string;
  onDestination: (destination: string) => void;
  onChange: (processing: Processing, group?: string) => void;
  pending: boolean;
  onReplay: () => void;
}) {
  const [presetId, setPresetId] = useState('clean');
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('master');
  const [dragging, setDragging] = useState<string | null>(null);
  const dest =
    destination.startsWith('track:') && !trackKeys.includes(destination.slice(6))
      ? 'audition'
      : destination;
  const chain =
    dest === 'audition'
      ? processing.audition[active]
      : dest === 'master'
        ? processing.master
        : (processing.tracks[dest.slice(6)] ?? emptyChain());
  const name =
    dest === 'audition'
      ? `Audition ${active}`
      : dest === 'master'
        ? 'Master'
        : `Track ${dest.slice(6)}`;
  const assign = (p: Processing, to: string, next: ChainInstance): Processing =>
    to === 'audition'
      ? { ...p, audition: { ...p.audition, [active]: next } }
      : to === 'master'
        ? { ...p, master: next }
        : { ...p, tracks: { ...p.tracks, [to.slice(6)]: next } };
  const edit = (next: ChainInstance, group?: string) =>
    onChange(assign(processing, dest, next), group);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= chain.pedals.length || from === to) return;
    const pedals = [...chain.pedals];
    const [pedal] = pedals.splice(from, 1);
    pedals.splice(to, 0, pedal);
    edit({ ...chain, pedals });
  };
  const add = (kind: PedalKind) => edit({ ...chain, pedals: [...chain.pedals, makePedal(kind)] });
  const associated = [
    ...Object.entries(processing.tracks)
      .filter(([, p]) => !!chain.presetId && p.presetId === chain.presetId)
      .map(([key]) => key),
    ...(chain.presetId && processing.master.presetId === chain.presetId ? ['master'] : []),
  ];
  const template = processing.library.find((p) => p.id === chain.presetId);
  const chosen = processing.library.find((p) => p.id === presetId) ?? processing.library[0];
  const applyTarget =
    target.startsWith('track:') && !trackKeys.includes(target.slice(6)) ? 'master' : target;
  return (
    <section className="panel pedalboard" aria-label="Pedalboard">
      <div className="section-title">
        <h3>Pedalboard</h3>
        <span className="tag">{name}</span>
      </div>
      <div className="pedal-toolbar">
        <label>
          Editing destination{' '}
          <select
            aria-label="Pedal editing destination"
            value={dest}
            onChange={(e) => onDestination(e.target.value)}
          >
            <option value="audition">Audition {active}</option>
            <option value="master">Master</option>
            {trackKeys.map((key) => (
              <option key={key} value={`track:${key}`}>
                Track {key}
              </option>
            ))}
          </select>
        </label>
        <label className="pedal-bypass">
          <input
            type="checkbox"
            aria-label={`Bypass ${name} chain`}
            checked={chain.bypassed}
            onChange={(e) => edit({ ...chain, bypassed: e.target.checked })}
          />
          Bypass chain
        </label>
        <button
          className="secondary-button"
          disabled={chain.pedals.length >= 8}
          onClick={() => add('compressor')}
        >
          Add compressor
        </button>
        <button
          className="secondary-button"
          disabled={chain.pedals.length >= 8}
          onClick={() => add('overdrive')}
        >
          Add overdrive
        </button>
      </div>
      {pending && (
        <p className="pedal-pending" role="status">
          Processing edits pending · next Play / replay applies order, additions and score
          parameters.
        </p>
      )}
      <div className="pedal-chain" role="list" aria-label={`${name} signal chain`}>
        {!chain.pedals.length && (
          <p className="footnote">Clean path · add a pedal or load a chain preset.</p>
        )}
        {chain.pedals.map((pedal, i) => (
          <article
            className={`pedal-module ${pedal.kind} ${pedal.bypassed ? 'bypassed' : ''}`}
            role="listitem"
            key={pedal.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = chain.pedals.findIndex((p) => p.id === dragging);
              if (from >= 0) move(from, i);
              setDragging(null);
            }}
          >
            <div className="pedal-header">
              <strong
                draggable
                onDragStart={() => setDragging(pedal.id)}
                onDragEnd={() => setDragging(null)}
              >
                {i + 1} → {pedal.kind === 'compressor' ? 'Compressor' : 'Overdrive'}
              </strong>
              <label>
                <input
                  type="checkbox"
                  aria-label={`Bypass ${pedal.kind} ${i + 1}`}
                  checked={pedal.bypassed}
                  onChange={(e) =>
                    edit({
                      ...chain,
                      pedals: chain.pedals.map((p) =>
                        p.id === pedal.id ? { ...p, bypassed: e.target.checked } : p,
                      ),
                    })
                  }
                />
                Bypass
              </label>
            </div>
            <div className="pedal-parameters">
              {Object.entries(PEDAL_CONTROLS[pedal.kind]).map(([key, [min, max, step, unit]]) => {
                const update = (value: number) =>
                  edit(
                    {
                      ...chain,
                      pedals: chain.pedals.map((p) =>
                        p.id === pedal.id
                          ? {
                              ...p,
                              params: { ...p.params, [key]: Math.min(max, Math.max(min, value)) },
                            }
                          : p,
                      ),
                    },
                    `pedal:${dest}:${active}:${pedal.id}:${key}`,
                  );
                const controlName = `${pedal.kind} ${i + 1} ${key}`;
                return (
                  <label key={key} className="range-control">
                    <span className="range-title">
                      {key}
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
                              update(Number(e.target.value));
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
                      onChange={(e) => update(Number(e.target.value))}
                    />
                  </label>
                );
              })}
            </div>
            <div className="pedal-actions">
              <button
                className="text-button"
                aria-label={`Move ${pedal.kind} ${i + 1} left`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                ← Move left
              </button>
              <button
                className="text-button"
                aria-label={`Move ${pedal.kind} ${i + 1} right`}
                disabled={i === chain.pedals.length - 1}
                onClick={() => move(i, i + 1)}
              >
                Move right →
              </button>
              <button
                className="text-button"
                aria-label={`Remove ${pedal.kind} ${i + 1}`}
                onClick={() =>
                  edit({ ...chain, pedals: chain.pedals.filter((p) => p.id !== pedal.id) })
                }
              >
                Remove
              </button>
            </div>
            <p className="footnote">
              {pedal.kind === 'compressor'
                ? '30 dB knee · aligned dry/wet · 1:1 unity path'
                : 'tanh soft clip · 4× oversampling · low-pass tone'}
            </p>
          </article>
        ))}
      </div>
      <div className="pedal-presets">
        <label>
          Chain preset{' '}
          <select
            aria-label="Pedal preset"
            value={chosen.id}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {processing.library.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          onClick={() => edit({ ...structuredClone(chosen.chain), presetId: chosen.id })}
        >
          Load chain preset
        </button>
        <button
          className="secondary-button"
          disabled={!template}
          onClick={() =>
            onChange({
              ...processing,
              library: processing.library.map((p) =>
                p.id === chain.presetId
                  ? {
                      ...p,
                      chain: { pedals: structuredClone(chain.pedals), bypassed: chain.bypassed },
                    }
                  : p,
              ),
            })
          }
        >
          Save chain preset
        </button>
        <input
          aria-label="New chain preset name"
          placeholder="New chain name"
          maxLength={100}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button
          className="secondary-button"
          disabled={!label.trim() || processing.library.length >= 128}
          onClick={() => {
            const id = crypto.randomUUID();
            const next = {
              ...processing,
              library: [
                ...processing.library,
                {
                  id,
                  label: label.trim(),
                  chain: { pedals: structuredClone(chain.pedals), bypassed: chain.bypassed },
                },
              ],
            };
            onChange(assign(next, dest, { ...chain, presetId: id }));
            setPresetId(id);
            setLabel('');
          }}
        >
          Save chain as new
        </button>
      </div>
      <p className="footnote">
        Associated preset: {template?.label ?? 'None'} · saving a preset keeps applied copies
        unchanged.
      </p>
      <div className="pedal-presets">
        <label>
          Apply to{' '}
          <select
            aria-label="Chain application destination"
            value={applyTarget}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="master">Master</option>
            {trackKeys.map((key) => (
              <option key={key} value={`track:${key}`}>
                Track {key}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary-button"
          onClick={() => onChange(assign(processing, applyTarget, structuredClone(chain)))}
        >
          Apply chain to destination
        </button>
        <button
          className="secondary-button"
          disabled={!associated.length}
          onClick={() => onChange(applyAssociated(processing, chain))}
        >
          Apply chain to all associated ({associated.length})
        </button>
        {dest === 'audition' && (
          <button className="secondary-button" onClick={onReplay}>
            Listen to chain
          </button>
        )}
      </div>
      {!!associated.length && (
        <p className="footnote">Associated destinations: {associated.join(', ')}</p>
      )}
    </section>
  );
}
