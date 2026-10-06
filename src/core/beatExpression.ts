import { addBeats, fraction, type BeatFraction } from './rhythm';

// A small numeric grammar, never JavaScript evaluation or arbitrary identifiers.
export function beatExpression(source: string): BeatFraction {
  if (source.length > 256) throw new Error('Timing expression is limited to 256 characters.');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[()+*/-]/g) ?? [];
  if (tokens.join('') !== source.replace(/\s/g, '') || !tokens.length)
    throw new Error('Timing expressions use numbers, +, -, *, / and parentheses.');
  let cursor = 0;
  const multiply = (a: BeatFraction, b: BeatFraction) =>
    fraction(a.numerator * b.numerator, a.denominator * b.denominator);
  const primary = (depth: number): BeatFraction => {
    if (depth > 16) throw new Error('Timing expressions may nest at most 16 levels.');
    const token = tokens[cursor++];
    if (token === '+' || token === '-') {
      const value = primary(depth + 1);
      return token === '-' ? fraction(-value.numerator, value.denominator) : value;
    }
    if (token === '(') {
      const value = sum(depth + 1);
      if (tokens[cursor++] !== ')') throw new Error('Timing expression is missing ).');
      return value;
    }
    if (!token || !/^[\d.]/.test(token)) throw new Error('Expected a number in timing expression.');
    const [decimal, exponentText = '0'] = token.toLowerCase().split('e');
    const exponent = Number(exponentText);
    if (Math.abs(exponent) > 16) throw new Error('Numeric exponent must be between -16 and 16.');
    const [whole, digits = ''] = decimal.split('.');
    const places = digits.length - exponent;
    return places >= 0
      ? fraction(BigInt((whole || '0') + digits), 10n ** BigInt(places))
      : fraction(BigInt((whole || '0') + digits) * 10n ** BigInt(-places), 1n);
  };
  const product = (depth: number) => {
    let value = primary(depth);
    while (tokens[cursor] === '*' || tokens[cursor] === '/') {
      const op = tokens[cursor++];
      const next = primary(depth);
      value = multiply(value, op === '/' ? fraction(next.denominator, next.numerator) : next);
    }
    return value;
  };
  const sum = (depth: number) => {
    let value = product(depth);
    while (tokens[cursor] === '+' || tokens[cursor] === '-') {
      const op = tokens[cursor++];
      const next = product(depth);
      value = addBeats(value, op === '-' ? fraction(-next.numerator, next.denominator) : next);
    }
    return value;
  };
  const value = sum(0);
  if (cursor !== tokens.length) throw new Error('Unexpected token in timing expression.');
  return value;
}
