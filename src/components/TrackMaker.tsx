import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Music2, Plus, Trash2, X } from 'lucide-react';
import { DURATIONS } from '../core/music';
import { parseScore } from '../core/parser';
import { measureLength, measurePosition, meterLabel, type TimeSignature } from '../core/meter';
import type { InstrumentPreset } from '../core/project';
import type { ChainPreset } from '../core/pedals';

type Row = { id: number; kind: 'note' | 'chord' | 'rest'; notes: string; duration: string };
const expression = (row: Row) =>
  `${row.kind === 'rest' ? 'rest' : row.kind === 'chord' ? `chord:(${row.notes.trim()})` : row.notes.trim()} ${row.duration}`;
export default function TrackMaker({
  initialKey,
  instruments,
  chains,
  instrumentKey,
  meter,
  onCreate,
  onClose,
}: {
  initialKey: string;
  instruments: InstrumentPreset[];
  chains: ChainPreset[];
  instrumentKey: string;
  meter: TimeSignature;
  onCreate: (key: string, instrument: string, events: string[], chain: string | null) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [key, setKey] = useState(initialKey);
  const [instrument, setInstrument] = useState(instrumentKey);
  const [chainKey, setChainKey] = useState('');
  const [rows, setRows] = useState<Row[]>([
    { id: 1, kind: 'note', notes: 'C4', duration: 'quarter' },
    { id: 2, kind: 'note', notes: 'E4', duration: 'quarter' },
    { id: 3, kind: 'note', notes: 'G4', duration: 'half' },
  ]);
  const nextId = useRef(4);
  const [error, setError] = useState('');
  const text = `track ${key} using ${instrument}${chainKey ? ` through ${chainKey}` : ''} {\n${rows.map((row) => `  ${expression(row)}`).join('\n')}\n}`;
  const preview = parseScore(
    `time ${meterLabel(meter)}\n${text}`,
    instruments.map((i) => i.key),
    chains.map((p) => p.key),
  );
  const update = (id: number, patch: Partial<Row>) =>
    setRows((before) => before.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const move = (index: number, direction: number) =>
    setRows((before) => {
      const next = [...before];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const add = (kind: Row['kind']) =>
    setRows((before) => [
      ...before,
      {
        id: nextId.current++,
        kind,
        notes: kind === 'chord' ? 'Bb4 D5 F5' : 'C4',
        duration: 'quarter',
      },
    ]);
  return (
    <dialog ref={dialog} className="track-maker-dialog" onCancel={onClose} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onCreate(key.trim(), instrument, rows.map(expression), chainKey || null);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <div className="panel-header">
          <div>
            <h2>Make a track</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close track maker"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="maker-identity">
          <label>
            Track name
            <input
              aria-label="New track name"
              autoFocus
              required
              maxLength={100}
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </label>
          <label>
            Instrument
            <select
              aria-label="New track instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            >
              {instruments.map((i) => (
                <option key={i.id} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="track-instrument-choice">
          Pedal chain
          <select
            aria-label="New track pedal chain"
            value={chainKey}
            onChange={(e) => setChainKey(e.target.value)}
          >
            <option value="">No score assignment</option>
            {chains.map((p) => (
              <option key={p.id} value={p.key}>
                {p.label} · {p.key}
              </option>
            ))}
          </select>
        </label>
        <div className="maker-phrase-heading">
          <h3>Events</h3>
          <span>
            {(preview.beats / measureLength(meter)).toFixed(2)} bars in {meterLabel(meter)} ·{' '}
            {preview.beats} quarter beats
          </span>
        </div>
        <div className="maker-rows">
          {rows.map((row, index) => (
            <div className="maker-row" key={row.id}>
              <span
                className="maker-row-number"
                title={`Bar ${
                  measurePosition(
                    rows.slice(0, index).reduce((sum, r) => sum + DURATIONS[r.duration], 0),
                    meter,
                  ).bar
                } · beat ${
                  measurePosition(
                    rows.slice(0, index).reduce((sum, r) => sum + DURATIONS[r.duration], 0),
                    meter,
                  ).beat
                }`}
              >
                {index + 1}
              </span>
              <select
                aria-label={`Event ${index + 1} kind`}
                value={row.kind}
                onChange={(e) =>
                  update(row.id, {
                    kind: e.target.value as Row['kind'],
                    notes: e.target.value === 'chord' ? 'Bb4 D5 F5' : 'C4',
                  })
                }
              >
                <option value="note">Note</option>
                <option value="chord">Chord</option>
                <option value="rest">Rest</option>
              </select>
              {row.kind === 'rest' ? (
                <span className="rest-placeholder">Rest</span>
              ) : (
                <input
                  aria-label={`Event ${index + 1} pitches`}
                  value={row.notes}
                  onChange={(e) => update(row.id, { notes: e.target.value })}
                  placeholder={row.kind === 'chord' ? 'Bb4 D5 F5' : 'C4'}
                />
              )}
              <select
                aria-label={`Event ${index + 1} duration`}
                value={row.duration}
                onChange={(e) => update(row.id, { duration: e.target.value })}
              >
                {Object.keys(DURATIONS).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="maker-row-actions">
                <button
                  type="button"
                  className="icon-button"
                  disabled={index === 0}
                  aria-label={`Move event ${index + 1} up`}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={index === rows.length - 1}
                  aria-label={`Move event ${index + 1} down`}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove event ${index + 1}`}
                  onClick={() => setRows((before) => before.filter((r) => r.id !== row.id))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="maker-add-actions">
          <button type="button" className="secondary-button" onClick={() => add('note')}>
            <Plus size={13} />
            Note
          </button>
          <button type="button" className="secondary-button" onClick={() => add('chord')}>
            <Plus size={13} />
            Chord
          </button>
          <button type="button" className="secondary-button" onClick={() => add('rest')}>
            <Plus size={13} />
            Rest
          </button>
        </div>
        <div className="maker-preview">
          <span className="small-label">SCORE PREVIEW</span>
          <pre>{text}</pre>
        </div>
        {(error || preview.diagnostics.length > 0) && (
          <p className="form-error" role="alert">
            {error || preview.diagnostics[0].message}
          </p>
        )}
        <div className="maker-footer">
          <p className="footnote">
            C4 is middle C. Chords use explicit octaves. Adding this track is one undo step.
          </p>
          <button
            type="submit"
            className="primary-button"
            disabled={!rows.length || !!preview.diagnostics.length}
          >
            <Music2 size={15} />
            Add track
            <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </dialog>
  );
}
