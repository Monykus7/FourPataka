import { expect, it } from 'vitest';
import {
  boardLayout,
  boardRoute,
  connectCable,
  validateBoard,
  freeBoardCell,
} from '../../src/core/board';
import {
  emptyChain,
  makePedal,
  chainTopology,
  chainMusicalSettings,
  defaultProcessing,
  importProcessing,
} from '../../src/core/pedals';
it('migrates old chains without changing their signal order and keeps copies independent', () => {
  const chain = { ...emptyChain(), pedals: [makePedal('eq'), makePedal('overdrive')] };
  const board = boardLayout(chain);
  expect(boardRoute({ ...chain, board }).pedals).toEqual(chain.pedals);
  expect(chainTopology({ ...chain, board })).toBe(chainTopology(chain));
  const p = defaultProcessing();
  p.audition.A = { ...chain, board };
  p.library.push({ id: 'board', label: 'Board', chain: { ...chain, board } });
  const imported = importProcessing(p);
  imported.audition.A.board!.positions[chain.pedals[0].id].row = 1;
  expect(p.audition.A.board!.positions[chain.pedals[0].id].row).toBe(0);
  expect(imported.library.at(-1)!.chain.board).toEqual(board);
});
it('cables determine processing order while placement and disconnected pedals do not', () => {
  const chain = { ...emptyChain(), pedals: [makePedal('eq'), makePedal('overdrive')] };
  const [a, b] = chain.pedals;
  chain.board = {
    positions: boardLayout(chain).positions,
    cables: [
      { id: '1', from: null, to: b.id },
      { id: '2', from: b.id, to: a.id },
      { id: '3', from: a.id, to: null },
    ],
  };
  expect(boardRoute(chain).pedals.map((p) => p.id)).toEqual([b.id, a.id]);
  const topology = chainTopology(chain),
    settings = chainMusicalSettings(chain);
  chain.board.positions[a.id] = { column: 3, row: 1 };
  expect(chainTopology(chain)).toBe(topology);
  expect(chainMusicalSettings(chain)).toBe(settings);
  chain.board.cables = [{ id: 'direct', from: null, to: null }];
  expect(boardRoute(chain)).toEqual({ connected: true, pedals: [] });
  chain.board.cables = [];
  expect(boardRoute(chain)).toEqual({ connected: false, pedals: [] });
  expect(freeBoardCell(chain)).toEqual({ row: 0, column: 0 });
});
it('rewires occupied jacks and rejects dangling endpoints, duplicate slots and all cycles', () => {
  const chain = { ...emptyChain(), pedals: [makePedal('eq'), makePedal('compressor')] };
  const [a, b] = chain.pedals;
  chain.board = connectCable(chain, null, b.id);
  expect(chain.board.cables.some((c) => c.from === null && c.to === a.id)).toBe(false);
  const invalid = structuredClone(chain.board);
  invalid.cables.push({ id: 'loop', from: b.id, to: b.id });
  expect(() => validateBoard(invalid, [a.id, b.id])).toThrow();
  invalid.cables = [
    { id: 'a', from: a.id, to: b.id },
    { id: 'b', from: b.id, to: a.id },
  ];
  expect(() => validateBoard(invalid, [a.id, b.id])).toThrow(/feedback/);
  invalid.cables = [{ id: 'gone', from: 'missing', to: null }];
  expect(() => validateBoard(invalid, [a.id, b.id])).toThrow();
  invalid.cables = [];
  invalid.positions[b.id] = invalid.positions[a.id];
  expect(() => validateBoard(invalid, [a.id, b.id])).toThrow(/slot/);
});
