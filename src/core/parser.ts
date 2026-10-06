import { SCORE_KEY, pitch } from './music';
import { lexScore, type ScoreToken } from './scoreLexer';
import { addBeats, beatValue, parseDuration, type BeatFraction } from './rhythm';
import type { Articulation } from './articulation';
import {
  DEFAULT_METER,
  parseMeter,
  measureLength,
  type MeterChange,
  type TimeSignature,
} from './meter';
import { expandChordSymbol, type ChordExpansion } from './chordSymbols';
import { CHORD_SHAPES, type ChordShapeRegistry } from '../modules/chords';

export interface Diagnostic {
  from: number;
  to: number;
  line: number;
  message: string;
}
export interface ScoreEvent {
  articulation?: Articulation;
  gateDuration?: number;
  legatoToNext?: boolean;
  tuplet?: { notes: number; inTimeOf: number };
  chordSymbol?: ChordExpansion & { from: number; to: number };
  id: string;
  track: string;
  beat: number;
  duration: number;
  notes: string[];
  frequencies: number[];
  from: number;
  to: number;
  line: number;
}
export interface ScoreTrack {
  key: string;
  instrumentKey: string;
  instrumentFrom: number;
  instrumentTo: number;
  chainKey: string | null;
  chainFrom?: number;
  chainTo?: number;
  bodyTo: number;
  events: ScoreEvent[];
  beats: number;
}
export interface CompiledScore {
  meterChanges: MeterChange[];
  tempo: number;
  meter: TimeSignature;
  directives: Partial<Record<'tempo' | 'time', { from: number; to: number }>>;
  master: { key: string; from: number; to: number; commandFrom: number; commandTo: number } | null;
  tracks: ScoreTrack[];
  events: ScoreEvent[];
  diagnostics: Diagnostic[];
  beats: number;
  seconds: number;
}

