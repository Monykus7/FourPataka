import { useState } from 'react';
import PedalBoardSurface from './PedalBoardSurface';
import PedalControls from './PedalControls';
import { boardLayout } from '../core/board';
import {
  applyAssociated,
  emptyChain,
  PEDAL_CONTROLS,
  type ChainInstance,
  type Processing,
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
  const [selection, setSelection] = useState<string>();
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
  const selected = chain.pedals.find((p) => p.id === selection) ?? chain.pedals[0];
  const parameter = (id: string, key: string, value: number, group?: string) => {
    const pedal = chain.pedals.find((p) => p.id === id)!;
    const [min, max] = (
      PEDAL_CONTROLS[pedal.kind] as Record<string, readonly [number, number, number, string]>
    )[key];
    edit(
      {
        ...chain,
        pedals: chain.pedals.map((p) =>
          p.id === id
            ? { ...p, params: { ...p.params, [key]: Math.min(max, Math.max(min, value)) } }
            : p,
        ),
      },
      group ?? `pedal:${dest}:${active}:${id}:${key}`,
    );
  };
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
      </div>
      {pending && (
        <p className="pedal-pending" role="status">
          Processing edits pending · next Play / replay applies cable routing and score parameters.
        </p>
      )}
      <div className="board-workspace">
        <PedalBoardSurface
          key={`${dest}:${active}`}
          chain={chain}
          selected={selected?.id}
          onSelect={setSelection}
          onChange={edit}
          onParameter={parameter}
        />
        <PedalControls
          pedal={selected}
          index={chain.pedals.findIndex((p) => p.id === selected?.id)}
          onChange={parameter}
          onReplace={(pedal) =>
            edit({ ...chain, pedals: chain.pedals.map((p) => (p.id === pedal.id ? pedal : p)) })
          }
          onRemove={() => {
            if (!selected) return;
            const board = structuredClone(boardLayout(chain));
            delete board.positions[selected.id];
            board.cables = board.cables.filter(
              (c) => c.from !== selected.id && c.to !== selected.id,
            );
            edit({ ...chain, board, pedals: chain.pedals.filter((p) => p.id !== selected.id) });
            setSelection(undefined);
          }}
        />
      </div>
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
                      chain: {
                        pedals: structuredClone(chain.pedals),
                        bypassed: chain.bypassed,
                        ...(chain.board ? { board: structuredClone(chain.board) } : {}),
                      },
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
                  chain: {
                    pedals: structuredClone(chain.pedals),
                    bypassed: chain.bypassed,
                    ...(chain.board ? { board: structuredClone(chain.board) } : {}),
                  },
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
