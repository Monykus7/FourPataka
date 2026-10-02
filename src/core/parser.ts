import { DURATIONS, SCORE_KEY, pitch } from './music';
import { DEFAULT_METER, parseMeter, type TimeSignature } from './meter';

export interface Diagnostic {
  from: number;
  to: number;
  line: number;
  message: string;
}
export interface ScoreEvent {
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
): CompiledScore {
  const result: CompiledScore = {
    tempo: 120,
    meter: { ...DEFAULT_METER },
    directives: {},
    master: null,
    tracks: [],
    events: [],
    diagnostics: [],
    beats: 0,
    seconds: 0,
  };
  let offset = 0;
  let current: ScoreTrack | null = null;
  const globals = new Set<string>();
  const tracks = new Set<string>();
  const lines = text.split('\n');
  lines.forEach((raw, index) => {
    const withoutComment = raw.split('//')[0];
    const line = withoutComment.trim();
    const from = offset + (line ? withoutComment.indexOf(line) : 0);
    const to = from + line.length;
    offset += raw.length + 1;
    const error = (message: string, start = from, end = to) =>
      result.diagnostics.push({
        from: start,
        to: Math.max(start + 1, end),
        line: index + 1,
        message,
      });
    if (!line) return;
    if (line === '}') {
      if (!current) error('Unexpected closing brace.');
      else current.bodyTo = from;
      current = null;
      return;
    }
    if (!current) {
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
    const event = /^(.*?)\s+(whole|half|quarter|8th|16th)$/.exec(line);
    if (!event) {
      error('Expected a note, chord, or rest followed by whole, half, quarter, 8th, or 16th.');
      return;
    }
    const [, expression, word] = event;
    let notes: string[] = [];
    try {
      if (expression === 'rest') notes = [];
      else if (/^chord\b/.test(expression)) {
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
      } else notes = [expression];
      const frequencies = notes.map((note) => pitch(note).frequency);
      const compiled: ScoreEvent = {
        id: `${current.key}:${current.events.length}`,
        track: current.key,
        beat: current.beats,
        duration: DURATIONS[word],
        notes,
        frequencies,
        from,
        to,
        line: index + 1,
      };
      current.events.push(compiled);
      result.events.push(compiled);
      current.beats += compiled.duration;
    } catch (e) {
      error((e as Error).message);
    }
  });
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
  result.beats = Math.max(0, ...result.tracks.map((t) => t.beats));
  result.seconds = (result.beats * 60) / result.tempo;
  return result;
}

export const COMMANDS = [
  { name: 'tempo', description: 'Quarter-note beats per minute · 20–300', snippet: 'tempo 120' },
  { name: 'time', description: 'Project meter · 1–32 over 1, 2, 4, 8, or 16', snippet: 'time 4/4' },
  {
    name: 'master',
    description: 'Independent pedal chain on the full mix',
    snippet: 'master through cleanGlue',
  },
  {
    name: 'through',
    description: 'Saved chain copied into the selected track',
    snippet: 'through warmDrive',
  },
  {
    name: 'track',
    description: 'Independent sound; all tracks start together',
    snippet: 'track lead using brightReed {\n  C5 quarter\n}',
  },
  { name: 'note', description: 'Scientific pitch notation · C0–B8', snippet: 'C5 quarter' },
  {
    name: 'chord',
    description: 'Simultaneous notes with a default octave',
    snippet: 'chord:(Bb D F)5 8th',
  },
  {
    name: 'voicing',
    description: 'Explicit octaves override the default',
    snippet: 'chord:(Bb4 D5 F5) quarter',
  },
  { name: 'rest', description: 'Advance time without starting a note', snippet: 'rest half' },
  {
    name: 'comment',
    description: 'Ignored until the end of the line',
    snippet: '// Comment',
  },
];
