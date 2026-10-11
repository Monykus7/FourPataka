import { SCORE_KEY } from './music';
import { COMMANDS, parseScore } from './parser';
import { nextMeterBoundary } from './meter';
import { nextSectionName } from './scoreSections';

export function addMeterChange(
  text: string,
  keys: string[],
  chainKeys: string[],
  meter: string,
  beat: string,
) {
  assertEditable(text, keys, chainKeys);
  if (!meter || !beat || /\s/.test(meter + beat))
    throw new Error('Provide a meter and quarter-beat position.');
  const next = `${text.trimEnd()}\n\ntime ${meter} at ${beat}\n`;
  assertEditable(next, keys, chainKeys);
  return next;
}

export function nextTrackKey(text: string, instrumentKeys: string[], prefix = 'lead') {
  const keys = new Set(parseScore(text, instrumentKeys).tracks.map((t) => t.key));
  let candidate = prefix;
  let index = 2;
  while (keys.has(candidate)) candidate = `${prefix}${index++}`;
  return candidate;
}
function assertEditable(text: string, keys: string[], chainKeys: string[] = []) {
  const parsed = parseScore(text, keys, chainKeys);
  if (parsed.diagnostics.some((d) => d.message !== 'Add a track to start composing.')) {
    throw new Error('Fix the score diagnostics before using composition controls.');
  }
  return parsed;
}
export function setScoreDirective(
  text: string,
  instrumentKeys: string[],
  name: 'tempo' | 'time',
  value: string,
  chainKeys: string[] = [],
) {
  const parsed = assertEditable(text, instrumentKeys, chainKeys);
  if (!value || /\s/.test(value)) throw new Error('Use one directive value without whitespace.');
  const check = parseScore(
    `${name} ${value}\ntrack check using ${instrumentKeys[0]} {\nC4 quarter\n}`,
    instrumentKeys,
  );
  if (check.diagnostics.length) throw new Error(check.diagnostics[0].message);
  const span = parsed.directives[name];
  return span
    ? text.slice(0, span.from) + value + text.slice(span.to)
    : `${name} ${value}\n` + text;
}
export function appendTrack(
  text: string,
  instrumentKeys: string[],
  key: string,
  instrumentKey: string,
  events: string[],
  chainKeys: string[] = [],
  chainKey: string | null = null,
) {
  const parsed = assertEditable(text, instrumentKeys, chainKeys);
  if (!SCORE_KEY.test(key) || key.length > 100)
    throw new Error('Use a track key starting with a letter, followed by letters, digits, or _.');
  if (parsed.tracks.some((t) => t.key === key)) throw new Error(`Track “${key}” already exists.`);
  if (parsed.tracks.length >= 128) throw new Error('A project may contain at most 128 tracks.');
  if (!instrumentKeys.includes(instrumentKey))
    throw new Error('Choose an existing instrument preset.');
  if (!events.length) throw new Error('Add at least one note, chord, or rest.');
  if (events.some((event) => event.includes('\n') || event.includes('\r')))
    throw new Error('Use one event per row.');
  if (chainKey && !chainKeys.includes(chainKey)) throw new Error('Choose an existing pedal chain.');
  const block = `track ${key} using ${instrumentKey}${chainKey ? ` through ${chainKey}` : ''} {\n${events.map((e) => `  ${e}`).join('\n')}\n}`;
  const checked = parseScore(block, instrumentKeys, chainKeys);
  if (checked.diagnostics.length) throw new Error(checked.diagnostics[0].message);
  return text + (text.trim() ? (text.endsWith('\n') ? '\n' : '\n\n') : '') + block + '\n';
}
export function setScoreChain(
  text: string,
  instrumentKeys: string[],
  chainKeys: string[],
  targetKey: string | null,
  key: string | null,
) {
  const parsed = assertEditable(text, instrumentKeys, chainKeys);
  if (key !== null && (!SCORE_KEY.test(key) || key.length > 100 || !chainKeys.includes(key)))
    throw new Error('Choose an existing pedal score key.');
  if (targetKey === null) {
    const master = parsed.master;
    if (!key)
      return master ? text.slice(0, master.commandFrom) + text.slice(master.commandTo) : text;
    return master
      ? text.slice(0, master.from) + key + text.slice(master.to)
      : `master through ${key}${text.includes('\r\n') ? '\r\n' : '\n'}` + text;
  }
  const track = parsed.tracks.find((t) => t.key === targetKey);
  if (!track) throw new Error('Choose an existing track for pedal assignment.');
  if (!key)
    return track.chainKey ? text.slice(0, track.instrumentTo) + text.slice(track.chainTo) : text;
  if (track.chainKey) return text.slice(0, track.chainFrom) + key + text.slice(track.chainTo);
  return text.slice(0, track.instrumentTo) + ` through ${key}` + text.slice(track.instrumentTo);
}
export function setScoreInstrument(
  text: string,
  instrumentKeys: string[],
  chainKeys: string[],
  targetKey: string,
  instrumentKey: string,
) {
  const parsed = assertEditable(text, instrumentKeys, chainKeys);
  if (!instrumentKeys.includes(instrumentKey))
    throw new Error('Choose an existing instrument preset.');
  const target = parsed.tracks.find((track) => track.key === targetKey);
  if (!target) throw new Error('Choose an existing track for instrument assignment.');
  // Replace only the parser-owned key span; routing and comments belong to the user.
  return text.slice(0, target.instrumentFrom) + instrumentKey + text.slice(target.instrumentTo);
}
export function insertCommand(
  text: string,
  instrumentKeys: string[],
  name: string,
  targetKey: string,
  instrumentKey: string,
  chainKeys: string[] = [],
  chainKey = chainKeys.includes('warmDrive') ? 'warmDrive' : chainKeys[0],
  sectionKey?: string,
) {
  const parsed = assertEditable(text, instrumentKeys, chainKeys);
  const command = COMMANDS.find((c) => c.name === name);
  if (!command) throw new Error('Unknown command card.');
  if (name === 'track')
    return appendTrack(
      text,
      instrumentKeys,
      nextTrackKey(text, instrumentKeys),
      instrumentKey,
      ['C5 quarter'],
      chainKeys,
    );
  if (name === 'using')
    return setScoreInstrument(text, instrumentKeys, chainKeys, targetKey, instrumentKey);
  if (name === 'master' || name === 'through') {
    if (!chainKey) throw new Error('Save a pedal chain first.');
    return setScoreChain(
      text,
      instrumentKeys,
      chainKeys,
      name === 'master' ? null : targetKey,
      chainKey,
    );
  }
  if (name === 'tempo' || name === 'time') {
    return setScoreDirective(text, instrumentKeys, name, command.snippet.split(' ')[1], chainKeys);
  }
  if (name === 'meter-change')
    return addMeterChange(
      text,
      instrumentKeys,
      chainKeys,
      '7/8',
      String(nextMeterBoundary(parsed.beats, parsed.meter, parsed.meterChanges)),
    );
  const target = parsed.tracks.find((t) => t.key === targetKey);
  if (!target) throw new Error('Make a track or choose an insertion destination first.');
  const names = parsed.sections
    .filter((section) => section.track === targetKey)
    .map((section) => section.name);
  let snippet = command.snippet;
  if (name === 'section')
    snippet = `section ${nextSectionName(names)} {\n  C4 quarter\n  D4 quarter\n}`;
  if (name === 'play' || name === 'play-trim') {
    const selected = sectionKey ?? names[0];
    if (!selected || !names.includes(selected))
      throw new Error('Define a section in this track first.');
    snippet = name === 'play' ? `play ${selected}` : `play ${selected} trim 0 {\n  E4 quarter\n}`;
  }
  const lineStart = text.lastIndexOf('\n', target.bodyTo - 1) + 1;
  // Inline ] } closes the scope before the track brace; insert after those delimiters.
  const inline = text.slice(lineStart, target.bodyTo).trim().length > 0;
  const insertion = inline ? target.bodyTo : lineStart;
  return text.slice(0, insertion) + `${inline ? '\n' : ''}  ${snippet}\n` + text.slice(insertion);
}
