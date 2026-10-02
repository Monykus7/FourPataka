import type { Chain, Pedal } from './pedals';

export const BOARD_COLUMNS = 4;
export const BOARD_ROWS = 2;
export interface BoardCell {
  column: number;
  row: number;
}
export interface PatchCable {
  id: string;
  from: string | null;
  to: string | null;
}
export interface BoardLayout {
  positions: Record<string, BoardCell>;
  cables: PatchCable[];
}

// Null is the input terminal on a cable's from side and the output terminal
// on its to side. Pedal IDs therefore never compete with terminal names.
export function boardLayout(chain: Chain): BoardLayout {
  if (chain.board) return chain.board;
  const ids = chain.pedals.map((p) => p.id);
  return {
    positions: Object.fromEntries(
      ids.map((id, i) => [id, { column: i % BOARD_COLUMNS, row: Math.floor(i / BOARD_COLUMNS) }]),
    ),
    cables: [null, ...ids].map((from, i) => ({
      id: `legacy-cable-${i}`,
      from,
      to: ids[i] ?? null,
    })),
  };
}

export function validateBoard(board: BoardLayout, pedalIds: string[]) {
  if (
    !board ||
    !board.positions ||
    typeof board.positions !== 'object' ||
    Array.isArray(board.positions) ||
    !Array.isArray(board.cables) ||
    board.cables.length > 9
  )
    throw new Error('Invalid pedal board.');
  const ids = new Set(pedalIds),
    cells = new Set<string>();
  if (Object.keys(board.positions).length !== ids.size) throw new Error('Missing pedal positions.');
  for (const [id, cell] of Object.entries(board.positions)) {
    if (
      !ids.has(id) ||
      !cell ||
      !Number.isInteger(cell.column) ||
      !Number.isInteger(cell.row) ||
      cell.column < 0 ||
      cell.column >= BOARD_COLUMNS ||
      cell.row < 0 ||
      cell.row >= BOARD_ROWS
    )
      throw new Error('Invalid pedal position.');
    const key = `${cell.column}:${cell.row}`;
    if (cells.has(key)) throw new Error('Pedals cannot share a slot.');
    cells.add(key);
  }
  const cableIds = new Set<string>(),
    outputs = new Set<string | null>(),
    inputs = new Set<string | null>();
  for (const cable of board.cables) {
    if (
      !cable ||
      typeof cable.id !== 'string' ||
      !cable.id ||
      cable.id.length > 100 ||
      cableIds.has(cable.id) ||
      (cable.from !== null && !ids.has(cable.from)) ||
      (cable.to !== null && !ids.has(cable.to)) ||
      outputs.has(cable.from) ||
      inputs.has(cable.to)
    )
      throw new Error('Invalid or occupied cable jack.');
    cableIds.add(cable.id);
    outputs.add(cable.from);
    inputs.add(cable.to);
  }
  // Check every component, including disconnected pedals: a feedback loop
  // must not become valid merely because the board input is currently unplugged.
  for (const start of ids) {
    const visited = new Set<string>();
    let current: string | null = start;
    while (current !== null) {
      if (visited.has(current)) throw new Error('Patch cables cannot form a feedback loop.');
      visited.add(current);
      current = board.cables.find((c) => c.from === current)?.to ?? null;
    }
  }
}

export function boardRoute(chain: Chain): { connected: boolean; pedals: Pedal[] } {
  if (!chain.board) return { connected: true, pedals: chain.pedals };
  const visited = new Set<string>(),
    pedals: Pedal[] = [];
  let current: string | null = null;
  for (let i = 0; i <= chain.pedals.length; i++) {
    const cable = chain.board.cables.find((c) => c.from === current);
    if (!cable) return { connected: false, pedals: [] };
    if (cable.to === null) return { connected: true, pedals };
    const pedal = chain.pedals.find((p) => p.id === cable.to);
    if (!pedal || visited.has(pedal.id)) return { connected: false, pedals: [] };
    visited.add(pedal.id);
    pedals.push(pedal);
    current = pedal.id;
  }
  return { connected: false, pedals: [] };
}

export function connectCable(chain: Chain, from: string | null, to: string | null): BoardLayout {
  const board = boardLayout(chain);
  const next = {
    ...board,
    cables: [
      ...board.cables.filter((c) => c.from !== from && c.to !== to),
      { id: crypto.randomUUID(), from, to },
    ],
  };
  validateBoard(
    next,
    chain.pedals.map((p) => p.id),
  );
  return next;
}
export const freeBoardCell = (chain: Chain) => {
  const positions = Object.values(boardLayout(chain).positions);
  for (let row = 0; row < BOARD_ROWS; row++)
    for (let column = 0; column < BOARD_COLUMNS; column++)
      if (!positions.some((p) => p.row === row && p.column === column)) return { row, column };
  return null;
};
