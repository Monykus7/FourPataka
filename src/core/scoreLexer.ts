import type { Articulation } from './articulation';
import { indexScoreFiles, scoreFileAt, type ScoreFileIndex } from './scoreFiles';

export interface ScoreToken {
  kind:
    | 'text'
    | 'file-boundary'
    | 'song-link'
    | 'articulation-open'
    | 'tuplet-open'
    | 'repeat-open'
    | 'section-open'
    | 'section-play'
    | 'ending-open'
    | 'brace-close'
    | 'block-close'
    | 'bracket-open';
  text: string;
  from: number;
  to: number;
  line: number;
  articulation?: Articulation;
  modifier?: string;
  repeatCount?: number;
  sectionName?: string;
  nameFrom?: number;
  nameTo?: number;
  trimExpression?: string;
  fileId?: string;
}

export const isScoreBraceOpen = (token: ScoreToken) =>
  ['repeat-open', 'section-open', 'ending-open'].includes(token.kind) ||
  (token.kind === 'text' && /^track\b.*\{$/.test(token.text));

export function lexScore(
  text: string,
  fileIndex: ScoreFileIndex = indexScoreFiles(text),
): ScoreToken[] {
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
      modifier?: string,
      repeatCount?: number,
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
        fileId: scoreFileAt(fileIndex, from)?.id,
        ...(articulation ? { articulation } : {}),
        ...(modifier ? { modifier } : {}),
        ...(repeatCount !== undefined ? { repeatCount } : {}),
      });
    };
    if (fileIndex.explicit && fileIndex.files.some((file) => file.markerFrom === offset)) {
      tokens.push({
        kind: 'file-boundary',
        text: raw.trim(),
        from: offset,
        to: offset + raw.length,
        line: index + 1,
        fileId: scoreFileAt(fileIndex, offset)?.id,
      });
      offset += raw.length + 1;
      return;
    }
    if (/^from\s+song\b/.test(source.trim())) {
      emit(0, source.length, 'song-link');
      offset += raw.length + 1;
      return;
    }
    // A preset/chain may legally be named repeat; a complete header owns its identifiers.
    if (/^track\s+\S+\s+using\s+\S+(?:\s+through\s+\S+)?\s*\{$/.test(source.trim())) {
      emit(0, source.length, 'text');
      offset += raw.length + 1;
      return;
    }
    // Whole headers own their identifiers: a section can legally be named
    // repeat/play, and trim expressions must not be mistaken for music tokens.
    const section = /^\s*section\s+(\S+)\s*\{\s*$/.exec(source);
    const play = /^\s*play\s+(\S+?)(?:\s+trim\s+([^{}]+?))?\s*(\{)?\s*$/.exec(source);
    if (section || play) {
      const match = (section ?? play)!;
      emit(0, source.length, section ? 'section-open' : play![3] ? 'ending-open' : 'section-play');
      const token = tokens[tokens.length - 1];
      token.sectionName = match[1];
      const prefix = /^\s*(?:section|play)\s+/.exec(source)![0];
      token.nameFrom = offset + prefix.length;
      token.nameTo = token.nameFrom + match[1].length;
      if (play?.[2]) token.trimExpression = play[2].trim();
      offset += raw.length + 1;
      return;
    }
    let cursor = 0;
    for (const match of source.matchAll(
      /\b(staccato|legato)\s*\[|\b(triplet|tuplet:\d+:\d+)\s*\[|\b(repeat)(?:\s+(\d+))?\s*\{|[\[\]}]/g,
    )) {
      emit(cursor, match.index!, 'text');
      emit(
        match.index!,
        match.index! + match[0].length,
        match[1]
          ? 'articulation-open'
          : match[3]
            ? 'repeat-open'
            : match[0] === '}'
              ? 'brace-close'
              : match[2]
                ? 'tuplet-open'
                : match[0] === ']'
                  ? 'block-close'
                  : 'bracket-open',
        match[1] as Articulation | undefined,
        match[2],
        match[3] ? Number(match[4] ?? 2) : undefined,
      );
      cursor = match.index! + match[0].length;
    }
    emit(cursor, source.length, 'text');
    offset += raw.length + 1;
  });
  return tokens;
}
