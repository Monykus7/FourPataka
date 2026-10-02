import { describe, expect, it } from 'vitest';
import { parseMeter } from '../../src/core/meter';
import { timelineGrid } from '../../src/core/timeline';
describe('meter timeline', () => {
  it('places 3/4 and 6/8 bars at three quarter beats with distinct pulses', () => {
    const waltz = timelineGrid(7, parseMeter('3/4'));
    const compound = timelineGrid(7, parseMeter('6/8'));
    expect(waltz.bars).toEqual([
      { bar: 1, beat: 0 },
      { bar: 2, beat: 3 },
      { bar: 3, beat: 6 },
    ]);
    expect(compound.bars).toEqual(waltz.bars);
    expect(waltz.pulses.slice(0, 3)).toEqual([0, 1, 2]);
    expect(compound.pulses.slice(0, 3)).toEqual([0, 0.5, 1]);
    expect(compound.extent).toBe(7);
  });
  it('shows at least one measure and bounds grid size for very long scores', () => {
    expect(timelineGrid(0.25, parseMeter('7/8')).extent).toBe(3.5);
    const large = timelineGrid(1e6, parseMeter('1/16'));
    expect(large.bars.length).toBeLessThanOrEqual(64);
    expect(large.pulses).toEqual([]);
    expect(large.bars[1].beat).toBeGreaterThan(large.bars[0].beat);
  });
});
