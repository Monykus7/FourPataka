import { expect, it } from 'vitest';
import { beatExpression } from '../../src/core/beatExpression';
import { beatValue } from '../../src/core/rhythm';
import { parseScore } from '../../src/core/parser';
it('evaluates arithmetic precedence and fractional timing without evaluating code', () => {
  expect(beatValue(beatExpression('4*2 + 7*3'))).toBe(29);
  expect(beatExpression('(1/3 + 2/3)*4')).toEqual({ numerator: 4n, denominator: 1n });
  expect(beatValue(beatExpression('-2 + 1e1'))).toBe(8);
  for (const text of ['1/0', 'alert(1)', '4**2', '1 +', '(()', '1e100'])
    expect(() => beatExpression(text)).toThrow();
  const score = parseScore(
    'time 7/4 at 4*2\ntime 6/4 at 4*2 + 7*3\ntrack a using sine {\nC4 whole\n}',
    ['sine'],
  );
  expect(score.diagnostics).toEqual([]);
  expect(score.meterChanges.map((change) => change.beat)).toEqual([8, 29]);
});
