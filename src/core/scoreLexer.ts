import type { Articulation } from './articulation';

export interface ScoreToken {
  kind: 'text' | 'articulation-open' | 'articulation-close' | 'bracket-open';
  text: string;
  from: number;
  to: number;
  line: number;
  articulation?: Articulation;
}

export function lexScore(text: string): ScoreToken[] {
  const tokens: ScoreToken[] = [];
  let offset = 0;
  text.split('\n').forEach((raw, index) => {
    // Strip comments only for recognition; all token spans still address original source.
    const source = raw.split('//')[0];
    const emit = (
      start: number,
      end: number,
      kind: ScoreToken['kind'],
      articulation?: Articulation,
    ) => {
      const value = source.slice(start, end);
      const trimmed = value.trim();
      if (!trimmed) return;
      const from = offset + start + value.indexOf(trimmed);
      tokens.push({
        kind,
        text: trimmed,
        from,
        to: from + trimmed.length,
        line: index + 1,
        ...(articulation ? { articulation } : {}),
      });
    };
    let cursor = 0;
    for (const match of source.matchAll(/\b(staccato|legato)\s*\[|[\[\]]/g)) {
      emit(cursor, match.index!, 'text');
      emit(
        match.index!,
        match.index! + match[0].length,
        match[1] ? 'articulation-open' : match[0] === ']' ? 'articulation-close' : 'bracket-open',
        match[1] as Articulation | undefined,
      );
      cursor = match.index! + match[0].length;
    }
    emit(cursor, source.length, 'text');
    offset += raw.length + 1;
  });
  return tokens;
}
