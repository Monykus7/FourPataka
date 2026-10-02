import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Cable, GripVertical, Power } from 'lucide-react';
import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  boardLayout,
  boardRoute,
  connectCable,
  type BoardCell,
} from '../core/board';
import { makePedal, PEDAL_NAMES, type ChainInstance, type PedalKind } from '../core/pedals';
import { SmallPedalDials, type ParameterChange } from './PedalControls';

const CELL_WIDTH = 160,
  CELL_HEIGHT = 236,
  ORIGIN_X = 92,
  ORIGIN_Y = 32;
const WIDTH = 824,
  HEIGHT = 536,
  PEDAL_WIDTH = 148,
  PEDAL_HEIGHT = 212;
interface Point {
  x: number;
  y: number;
}
interface Moving {
  id: string;
  pointer: number;
  startX: number;
  startY: number;
  original: BoardCell;
  cell: BoardCell;
}
const curve = (a: Point, b: Point) => {
  const bend = Math.max(50, Math.abs(a.x - b.x) * 0.4);
  return `M${a.x} ${a.y} C${a.x + bend} ${a.y + 48} ${b.x - bend} ${b.y + 48} ${b.x} ${b.y}`;
};

export default function PedalBoardSurface({
  chain,
  selected,
  onSelect,
  onChange,
  onParameter,
}: {
  chain: ChainInstance;
  selected: string | undefined;
  onSelect: (id: string) => void;
  onChange: (chain: ChainInstance) => void;
  onParameter: ParameterChange;
}) {
  const canvas = useRef<HTMLDivElement>(null),
    move = useRef<Moving | null>(null),
    suppressClick = useRef(false);
  const [moving, setMoving] = useState<Moving | null>(null),
    [menu, setMenu] = useState(false),
    [tool, setTool] = useState<PedalKind | 'cable' | null>(null);
  const [pendingDraft, setDraft] = useState<{ from: string | null; point: Point } | null>(null),
    [selectedCable, setSelectedCable] = useState<string | null>(null),
    [notice, setNotice] = useState('');
  const board = boardLayout(chain),
    route = boardRoute(chain);
  // Undo, preset loading and removal can invalidate a gesture before the next pointer event.
  const draft =
    pendingDraft && (pendingDraft.from === null || board.positions[pendingDraft.from])
      ? pendingDraft
      : null;
  const cableSelected = board.cables.some((c) => c.id === selectedCable);
  useEffect(() => {
    if (pendingDraft && pendingDraft.from !== null && !board.positions[pendingDraft.from])
      setDraft(null);
    if (move.current && !board.positions[move.current.id]) {
      move.current = null;
      setMoving(null);
    }
    if (selectedCable && !cableSelected) setSelectedCable(null);
  }, [chain, pendingDraft, selectedCable, cableSelected]);
  const location = (cell: BoardCell) => ({
    x: ORIGIN_X + cell.column * CELL_WIDTH,
    y: ORIGIN_Y + cell.row * CELL_HEIGHT,
  });
  const point = (id: string | null, output: boolean): Point =>
    id === null
      ? { x: output ? 40 : WIDTH - 40, y: HEIGHT / 2 }
      : {
          x:
            location(moving?.id === id ? moving.cell : board.positions[id]).x +
            (output ? PEDAL_WIDTH : 0),
          y: location(moving?.id === id ? moving.cell : board.positions[id]).y + 96,
        };
  const title = (id: string | null, output: boolean) =>
    id === null
      ? output
        ? 'Board input'
        : 'Board output'
      : `${PEDAL_NAMES[chain.pedals.find((p) => p.id === id)!.kind]} ${chain.pedals.findIndex((p) => p.id === id) + 1}`;
  const relative = (x: number, y: number) => {
    const box = canvas.current!.getBoundingClientRect();
    return { x: x - box.left, y: y - box.top };
  };
  const occupied = (cell: BoardCell, except?: string) =>
    Object.entries(board.positions).some(
      ([id, p]) => id !== except && p.column === cell.column && p.row === cell.row,
    );
  const place = (kind: PedalKind, cell: BoardCell) => {
    if (occupied(cell) || chain.pedals.length >= 8) return;
    const pedal = makePedal(kind);
    onChange({
      ...chain,
      pedals: [...chain.pedals, pedal],
      board: { ...board, positions: { ...board.positions, [pedal.id]: cell } },
    });
    onSelect(pedal.id);
    setTool(null);
    setNotice('Pedal placed. Choose a patch cable to connect its jacks.');
  };
  const patch = (to: string | null) => {
    if (!draft) return false;
    try {
      onChange({ ...chain, board: connectCable(chain, draft.from, to) });
      setDraft(null);
      setSelectedCable(null);
      setNotice('Cable connected. Occupied jacks were repatched.');
      return true;
    } catch (error) {
      setNotice((error as Error).message);
      return false;
    }
  };
  const finishMove = (event: PointerEvent<HTMLButtonElement>, cancel = false) => {
    const current = move.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (
      !cancel &&
      !occupied(current.cell, current.id) &&
      (current.cell.column !== current.original.column || current.cell.row !== current.original.row)
    )
      onChange({
        ...chain,
        board: { ...board, positions: { ...board.positions, [current.id]: current.cell } },
      });
    if (!cancel && occupied(current.cell, current.id))
      setNotice('That slot already holds a pedal.');
    move.current = null;
    setMoving(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const jack = (id: string | null, output: boolean, label: string) => (
    <button
      type="button"
      className={`board-jack ${output ? 'jack-out' : 'jack-in'} ${draft && draft.from === id && output ? 'patch-start' : ''}`}
      data-port={output ? 'out' : 'in'}
      data-owner={id ?? ''}
      aria-label={label}
      title={output ? 'Start a cable' : 'Finish a cable'}
      onPointerDown={
        output
          ? (e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setTool('cable');
              setDraft({ from: id, point: relative(e.clientX, e.clientY) });
            }
          : undefined
      }
      onPointerUp={
        output
          ? (e) => {
              const target = document
                .elementFromPoint(e.clientX, e.clientY)
                ?.closest<HTMLButtonElement>('[data-port="in"]');
              if (target && canvas.current?.contains(target)) {
                suppressClick.current = patch(target.dataset.owner || null);
              }
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
          : undefined
      }
      onPointerCancel={() => setDraft(null)}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        if (output) {
          setTool('cable');
          setDraft({ from: id, point: point(id, true) });
        } else patch(id);
      }}
    />
  );
  return (
    <div
      className="physical-board-editor"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          // Movement is a preview until release; canceling must never create a history entry.
          move.current = null;
          setMoving(null);
          setTool(null);
          setDraft(null);
          setMenu(false);
          setSelectedCable(null);
          setNotice('');
        }
      }}
    >
      <div className="board-tools">
        <div className="equipment-picker">
          <button
            className="secondary-button"
            aria-expanded={menu}
            aria-haspopup="menu"
            onClick={() => setMenu(!menu)}
          >
            Equipment
          </button>
          {menu && (
            <div className="equipment-menu" role="menu" aria-label="Equipment">
              {(['compressor', 'overdrive', 'eq'] as const).map((kind) => (
                <button
                  key={kind}
                  role="menuitem"
                  draggable
                  disabled={chain.pedals.length >= 8}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-fourpataka-pedal', kind);
                    e.dataTransfer.effectAllowed = 'copy';
                    setTool(kind);
                  }}
                  onClick={() => {
                    setTool(kind);
                    setMenu(false);
                    setDraft(null);
                  }}
                >
                  {PEDAL_NAMES[kind]}
                </button>
              ))}
              <button
                role="menuitem"
                onClick={() => {
                  setTool('cable');
                  setMenu(false);
                }}
              >
                <Cable size={14} />
                Patch cable
              </button>
            </div>
          )}
        </div>
        <span>
          {tool === 'cable'
            ? 'Output jack → input jack'
            : tool
              ? `Place ${PEDAL_NAMES[tool]}`
              : 'Choose equipment · drag handles to move'}
        </span>
        {tool && (
          <button
            className="text-button"
            onClick={() => {
              setTool(null);
              setDraft(null);
            }}
          >
            Cancel tool
          </button>
        )}
        <span className={`board-route-status ${route.connected ? '' : 'unpatched'}`}>
          {chain.bypassed
            ? 'Board bypassed'
            : route.connected
              ? `${route.pedals.length} in signal path`
              : 'Output unplugged'}
        </span>
      </div>
      <div className="pedal-rack-scroll" role="region" tabIndex={0} aria-label="Grid pedalboard">
        <div
          ref={canvas}
          className={`physical-board ${tool ? 'tool-active' : ''} ${tool && tool !== 'cable' ? 'placing-pedal' : ''}`}
          style={{ width: WIDTH, height: HEIGHT }}
          onPointerMove={(e) => {
            if (draft) setDraft({ ...draft, point: relative(e.clientX, e.clientY) });
          }}
        >
          <span className="velcro-strip strip-top" aria-hidden="true" />
          <span className="velcro-strip strip-bottom" aria-hidden="true" />
          {Array.from({ length: BOARD_COLUMNS * BOARD_ROWS }, (_, i) => {
            const cell = { column: i % BOARD_COLUMNS, row: Math.floor(i / BOARD_COLUMNS) },
              at = location(cell);
            return (
              <button
                key={i}
                className="board-slot"
                aria-label={`Place pedal row ${cell.row + 1} column ${cell.column + 1}`}
                style={{ left: at.x, top: at.y, width: PEDAL_WIDTH, height: PEDAL_HEIGHT }}
                disabled={occupied(cell)}
                onClick={() => {
                  if (tool && tool !== 'cable') place(tool, cell);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const kind = e.dataTransfer.getData('application/x-fourpataka-pedal');
                  if (kind === 'compressor' || kind === 'overdrive' || kind === 'eq')
                    place(kind, cell);
                  setMenu(false);
                }}
              >
                <span>
                  {cell.row + 1}.{cell.column + 1}
                </span>
              </button>
            );
          })}
          <svg className="board-cables" width={WIDTH} height={HEIGHT} aria-label="Patch cables">
            {board.cables.map((c) => (
              <g
                className={`board-cable ${selectedCable === c.id ? 'selected' : ''}`}
                key={c.id}
                role="button"
                tabIndex={0}
                aria-label={`Select cable from ${title(c.from, true)} to ${title(c.to, false)}`}
                onClick={() => setSelectedCable(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCable(c.id);
                  }
                }}
              >
                <path className="cable-hit" d={curve(point(c.from, true), point(c.to, false))} />
                <path className="cable-sheath" d={curve(point(c.from, true), point(c.to, false))} />
                <path className="cable-wire" d={curve(point(c.from, true), point(c.to, false))} />
              </g>
            ))}
            {draft && (
              <path className="draft-cable" d={curve(point(draft.from, true), draft.point)} />
            )}
          </svg>
          <div className="board-terminal terminal-input" style={{ left: 10, top: HEIGHT / 2 - 20 }}>
            <span>INPUT</span>
            {jack(null, true, 'Board input output jack')}
          </div>
          <div
            className="board-terminal terminal-output"
            style={{ right: 10, top: HEIGHT / 2 - 20 }}
          >
            <span>OUTPUT</span>
            {jack(null, false, 'Board output input jack')}
          </div>
          {chain.pedals.map((pedal, index) => {
            const cell = moving?.id === pedal.id ? moving.cell : board.positions[pedal.id],
              at = location(cell),
              order = route.pedals.findIndex((p) => p.id === pedal.id);
            return (
              <article
                key={pedal.id}
                className={`pedal-module compact-pedal ${pedal.kind} ${selected === pedal.id ? 'selected' : ''} ${pedal.bypassed ? 'bypassed' : ''} ${moving?.id === pedal.id ? 'moving' : ''}`}
                style={{ left: at.x, top: at.y, width: PEDAL_WIDTH, height: PEDAL_HEIGHT }}
                data-pedal-id={pedal.id}
                onClick={() => onSelect(pedal.id)}
                onFocusCapture={() => onSelect(pedal.id)}
              >
                <button
                  className="pedal-grip"
                  aria-label={`Move ${pedal.kind} ${index + 1} on board`}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    onSelect(pedal.id);
                    const current = {
                      id: pedal.id,
                      pointer: e.pointerId,
                      startX: e.clientX,
                      startY: e.clientY,
                      original: board.positions[pedal.id],
                      cell: board.positions[pedal.id],
                    };
                    move.current = current;
                    setMoving(current);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const current = move.current;
                    if (!current || current.pointer !== e.pointerId) return;
                    current.cell = {
                      column: Math.min(
                        BOARD_COLUMNS - 1,
                        Math.max(
                          0,
                          current.original.column +
                            Math.round((e.clientX - current.startX) / CELL_WIDTH),
                        ),
                      ),
                      row: Math.min(
                        BOARD_ROWS - 1,
                        Math.max(
                          0,
                          current.original.row +
                            Math.round((e.clientY - current.startY) / CELL_HEIGHT),
                        ),
                      ),
                    };
                    setMoving({ ...current });
                  }}
                  onPointerUp={(e) => finishMove(e)}
                  onPointerCancel={(e) => finishMove(e, true)}
                  onLostPointerCapture={(e) => finishMove(e, true)}
                  onKeyDown={(e) => {
                    const delta = {
                      ArrowLeft: [-1, 0],
                      ArrowRight: [1, 0],
                      ArrowUp: [0, -1],
                      ArrowDown: [0, 1],
                    }[e.key];
                    if (!delta) return;
                    e.preventDefault();
                    const next = { column: cell.column + delta[0], row: cell.row + delta[1] };
                    if (
                      next.column >= 0 &&
                      next.column < BOARD_COLUMNS &&
                      next.row >= 0 &&
                      next.row < BOARD_ROWS &&
                      !occupied(next, pedal.id)
                    )
                      onChange({
                        ...chain,
                        board: { ...board, positions: { ...board.positions, [pedal.id]: next } },
                      });
                  }}
                >
                  <GripVertical size={13} />
                  <span>
                    {index + 1} · {order < 0 ? 'UNPATCHED' : `PATH ${order + 1}`}
                  </span>
                </button>
                <strong className="compact-pedal-title">{PEDAL_NAMES[pedal.kind]}</strong>
                {jack(pedal.id, false, `${pedal.kind} ${index + 1} input jack`)}
                {jack(pedal.id, true, `${pedal.kind} ${index + 1} output jack`)}
                <SmallPedalDials pedal={pedal} index={index} onChange={onParameter} />
                <label className="compact-foot-switch">
                  <input
                    type="checkbox"
                    aria-label={`Bypass ${pedal.kind} ${index + 1}`}
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
                  <Power size={14} />
                  <span>{pedal.bypassed || chain.bypassed ? 'Bypassed' : 'Engaged'}</span>
                </label>
              </article>
            );
          })}
        </div>
      </div>
      <div className="board-footer">
        <span role="status">
          {notice || 'Velcro grid · 4 × 2 · arrow keys move a focused handle'}
        </span>
        {cableSelected && (
          <button
            className="text-button"
            onClick={() => {
              onChange({
                ...chain,
                board: { ...board, cables: board.cables.filter((c) => c.id !== selectedCable) },
              });
              setSelectedCable(null);
            }}
          >
            Disconnect cable
          </button>
        )}
      </div>
    </div>
  );
}