// Line-oriented lexer: retain offsets before stripping comments and whitespace.
// Application semantics live here; editor tokens never decide what plays.
export function parseScore(
  text: string,
  instrumentKeys: string[],
  chainKeys: string[] = [],
  chordShapes: ChordShapeRegistry = CHORD_SHAPES,
): CompiledScore {
  const result: CompiledScore = {
    tempo: 120,
    meter: { ...DEFAULT_METER },
    meterChanges: [],
    directives: {},
    master: null,
    tracks: [],
    events: [],
    diagnostics: [],
    beats: 0,
    seconds: 0,
  };
  let current: ScoreTrack | null = null;
  const globals = new Set<string>();
  const tracks = new Set<string>();
  const positions = new Map<string, BeatFraction>();
  const lines = text.split('\n');
  const blocks: (ScoreToken & { id: number })[] = [];
  const eventBlocks = new WeakMap<ScoreEvent, number>();
  let blockId = 0;
  const reportUnclosed = () => {
    for (const block of blocks)
      result.diagnostics.push({
        from: block.from,
        to: block.to,
        line: block.line,
        message: `${block.articulation} block is missing its closing ].`,
      });
    blocks.length = 0;
  };
  lexScore(text).forEach((token) => {
    const { text: line, from, to } = token;
    const error = (message: string, start = from, end = to) =>
      result.diagnostics.push({
        from: start,
        to: Math.max(start + 1, end),
        line: token.line,
        message,
      });
    if (token.kind === 'articulation-open') {
      if (!current) error('Articulation blocks belong inside a track.');
      else if (blocks.length >= 64) error('Articulation blocks may nest at most 64 levels.');
      else blocks.push({ ...token, id: ++blockId });
      return;
    }
    if (token.kind === 'articulation-close') {
      if (!blocks.length) error('Unexpected closing ]; open staccato[ or legato[ first.');
      else blocks.pop();
      return;
    }
    if (token.kind === 'bracket-open') {
      error('Use staccato[ or legato[ to open an articulation block.');
      return;
    }
    if (!line) return;
    if (line === '}') {
      reportUnclosed();
      if (!current) error('Unexpected closing brace.');
      else current.bodyTo = from;
      current = null;
      return;
    }
    if (!current) {
      const meterChange = /^time\s+(\S+)\s+at\s+(\S+)$/.exec(line);
      if (meterChange) {
        try {
          const beat = Number(meterChange[2]);
          if (!Number.isFinite(beat) || beat <= 0 || beat > 1_000_000)
            throw new Error(
              'Meter-change position must be greater than 0 and at most 1,000,000 quarter beats.',
            );
          if (result.meterChanges.length >= 64)
            throw new Error('A score may contain at most 64 meter changes.');
          result.meterChanges.push({
            beat,
            meter: parseMeter(meterChange[1]),
            from,
            to,
            line: token.line,
          });
        } catch (e) {
          error((e as Error).message);
        }
        return;
      }
      const master = /^master\s+through\s+(\S+)$/.exec(line);
      if (master) {
        const key = master[1],
          keyFrom = to - key.length;
        if (globals.has('master')) error('Duplicate master directive.');
        globals.add('master');
        if (!chainKeys.includes(key))
          error(
            `Unknown pedal chain “${key}”. Save a chain with this score key first.`,
            keyFrom,
            to,
          );
        result.master = { key, from: keyFrom, to, commandFrom: from, commandTo: to };
        return;
      }
      const directive = /^(tempo|time)\s+(\S+)$/.exec(line);
      if (directive) {
        const [, command, value] = directive;
        if (globals.has(command)) error(`Duplicate ${command} directive.`);
        globals.add(command);
        const valueFrom = from + line.length - value.length;
        result.directives[command as 'tempo' | 'time'] = { from: valueFrom, to };
        if (command === 'tempo') {
          const bpm = Number(value);
          if (!Number.isFinite(bpm) || bpm < 20 || bpm > 300)
            error('Tempo must be between 20 and 300 BPM.');
          else result.tempo = bpm;
        } else {
          try {
            result.meter = parseMeter(value);
          } catch (e) {
            error((e as Error).message);
          }
        }
        return;
      }
      const header = /^track\s+(\S+)\s+using\s+(\S+)(?:\s+through\s+(\S+))?\s*\{$/.exec(line);
      if (header) {
        const [, key, instrumentKey, chain] = header;
        if (!SCORE_KEY.test(key))
          error('Track keys must start with a letter and contain only letters, digits, or _.');
        if (tracks.has(key)) error(`Duplicate track “${key}”.`);
        tracks.add(key);
        if (tracks.size > 128) error('A project may contain at most 128 tracks.');
        if (!instrumentKeys.includes(instrumentKey))
          error(`Unknown instrument “${instrumentKey}”. Save a preset with this score key first.`);
        const prefix = /^track\s+\S+\s+using\s+/.exec(line)![0];
        const instrumentTo = from + prefix.length + instrumentKey.length;
        const chainPrefix = chain ? /^\s+through\s+/.exec(line.slice(instrumentTo - from))![0] : '';
        const chainFrom = instrumentTo + chainPrefix.length;
        if (chain && !chainKeys.includes(chain))
          error(
            `Unknown pedal chain “${chain}”. Save a chain with this score key first.`,
            chainFrom,
            chainFrom + chain.length,
          );
        current = {
          key,
          instrumentKey,
          instrumentFrom: from + prefix.length,
          instrumentTo,
          chainKey: chain ?? null,
          ...(chain ? { chainFrom, chainTo: chainFrom + chain.length } : {}),
          bodyTo: to,
          events: [],
          beats: 0,
        };
        result.tracks.push(current);
        return;
      }
      if (/^master\b/.test(line)) error('Use master through <pedalKey> outside track blocks.');
      else
        error(
          'Expected tempo, time, master through <pedalKey>, or track <key> using <instrumentKey> [through <pedalKey>] { on its own line.',
        );
      return;
    }
    const event =
      /^(.*?)\s+(whole|half|quarter|8th|16th|32nd|64th)(\.{0,2})(?:\s+(triplet|tuplet:\d+:\d+))?(?:\s+(staccato|legato))?$/.exec(
        line,
      );
    if (!event) {
      error(
        'Expected a note, chord, or rest followed by a duration, optional triplet/tuplet:N:M and staccato/legato.',
      );
      return;
    }
    const [, expression, word, dots, modifier, suffixArticulation] = event;
    const block = blocks.at(-1);
    const articulation =
      expression === 'rest' ? suffixArticulation : (suffixArticulation ?? block?.articulation);
    let notes: string[] = [];
    let chordSymbol: ScoreEvent['chordSymbol'];
    try {
      const written = parseDuration(word + dots, modifier);
      if (expression === 'rest' && articulation)
        throw new Error('Rests cannot have staccato or legato articulation.');
      if (expression === 'rest') notes = [];
      else if (/^chord\b/.test(expression)) {
        const symbolic = /^chord\s*:\s*([^()\s]+)$/.exec(expression);
        if (symbolic) {
          const expansion = expandChordSymbol(symbolic[1], chordShapes);
          const symbolFrom = from + expression.lastIndexOf(symbolic[1]);
          chordSymbol = { ...expansion, from: symbolFrom, to: symbolFrom + symbolic[1].length };
          notes = expansion.notes;
        } else {
          const chord = /^chord\s*:\s*\(\s*([^)]*?)\s*\)\s*([0-8])?$/.exec(expression);
          if (!chord || !chord[1].trim())
            throw new Error('Use chord:(Bb D F)5 or chord:(Bb4 D5 F5). Chords cannot be empty.');
          notes = chord[1]
            .trim()
            .split(/\s+/)
            .map((note) => {
              if (/^[A-G][#b]?$/.test(note)) {
                if (!chord[2])
                  throw new Error(`“${note}” needs an octave or a trailing chord octave.`);
                return note + chord[2];
              }
              return note;
            });
          if (notes.length > 32) throw new Error('A chord may contain at most 32 notes.');
        }
      } else notes = [expression];
      const frequencies = notes.map((note) => pitch(note).frequency);
      const compiled: ScoreEvent = {
        id: `${current.key}:${current.events.length}`,
        track: current.key,
        beat: current.beats,
        duration: written.duration,
        notes,
        frequencies,
        from,
        to,
        line: token.line,
        ...(chordSymbol ? { chordSymbol } : {}),
        ...(written.tuplet ? { tuplet: written.tuplet } : {}),
        ...(articulation ? { articulation: articulation as Articulation } : {}),
        ...(articulation === 'staccato' ? { gateDuration: written.duration / 2 } : {}),
      };
      // Scope identity prevents a legato gate from leaking past ] or into a nested block.
      if (block) eventBlocks.set(compiled, block.id);
      current.events.push(compiled);
      result.events.push(compiled);
      // Rational accumulation makes three triplets close exactly at the beat;
      // only the public scheduler/UI boundary converts quarter beats to numbers.
      const position = addBeats(
        positions.get(current.key) ?? { numerator: 0n, denominator: 1n },
        written.beats,
      );
      positions.set(current.key, position);
      current.beats = beatValue(position);
    } catch (e) {
      error((e as Error).message);
    }
  });
  reportUnclosed();
  if (current)
    result.diagnostics.push({
      from: Math.max(0, text.length - 1),
      to: text.length,
      line: lines.length,
      message: `Track “${(current as ScoreTrack).key}” is missing its closing brace.`,
    });
  if (!result.tracks.length && !result.diagnostics.length)
    result.diagnostics.push({
      from: 0,
      to: Math.min(1, text.length),
      line: 1,
      message: 'Add a track to start composing.',
    });
  for (const track of result.tracks)
    track.events.forEach((event, i) => {
      if (
        event.articulation === 'legato' &&
        track.events[i + 1]?.notes.length &&
        eventBlocks.get(event) === eventBlocks.get(track.events[i + 1])
      )
        event.legatoToNext = true;
    });
  const requestedChanges = result.meterChanges.sort((a, b) => a.beat - b.beat);
  result.meterChanges = [];
  let meterStart = 0,
    previousMeter = result.meter;
  for (const change of requestedChanges) {
    const bars = (change.beat - meterStart) / measureLength(previousMeter);
    if (change.beat <= meterStart || Math.abs(bars - Math.round(bars)) > 1e-8) {
      result.diagnostics.push({
        from: change.from,
        to: change.to,
        line: change.line,
        message:
          'Meter changes must use distinct positions at a bar boundary of the preceding meter.',
      });
      continue;
    }
    result.meterChanges.push(change);
    meterStart = change.beat;
    previousMeter = change.meter;
  }
  result.beats = Math.max(0, ...result.tracks.map((t) => t.beats));
  result.seconds = (result.beats * 60) / result.tempo;
  return result;
}

export { COMMANDS } from './commands';
