import { expect, it } from 'vitest';
import {
  applyAssociated,
  defaultProcessing,
  emptyChain,
  importProcessing,
  makePedal,
} from '../../src/core/pedals';
import { createProject, importProject } from '../../src/core/project';
it('migrates old projects to independent clean processing without changing sounds', () => {
  const old: any = createProject();
  delete old.processing;
  const next = importProject(JSON.stringify(old));
  expect(next.processing.audition.A.pedals).toEqual([]);
  expect(next.comparison).toEqual(old.comparison);
  expect(next.processing.tracks.melody).not.toBe(next.processing.tracks.bass);
});
it('applies associated copies without touching unrelated instances or library', () => {
  const p = defaultProcessing();
  const source = { presetId: 'warm-drive', pedals: [makePedal('overdrive')], bypassed: false };
  p.tracks = { melody: structuredClone(source), bass: emptyChain() };
  p.master = structuredClone(source);
  source.pedals[0].params.drive = 12;
  const next = applyAssociated(p, source);
  expect(next.tracks.melody.pedals[0].params.drive).toBe(12);
  expect(next.master.pedals[0].params.drive).toBe(12);
  expect(next.master).not.toBe(next.tracks.melody);
  expect(next.tracks.bass).toBe(p.tracks.bass);
  expect(next.library).toBe(p.library);
  expect(p.tracks.melody.pedals[0].params.drive).toBe(6);
});
it('validates chain ranges, unique IDs and library references on import', () => {
  const p = defaultProcessing();
  expect(importProcessing(p)).toEqual(p);
  p.master.pedals = [makePedal('compressor')];
  p.master.pedals[0].params.ratio = 99;
  expect(() => importProcessing(p)).toThrow();
  p.master.pedals[0].params.ratio = 4;
  p.master.pedals.push(p.master.pedals[0]);
  expect(() => importProcessing(p)).toThrow();
});
