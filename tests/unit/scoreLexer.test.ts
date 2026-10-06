import { expect, it } from 'vitest';
import { lexScore } from '../../src/core/scoreLexer';

it('lexes adjacent brackets and ignores comment brackets while retaining exact CRLF source spans', () => {
  const source =
    '// legato[ ignored ]\r\n  staccato[ F5 quarter // ] ignored\r\n  Gmaj7 eighth] // note\r\n';
  const tokens = lexScore(source);
  expect(tokens.map((token) => token.kind)).toEqual([
    'articulation-open',
    'text',
    'text',
    'articulation-close',
  ]);
  expect(tokens.map((token) => source.slice(token.from, token.to))).toEqual([
    'staccato[',
    'F5 quarter',
    'Gmaj7 eighth',
    ']',
  ]);
  expect(tokens.map((token) => token.line)).toEqual([2, 2, 3, 3]);
});
