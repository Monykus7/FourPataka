import { SCORE_KEY } from './music';
import { isScoreBraceOpen, lexScore, type ScoreToken } from './scoreLexer';

export interface SectionSource {
  fileId?: string;
  track: string;
  name: string;
  from: number;
  to: number;
  nameFrom: number;
  nameTo: number;
  line: number;
  open: number;
  close: number;
}
export interface SectionReference {
  track: string;
  token: ScoreToken;
  index: number;
}
export interface SectionSourceIndex {
  tracks: { key: string; from: number; to: number }[];
  source: string;
  sections: SectionSource[];
  references: SectionReference[];
  closes: Map<number, number>;
  complete: boolean;
  diagnostics: { from: number; to: number; line: number; message: string }[];
}

/** One source index serves expansion, navigation and reference-aware rename. */
export function indexScoreSections(source: string, tokens = lexScore(source)): SectionSourceIndex {
  const result: SectionSourceIndex = {
    tracks: [],
    source,
    sections: [],
    references: [],
    closes: new Map(),
    complete: true,
    diagnostics: [],
  };
  const stack: { index: number; token: ScoreToken; track: string; bracket: boolean }[] = [];
  let track = '';
  const names = new Map<string, Set<string>>();
  const report = (token: ScoreToken, message: string) =>
    result.diagnostics.push({ from: token.from, to: token.to, line: token.line, message });
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === 'file-boundary') {
      if (stack.length) {
        report(token, 'Close all track and phrase blocks before the next file.');
        result.complete = false;
      }
      stack.length = 0;
      track = '';
      continue;
    }
    if (token.kind === 'text') {
      const header = /^track\s+(\S+)\s+using\b/.exec(token.text);
      if (header && /\{$/.test(token.text)) {
        track = header[1];
        result.tracks.push({ key: track, from: token.from, to: source.length });
      }
    }
    if (token.kind === 'section-open') {
      const direct = !!track && stack.length === 1 && stack[0].token.kind === 'text';
      const validName = SCORE_KEY.test(token.sectionName ?? '') && token.sectionName!.length <= 100;
      const localNames = names.get(track) ?? new Set<string>();
      if (!direct)
        report(
          token,
          'Section definitions belong directly inside a track, outside repeats and bracket groups.',
        );
      if (!validName)
        report(
          token,
          'Section names start with a letter, use letters/digits/_, and are at most 100 characters.',
        );
      if (localNames.has(token.sectionName!))
        report(token, `Section “${token.sectionName}” is already defined in track “${track}”.`);
      if (localNames.size >= 64) report(token, 'A track may define at most 64 named sections.');
      if (direct && validName && localNames.size < 64 && !localNames.has(token.sectionName!)) {
        localNames.add(token.sectionName!);
        names.set(track, localNames);
        result.sections.push({
          fileId: token.fileId,
          track,
          name: token.sectionName!,
          from: token.from,
          to: token.to,
          nameFrom: token.nameFrom!,
          nameTo: token.nameTo!,
          line: token.line,
          open: i,
          close: -1,
        });
      }
    }
    if (token.kind === 'section-play' || token.kind === 'ending-open') {
      if (!track) report(token, 'Section calls belong inside a track.');
      if (!SCORE_KEY.test(token.sectionName ?? '') || token.sectionName!.length > 100)
        report(
          token,
          'Use play <sectionName>, optionally trim <quarter-beat expression> and an ending block.',
        );
      result.references.push({ track, token, index: i });
    }
    if (
      isScoreBraceOpen(token) ||
      ['articulation-open', 'tuplet-open', 'bracket-open'].includes(token.kind)
    ) {
      if (stack.length >= 65) {
        report(token, 'Too many nested source blocks.');
        result.complete = false;
        break;
      }
      stack.push({ index: i, token, track, bracket: !isScoreBraceOpen(token) });
    } else if (token.kind === 'brace-close' || token.kind === 'block-close') {
      // Match parser recovery: a closing brace ends its track/repeat even when
      // an inner ] was omitted. The music parser reports that bracket once.
      if (token.kind === 'brace-close') {
        while (stack.at(-1)?.bracket) {
          stack.pop();
          result.complete = false;
        }
      } else if (!stack.at(-1)?.bracket) {
        result.complete = false;
        continue;
      }
      const open = stack.pop();
      if (!open || open.bracket !== (token.kind === 'block-close')) {
        if (stack.some((scope) => ['section-open', 'ending-open'].includes(scope.token.kind)))
          report(token, 'A section/phrase delimiter is unmatched.');
        result.complete = false;
        continue;
      }
      if (!open.bracket) result.closes.set(open.index, i);
      if (open.token.kind === 'section-open') {
        const section = result.sections.find((s) => s.open === open.index);
        if (section) {
          section.close = i;
          section.to = token.to;
        }
      }
      if (open.token.kind === 'text') {
        const scope = result.tracks.find((t) => t.from === open.token.from);
        if (scope) scope.to = token.to;
        track = '';
      }
    }
  }
  // Existing repeat/bracket diagnostics remain authoritative; named constructs
  // add only their own unclosed diagnostics to avoid duplicating legacy errors.
  for (const open of stack)
    if (['section-open', 'ending-open'].includes(open.token.kind))
      report(
        open.token,
        `${open.token.kind === 'section-open' ? 'Section' : 'Alternate ending'} block is missing its closing }.`,
      );
  result.complete &&= stack.length === 0;
  return result;
}

export function sectionNamesAt(source: string, position: number) {
  const index = indexScoreSections(source);
  const track = index.tracks.filter((t) => t.from <= position && t.to >= position).at(-1);
  return track ? index.sections.filter((s) => s.track === track.key).map((s) => s.name) : [];
}

export function nextSectionName(names: readonly string[]) {
  let name = 'A';
  for (let suffix = 2; names.includes(name); suffix++) name = `A${suffix}`;
  return name;
}

export function renameSectionSource(
  source: string,
  index: SectionSourceIndex,
  track: string,
  name: string,
  nextName: string,
) {
  if (source !== index.source)
    throw new Error('The score changed. Select the section again before renaming.');
  if (index.diagnostics.length || !index.complete)
    throw new Error('Repair section boundaries and names before renaming.');
  if (!SCORE_KEY.test(nextName) || nextName.length > 100)
    throw new Error('Use a section name starting with a letter, followed by letters, digits or _.');
  const section = index.sections.find((s) => s.track === track && s.name === name);
  if (!section) throw new Error('This section no longer exists.');
  if (name !== nextName && index.sections.some((s) => s.track === track && s.name === nextName))
    throw new Error('This track already has a section with that name.');
  const spans = [
    { from: section.nameFrom, to: section.nameTo },
    ...index.references
      .filter((r) => r.track === track && r.token.sectionName === name)
      .map((r) => ({ from: r.token.nameFrom!, to: r.token.nameTo! })),
  ];
  // Replace backwards so every reference still addresses the original UTF-16
  // source; comments and identically named sections in other tracks stay exact.
  return spans
    .sort((a, b) => b.from - a.from)
    .reduce((text, span) => text.slice(0, span.from) + nextName + text.slice(span.to), source);
}
