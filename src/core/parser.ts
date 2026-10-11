import { SCORE_KEY, pitch } from './music';
import { beatExpression } from './beatExpression';
import { scoreTiming, restToBar } from './scoreTiming';
import { lexScore, type ScoreToken } from './scoreLexer';
import { indexScoreSections, type SectionSource } from './scoreSections';
import { addBeats, beatValue, parseDuration, fraction, type BeatFraction } from './rhythm';
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
  sectionCalls?: SectionInvocation[];
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
export interface SectionInvocation {
  id: string;
  track: string;
  name: string;
  from: number;
  to: number;
  line: number;
  definitionFrom: number;
  definitionTo: number;
  beat: number;
  duration: number;
  originalDuration: number;
  trimmedBeats: number;
  endingDuration: number;
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
  sections: SectionSource[];
  sectionInvocations: SectionInvocation[];
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
    sections: [],
    sectionInvocations: [],
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
  const blocks: (ScoreToken & { id: number; ratio?: BeatFraction })[] = [];
  const eventBlocks = new WeakMap<ScoreEvent, number>();
  let blockId = 0;
  const reportUnclosed = () => {
    for (const block of blocks)
      result.diagnostics.push({
        from: block.from,
        to: block.to,
        line: block.line,
        message: `${block.articulation ?? block.modifier} block is missing its closing ].`,
      });
    blocks.length = 0;
  };
  const tokens = lexScore(text);
  const sectionIndex = indexScoreSections(text, tokens);
  result.sections = sectionIndex.sections;
  result.diagnostics.push(...sectionIndex.diagnostics);
  const definitions = new Map<string, Map<string, SectionSource>>();
  for (const section of sectionIndex.sections) {
    const local = definitions.get(section.track) ?? new Map<string, SectionSource>();
    local.set(section.name, section);
    definitions.set(section.track, local);
  }
  const usedSections = new Set<SectionSource>();
  const callStack: SectionInvocation[] = [];
  let invocationId = 0;
  // Read global timing first so directives below tracks also govern positional bar rests.
  const timing = scoreTiming(tokens);
  let exhausted = false;
  const consumeToken = (token: ScoreToken) => {
    const { text: line, from, to } = token;
    const error = (message: string, start = from, end = to) =>
      result.diagnostics.push({
        from: start,
        to: Math.max(start + 1, end),
        line: token.line,
        message,
      });
    if (token.kind === 'articulation-open' || token.kind === 'tuplet-open') {
      if (!current) error('Articulation and tuplet blocks belong inside a track.');
      else if (blocks.length >= 64) error('Score blocks may nest at most 64 levels.');
      else {
        let ratio: BeatFraction | undefined;
        if (token.modifier) {
          try {
            ratio = parseDuration('quarter', token.modifier).beats;
          } catch (e) {
            error((e as Error).message);
          }
        }
        blocks.push({ ...token, id: ++blockId, ratio });
      }
      return;
    }
    if (token.kind === 'block-close') {
      if (!blocks.length)
        error('Unexpected closing ]; open an articulation or tuplet block first.');
      else blocks.pop();
      return;
    }
    if (token.kind === 'bracket-open') {
      error('Use staccato[, legato[, triplet[ or tuplet:N:M[ to open a block.');
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
      const meterChange = /^time\s+(\S+)\s+at\s+(.+)$/.exec(line);
      if (meterChange) {
        try {
          const beat = beatValue(beatExpression(meterChange[2]));
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
    const barRest = /^rest\s+(?:bar|till end of bar)$/.test(line);
    const event =
      /^(.*?)\s+(whole|half|quarter|eighth|8th|16th|32nd|64th)(\.{0,2})(?:\s+(triplet|tuplet:\d+:\d+))?(?:\s+(staccato|legato))?$/.exec(
        line,
      );
    if (!event && !barRest) {
      error(
        'Expected a note, chord, or rest followed by a duration, optional triplet/tuplet:N:M and staccato/legato.',
      );
      return;
    }
    const [, expression, word, dots, modifier, suffixArticulation] = event ?? [
      '',
      'rest',
      'quarter',
      '',
      undefined,
      undefined,
    ];
    const block = [...blocks].reverse().find((scope) => scope.articulation);
    const articulation =
      expression === 'rest' ? suffixArticulation : (suffixArticulation ?? block?.articulation);
    let notes: string[] = [];
    let chordSymbol: ScoreEvent['chordSymbol'];
    try {
      const written = barRest
        ? {
            beats: restToBar(positions.get(current.key) ?? fraction(0n, 1n), timing),
            duration: 0,
            tuplet: undefined as ReturnType<typeof parseDuration>['tuplet'],
          }
        : parseDuration(word + dots, modifier);
      // Each enclosing tuplet contributes an exact scale; articulation scopes are independent.
      let ratioNotes = BigInt(written.tuplet?.notes ?? 1);
      let ratioTime = BigInt(written.tuplet?.inTimeOf ?? 1);
      for (const scope of blocks)
        if (scope.ratio && !barRest) {
          written.beats = fraction(
            written.beats.numerator * scope.ratio.numerator,
            written.beats.denominator * scope.ratio.denominator,
          );
          ratioNotes *= scope.ratio.denominator;
          ratioTime *= scope.ratio.numerator;
        }
      written.duration = beatValue(written.beats);
      const combinedRatio = fraction(ratioTime, ratioNotes);
      // Keep display metadata finite by reducing nested ratios before numeric conversion.
      if (!barRest && blocks.some((scope) => scope.ratio))
        written.tuplet = {
          notes: Number(combinedRatio.denominator),
          inTimeOf: Number(combinedRatio.numerator),
        };
      if (expression === 'rest' && articulation)
        throw new Error('Rests cannot have staccato or legato articulation.');
      if (expression === 'rest') notes = [];
      else if (
        /^chord\b/.test(expression) ||
        (!/^[A-G][#b]?\d+$/.test(expression) &&
          /^[A-G][#b]?[A-Za-z][A-Za-z0-9#+-]*(?:@[0-8])?$/.test(expression))
      ) {
        const symbolic = /^chord\s*:\s*([^()\s]+)$/.exec(expression);
        const symbol = symbolic?.[1] ?? (!/^chord\b/.test(expression) ? expression : undefined);
        if (symbol) {
          const expansion = expandChordSymbol(symbol, chordShapes);
          const symbolFrom = from + expression.lastIndexOf(symbol);
          chordSymbol = { ...expansion, from: symbolFrom, to: symbolFrom + symbol.length };
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
      if (result.events.length >= 10000) {
        error('A compiled score may contain at most 10,000 events.');
        exhausted = true;
        return;
      }
      const compiled: ScoreEvent = {
        ...(callStack.length ? { sectionCalls: [...callStack] } : {}),
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
  };
  let visits = 0;
  const visit = (start: number, end: number, depth: number, ancestry: SectionSource[] = []) => {
    for (let i = start; i < end && !exhausted; i++) {
      const token = tokens[i];
      const error = (message: string) =>
        result.diagnostics.push({ from: token.from, to: token.to, line: token.line, message });
      if (++visits > 100000) {
        error('Repeat expansion exceeds 100,000 token visits.');
        exhausted = true;
        break;
      }
      if (token.kind === 'section-open') {
        const close = sectionIndex.closes.get(i);
        if (close === undefined || close >= end) {
          error('Section block is missing its closing }.');
          break;
        }
        // Definitions declare source only. Forward references resolve through
        // the track-local index; no events or time are consumed by declaration.
        i = close;
        continue;
      }
      if (token.kind === 'section-play' || token.kind === 'ending-open') {
        const close = token.kind === 'ending-open' ? sectionIndex.closes.get(i) : i;
        if (close === undefined || close >= end) {
          error('Alternate ending block is missing its closing }.');
          break;
        }
        const section = current && definitions.get(current.key)?.get(token.sectionName!);
        if (!section) error(`Unknown section “${token.sectionName}” in this track.`);
        else if (ancestry.includes(section))
          error(`Cyclic section reference to “${section.name}”.`);
        else if (ancestry.length >= 16) error('Section calls may nest at most 16 levels.');
        else if (token.trimExpression || token.kind === 'ending-open')
          error('Alternate endings are not available in this parser checkpoint.');
        else if (result.sectionInvocations.length >= 10000) {
          error('A score may expand at most 10,000 section calls.');
          exhausted = true;
        } else {
          const track = current!;
          const outer = [...blocks];
          const call: SectionInvocation = {
            id: `${track.key}:section:${invocationId++}`,
            track: track.key,
            name: section.name,
            from: token.from,
            to: token.to,
            line: token.line,
            definitionFrom: section.from,
            definitionTo: section.to,
            beat: track.beats,
            duration: 0,
            originalDuration: 0,
            trimmedBeats: 0,
            endingDuration: 0,
          };
          usedSections.add(section);
          result.sectionInvocations.push(call);
          callStack.push(call);
          visit(section.open + 1, section.close, depth, [...ancestry, section]);
          callStack.pop();
          if (
            blocks.length !== outer.length ||
            blocks.some((block, index) => block !== outer[index])
          ) {
            error('Bracket groups must close within the section where they opened.');
            blocks.splice(0, blocks.length, ...outer);
          }
          call.duration = call.originalDuration = track.beats - call.beat;
        }
        i = close;
        continue;
      }
      if (token.kind !== 'repeat-open') {
        consumeToken(token);
        continue;
      }
      const close = sectionIndex.closes.get(i);
      if (close === undefined || close >= end) {
        error('Repeat block is missing its closing }.');
        break;
      }
      const count = token.repeatCount!;
      if (!current) error('Repeat blocks belong inside a track.');
      else if (depth >= 16 || !Number.isInteger(count) || count < 1 || count > 128)
        error('Repeat count must be 1–128, with at most 16 nested repeat levels.');
      else {
        const outer = [...blocks];
        // Recompile each pass: rest-to-bar alignment is position dependent; source spans stay original.
        for (let pass = 0; pass < count && !exhausted; pass++) {
          const errorsBefore = result.diagnostics.length;
          visit(i + 1, close, depth + 1, ancestry);
          if (
            blocks.length !== outer.length ||
            blocks.some((block, index) => block !== outer[index])
          ) {
            error('Bracket groups must close within the repeat block where they opened.');
            blocks.splice(0, blocks.length, ...outer);
          }
          // Invalid source should report once, rather than duplicate its errors per play.
          if (result.diagnostics.length > errorsBefore) break;
        }
      }
      i = close;
    }
  };
  visit(0, tokens.length, 0);
  reportUnclosed();
  if (current)
    result.diagnostics.push({
      from: Math.max(0, text.length - 1),
      to: text.length,
      line: lines.length,
      message: `Track “${(current as ScoreTrack).key}” is missing its closing brace.`,
    });
  // Validate unused definitions too, in a scratch track at beat zero. This
  // checks music/reference errors without scheduling declarations or leaking
  // their events, clocks or invocation metadata into the actual composition.
  const savedTrack = current;
  const realEvents = result.events;
  const realCalls = result.sectionInvocations;
  for (const section of sectionIndex.sections) {
    if (usedSections.has(section) || section.close < 0 || exhausted) continue;
    const owner = result.tracks.find((track) => track.key === section.track);
    if (!owner) continue;
    const position = positions.get(owner.key);
    current = { ...owner, events: [], beats: 0 };
    positions.set(owner.key, fraction(0n, 1n));
    result.events = [];
    result.sectionInvocations = [];
    usedSections.add(section);
    visit(section.open + 1, section.close, 0, [section]);
    reportUnclosed();
    if (position) positions.set(owner.key, position);
    else positions.delete(owner.key);
  }
  result.events = realEvents;
  result.sectionInvocations = realCalls;
  current = savedTrack;
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
