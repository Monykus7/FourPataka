import { Fragment, useState } from 'react';
import { ArrowRight, Layers3, Power, Waves } from 'lucide-react';
import SignalCable from './SignalCable';
import RotaryDial from './RotaryDial';
import {
  applyAssociated,
  emptyChain,
  makePedal,
  PEDAL_CONTROLS,
  PEDAL_NAMES,
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
  playing,
  onCopy,
  onReplay,
}: {
  processing: Processing;
  trackKeys: string[];
  active: 'A' | 'B';
  destination: string;
  onDestination: (destination: string) => void;
  onChange: (processing: Processing, group?: string) => void;
  pending: boolean;
  playing: boolean;
  onCopy: (from: 'A' | 'B', to: 'A' | 'B') => void;
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
  const pedalName = (index: number) => `${PEDAL_NAMES[chain.pedals[index].kind]} ${index + 1}`;
  const source =
    dest === 'master'
      ? 'Track mix'
      : dest === 'audition'
        ? `Instrument ${active}`
        : `${dest.slice(6)} instrument`;
  const output = dest.startsWith('track:') ? 'Track level' : 'Project mix';
  return (
    <section
      className={`panel pedalboard ${playing && !pending ? 'signal-live' : ''} ${chain.bypassed ? 'chain-bypassed' : ''}`}
      aria-label="Pedalboard"
    >
      <div className="section-title">
        <h3>Signal path</h3>
        <span className="tag">{name}</span>
      </div>
      {dest === 'audition' && (
        <div className="pedal-snapshots">
          <span>Audition {active}</span>
          <button className="text-button" onClick={() => onCopy('A', 'B')}>
            Copy A to B
          </button>
          <button className="text-button" onClick={() => onCopy('B', 'A')}>
            Copy B to A
          </button>
        </div>
      )}
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
        <button
          className="secondary-button"
          disabled={chain.pedals.length >= 8}
          onClick={() => add('eq')}
        >
          Add EQ
        </button>
      </div>
      {pending && (
        <p className="pedal-pending" role="status">
          Processing edits pending · next Play / replay applies order, additions and score
          parameters.
        </p>
      )}
      <div className="signal-path-status">
        <span className={`signal-status-dot ${playing ? 'live' : ''}`} />
        {playing ? (pending ? 'Playing previous chain' : 'Playing') : 'Ready'}
        <ArrowRight size={13} />
        {chain.bypassed
          ? 'Chain bypassed · signal passes through'
          : chain.pedals.length
            ? `${chain.pedals.length} pedals in series`
            : 'Clean path'}
        <span>{pending ? 'Edited connections · replay to hear' : 'Input → output'}</span>
      </div>
      <div
        className="pedal-rack-scroll"
        tabIndex={0}
        role="region"
        aria-label="Cable-connected pedal rack"
      >
        <div className="pedal-chain" role="list" aria-label={`${name} signal chain`}>
          <div className="signal-terminal" role="listitem" aria-label={`Signal input: ${source}`}>
            <span className="terminal-direction">INPUT</span>
            {dest === 'master' ? <Layers3 size={25} /> : <Waves size={25} />}
            <strong>{source}</strong>
            <span className="signal-jack output-jack" aria-hidden="true" />
            <small>{dest === 'master' ? 'All tracks' : 'Source waveform'}</small>
          </div>
          <SignalCable from={source} to={chain.pedals.length ? pedalName(0) : output} />
          {chain.pedals.map((pedal, i) => (
            <Fragment key={pedal.id}>
              <article
                className={`pedal-module ${pedal.kind} ${pedal.bypassed ? 'bypassed' : ''}`}
                role="listitem"
                key={pedal.id}
                data-pedal-id={pedal.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = chain.pedals.findIndex((p) => p.id === dragging);
                  if (from >= 0) move(from, i);
                  setDragging(null);
                }}
              >
                <span className="pedal-order">
                  {String(i + 1).padStart(2, '0')} ·{' '}
                  {pedal.kind === 'compressor'
                    ? 'DYNAMICS'
                    : pedal.kind === 'eq'
                      ? 'TONE'
                      : 'DRIVE'}
                </span>
                <span className="signal-jack input-jack" aria-hidden="true" />
                <span className="signal-jack output-jack" aria-hidden="true" />
                <span className="jack-label jack-in">IN</span>
                <span className="jack-label jack-out">OUT</span>
                <div className="pedal-header">
                  <strong
                    draggable
                    onDragStart={() => setDragging(pedal.id)}
                    onDragEnd={() => setDragging(null)}
                  >
                    {PEDAL_NAMES[pedal.kind]}
                  </strong>
                  <span
                    className={`pedal-led ${pedal.bypassed || chain.bypassed ? '' : 'engaged'}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="pedal-parameters">
                  {Object.entries(PEDAL_CONTROLS[pedal.kind]).map(
                    ([key, [min, max, step, unit]]) => {
                      const update = (value: number, group?: string) =>
                        edit(
                          {
                            ...chain,
                            pedals: chain.pedals.map((p) =>
                              p.id === pedal.id
                                ? {
                                    ...p,
                                    params: {
                                      ...p.params,
                                      [key]: Math.min(max, Math.max(min, value)),
                                    },
                                  }
                                : p,
                            ),
                          },
                          group ?? `pedal:${dest}:${active}:${pedal.id}:${key}`,
                        );
                      const parameterLabel =
                        pedal.kind === 'eq'
                          ? ({
                              low: 'low gain',
                              mid: 'mid gain',
                              high: 'high gain',
                              frequency: 'mid frequency',
                            }[key] ?? key)
                          : key;
                      const controlName = `${pedal.kind} ${i + 1} ${parameterLabel}`;
                      return (
                        <div key={key} className="range-control">
                          <RotaryDial
                            key={`${dest}:${active}:${pedal.id}:${key}`}
                            label={controlName}
                            value={pedal.params[key]}
                            min={min}
                            max={max}
                            step={step}
                            unit={unit}
                            onChange={update}
                          />
                          <span className="range-title">
                            {parameterLabel}
                            <span className="numeric-value">
                              <input
                                type="number"
                                aria-label={`${controlName} exact value`}
                                min={min}
                                max={max}
                                step={step}
                                value={pedal.params[key]}
                                onChange={(e) => {
                                  if (
                                    e.target.value !== '' &&
                                    Number.isFinite(Number(e.target.value))
                                  )
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
                        </div>
                      );
                    },
                  )}
                </div>
                {pedal.kind === 'eq' && (
                  <p className="eq-shape">Shelves 200 Hz / 4 kHz · mid Q 1</p>
                )}
                <label className="pedal-foot-switch">
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
                  <span className="foot-switch-face">
                    <Power size={18} />
                  </span>
                  <span>
                    {pedal.bypassed ? 'Bypassed' : chain.bypassed ? 'Chain bypassed' : 'Engaged'}
                  </span>
                </label>
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
              </article>
              <SignalCable
                from={pedalName(i)}
                to={i < chain.pedals.length - 1 ? pedalName(i + 1) : output}
              />
            </Fragment>
          ))}
          <div className="signal-terminal" role="listitem" aria-label={`Signal output: ${output}`}>
            <span className="terminal-direction">OUTPUT</span>
            <ArrowRight size={25} />
            <strong>{output}</strong>
            <span className="signal-jack input-jack" aria-hidden="true" />
            <small>{dest.startsWith('track:') ? 'Then master pedals' : 'Then monitor'}</small>
          </div>
        </div>
      </div>
      {!chain.pedals.length && (
        <p className="footnote">
          Add a pedal or load a chain preset. Connections follow the pedal order.
        </p>
      )}
      <div className="pedal-library-heading">
        <h3>Chain presets</h3>
        <span>Load · save · apply</span>
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
        <button className="secondary-button" onClick={onReplay}>
          {dest === 'audition' ? 'Listen to chain' : 'Play score through chain'}
        </button>
      </div>
      {!!associated.length && (
        <p className="footnote">Associated destinations: {associated.join(', ')}</p>
      )}
    </section>
  );
}
