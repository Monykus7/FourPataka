import { lexScore } from './scoreLexer';
import { SCORE_KEY } from './music';
import type { Project } from './project';

export interface TrackSourceView {
  fileId?: string;
  key: string;
  from: number;
  to: number;
  keyFrom: number;
  keyTo: number;
  firstLine: number;
}
export interface ScoreViewIndex {
  source: string;
  tracks: TrackSourceView[];
  problem: string | null;
}

/** CodeMirror counts a CRLF as one character; source offsets count both. */
export function projectScoreView(source: string, view?: TrackSourceView) {
  const from = view?.from ?? 0;
  const to = view?.to ?? source.length;
  const slice = source.slice(from, to);
  const removed = [...slice.matchAll(/\r\n/g)].map((match) => match.index!);
  const localBreaks = removed.map((position, index) => position - index);
  const before = (positions: number[], at: number) => {
    let low = 0,
      high = positions.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (positions[middle] < at) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  return {
    text: slice.replace(/\r\n/g, '\n'),
    from,
    to,
    toLocal: (position: number) => position - from - before(removed, position - from),
    toCanonical: (position: number) => from + position + before(localBreaks, position),
    restore: (text: string) => (removed.length ? text.replace(/\r?\n/g, '\r\n') : text),
  };
}

/** Views address canonical UTF-16 offsets, never an independently saved document. */
export function indexScoreViews(source: string): ScoreViewIndex {
  const tracks: TrackSourceView[] = [];
  const keys = new Set<string>();
  const fileKeys = new Map<string, Set<string>>();
  const stack: ('track' | 'repeat' | 'bracket')[] = [];
  let current: TrackSourceView | null = null;
  const fail = (problem: string): ScoreViewIndex => ({ source, tracks: [], problem });
  for (const token of lexScore(source)) {
    if (token.kind === 'file-boundary') {
      if (current || stack.length) return fail('Close all blocks before the next file.');
      continue;
    }
    if (token.kind === 'text') {
      const header =
        /^track\s+([A-Za-z][A-Za-z0-9_]*)\s+using\s+\S+(?:\s+through\s+\S+)?\s*\{$/.exec(
          token.text,
        );
      if (header) {
        if (tracks.length >= 4096 || (!keys.has(header[1]) && keys.size >= 128))
          return fail('A score may contain at most 128 tracks across 32 files.');
        if (current || stack.length) return fail('A track header is inside another block.');
        const localKeys = fileKeys.get(token.fileId ?? 'main') ?? new Set<string>();
        if (header[1].length > 100 || localKeys.has(header[1]))
          return fail('Track names must be unique and at most 100 characters.');
        keys.add(header[1]);
        localKeys.add(header[1]);
        fileKeys.set(token.fileId ?? 'main', localKeys);
        const keyFrom = token.from + /^track\s+/.exec(token.text)![0].length;
        current = {
          fileId: token.fileId,
          key: header[1],
          from: token.from,
          to: token.to,
          keyFrom,
          keyTo: keyFrom + header[1].length,
          firstLine: token.line,
        };
        stack.push('track');
      } else if (/^track\b/.test(token.text) || /[{}]/.test(token.text)) {
        return fail('A track header or brace is incomplete.');
      }
    } else if (['repeat-open', 'section-open', 'ending-open'].includes(token.kind)) {
      if (!current) return fail('A repeat is outside a track.');
      stack.push('repeat');
    } else if (['articulation-open', 'tuplet-open'].includes(token.kind)) {
      if (!current) return fail('A grouped phrase is outside a track.');
      stack.push('bracket');
    } else if (token.kind === 'bracket-open') {
      return fail('A bracket has no recognized phrase command.');
    } else if (token.kind === 'block-close') {
      if (stack.pop() !== 'bracket') return fail('A phrase bracket is unmatched.');
    } else if (token.kind === 'brace-close') {
      const scope = stack.pop();
      if (scope === 'track' && current) {
        tracks.push({ ...current, to: token.to });
        current = null;
      } else if (scope !== 'repeat') return fail('A closing brace is unmatched.');
    }
    if (stack.length > 65) return fail('Too many nested source blocks.');
  }
  if (current || stack.length) return fail('A track or phrase block is not closed.');
  return { source, tracks, problem: null };
}

function currentView(source: string, index: ScoreViewIndex, key: string, fileId?: string) {
  // Offset reuse after a full-score/other-track edit could overwrite unrelated music.
  if (source !== index.source)
    throw new Error('The score changed. Select the track again before editing.');
  const view =
    !index.problem &&
    index.tracks.find((track) => track.key === key && (!fileId || track.fileId === fileId));
  if (!view) throw new Error('Open All score to repair the track boundaries.');
  return view;
}

export function editTrackView(
  source: string,
  index: ScoreViewIndex,
  key: string,
  value: string,
  fileId?: string,
) {
  const view = currentView(source, index, key, fileId);
  const text = source.slice(0, view.from) + value + source.slice(view.to);
  const local = indexScoreViews(value);
  const only = !local.problem && local.tracks.length === 1 ? local.tracks[0] : null;
  const whole = indexScoreViews(text);
  // Incomplete typing is retained verbatim, then exposed in All score for recovery.
  const trackKey =
    only && !whole.problem && !(value.slice(0, only.from) + value.slice(only.to)).trim()
      ? only.key
      : null;
  return {
    text,
    trackKey,
    renameOwnership:
      !!trackKey && trackKey !== key && !whole.tracks.some((track) => track.key === key),
  };
}

export function renameTrackSource(
  source: string,
  index: ScoreViewIndex,
  key: string,
  nextKey: string,
) {
  currentView(source, index, key);
  if (!SCORE_KEY.test(nextKey) || nextKey.length > 100)
    throw new Error('Use a name starting with a letter, followed by letters, digits or _.');
  if (nextKey !== key && index.tracks.some((track) => track.key === nextKey))
    throw new Error('Another track already uses that name.');
  let text = source;
  // A song track has one owned sound even when its source spans several files.
  for (const part of index.tracks
    .filter((track) => track.key === key)
    .sort((a, b) => b.keyFrom - a.keyFrom))
    text = text.slice(0, part.keyFrom) + nextKey + text.slice(part.keyTo);
  return text;
}

export function removeTrackSource(
  source: string,
  index: ScoreViewIndex,
  key: string,
  fileId?: string,
) {
  currentView(source, index, key, fileId);
  let text = source;
  for (const part of index.tracks
    .filter((track) => track.key === key && (!fileId || track.fileId === fileId))
    .sort((a, b) => b.from - a.from))
    text = text.slice(0, part.from) + text.slice(part.to);
  return text;
}

/** Renaming a view must move owned instances, rather than re-copy a library preset. */
export function moveTrackOwnership(project: Project, from: string, to: string): Project {
  if (from === to) return project;
  if (project.tracks.some((track) => track.key === to))
    throw new Error('Another track already uses that name.');
  const chains = { ...project.processing.tracks };
  if (chains[from]) {
    chains[to] = chains[from];
    delete chains[from];
  }
  return {
    ...project,
    tracks: project.tracks.map((track) => (track.key === from ? { ...track, key: to } : track)),
    processing: { ...project.processing, tracks: chains },
    comparisonMaterial:
      project.comparisonMaterial.trackKey === from
        ? { ...project.comparisonMaterial, trackKey: to }
        : project.comparisonMaterial,
  };
}

export function removeTrackOwnership(project: Project, key: string): Project {
  const chains = { ...project.processing.tracks };
  delete chains[key];
  const tracks = project.tracks.filter((track) => track.key !== key);
  return {
    ...project,
    tracks,
    processing: { ...project.processing, tracks: chains },
    comparisonMaterial:
      project.comparisonMaterial.trackKey === key
        ? {
            ...project.comparisonMaterial,
            trackKey: tracks[0]?.key ?? project.comparisonMaterial.trackKey,
          }
        : project.comparisonMaterial,
  };
}
