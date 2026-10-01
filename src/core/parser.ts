import { DURATIONS, SCORE_KEY, pitch } from './music';

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
  bodyTo: number;
  events: ScoreEvent[];
  beats: number;
}
export interface CompiledScore {
  tempo: number;
  tracks: ScoreTrack[];
  events: ScoreEvent[];
  diagnostics: Diagnostic[];
  beats: number;
  seconds: number;
}

// Line-oriented lexer: retain offsets before stripping comments and whitespace.
// Application semantics live here; editor tokens never decide what plays.
export function parseScore(text: string, instrumentKeys: string[]): CompiledScore {
  const result: CompiledScore = {
    tempo: 120,
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
    const error = (message: string) =>
      result.diagnostics.push({ from, to: Math.max(from + 1, to), line: index + 1, message });
    if (!line) return;
    if (line === '}') {
      if (!current) error('Unexpected closing brace.');
      else current.bodyTo = from;
      current = null;
      return;
    }
    if (!current) {
      const directive = /^(tempo|time)\s+(\S+)$/.exec(line);
      if (directive) {
        const [, command, value] = directive;
        if (globals.has(command)) error(`Duplicate ${command} directive.`);
        globals.add(command);
        if (command === 'tempo') {
          const bpm = Number(value);
          if (!Number.isFinite(bpm) || bpm < 20 || bpm > 300)
            error('Tempo must be between 20 and 300 BPM.');
          else result.tempo = bpm;
        } else if (value !== '4/4') error('Only time 4/4 is supported in this release.');
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
        if (chain)
          error('Pedal chains are planned for stage 3; remove “through” to play this score.');
        const prefix = /^track\s+\S+\s+using\s+/.exec(line)![0];
        current = {
          key,
          instrumentKey,
          instrumentFrom: from + prefix.length,
          instrumentTo: from + prefix.length + instrumentKey.length,
          bodyTo: to,
          events: [],
          beats: 0,
        };
        result.tracks.push(current);
        return;
      }
      if (/^master\b/.test(line))
        error('Master pedals are planned for stage 3; remove this directive to play.');
      else error('Expected tempo, time, or track <key> using <instrumentKey> { on its own line.');
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
  { name: 'time', description: 'Measure grid · currently 4/4', snippet: 'time 4/4' },
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
    snippet: '// A little room to breathe',
  },
];
