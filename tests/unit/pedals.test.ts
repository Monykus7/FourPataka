import { expect, it } from 'vitest';
import {
  applyAssociated,
  clampPedal,
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
it('imports flat EQ copies and rejects out-of-range or missing EQ parameters', () => {
  const project = createProject();
  const pedal = makePedal('eq');
  expect(pedal.params).toEqual({ low: 0, mid: 0, high: 0, frequency: 1000, output: 0, mix: 100 });
  project.processing.master.pedals.push(pedal);
  const imported = importProject(JSON.stringify(project));
  imported.processing.master.pedals[0].params.low = 6;
  expect(project.processing.master.pedals[0].params.low).toBe(0);
  for (const [key, value] of Object.entries({
    low: 13,
    mid: -13,
    high: NaN,
    frequency: 149,
    output: 13,
    mix: 101,
  })) {
    const invalid = structuredClone(project.processing);
    invalid.master.pedals[0].params[key] = value;
    expect(() => importProcessing(invalid)).toThrow();
  }
  const missing = structuredClone(project.processing);
  delete missing.master.pedals[0].params.mid;
  expect(() => importProcessing(missing)).toThrow();
  expect(
    clampPedal({ ...pedal, params: { ...pedal.params, low: 99, frequency: 8000 } }).params,
  ).toMatchObject({ low: 12, frequency: 4000 });
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
