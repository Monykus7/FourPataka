import { SCORE_KEY } from './music';
import { COMMANDS, parseScore } from './parser';

export function nextTrackKey(text: string, instrumentKeys: string[], prefix = 'lead') {
  const keys = new Set(parseScore(text, instrumentKeys).tracks.map(t => t.key));
  let candidate = prefix; let index = 2;
  while (keys.has(candidate)) candidate = `${prefix}${index++}`;
  return candidate;
}
function assertEditable(text: string, keys: string[]) {
  const parsed = parseScore(text, keys);
  if (parsed.diagnostics.some(d => d.message !== 'Add a track to start composing.')) {
    throw new Error('Fix the score diagnostics before using the track maker or command cards.');
  }
  return parsed;
}
export function appendTrack(text: string, instrumentKeys: string[], key: string, instrumentKey: string, events: string[]) {
  const parsed = assertEditable(text, instrumentKeys);
  if (!SCORE_KEY.test(key) || key.length > 100) throw new Error('Use a track key starting with a letter, followed by letters, digits, or _.');
  if (parsed.tracks.some(t => t.key === key)) throw new Error(`Track “${key}” already exists.`);
  if (parsed.tracks.length >= 128) throw new Error('A project may contain at most 128 tracks.');
  if (!instrumentKeys.includes(instrumentKey)) throw new Error('Choose an existing instrument preset.');
  if (!events.length) throw new Error('Add at least one note, chord, or rest.');
  if (events.some(event => event.includes('\n') || event.includes('\r'))) throw new Error('Use one event per row.');
  const block = `track ${key} using ${instrumentKey} {\n${events.map(e => `  ${e}`).join('\n')}\n}`;
  const checked = parseScore(block, instrumentKeys);
  if (checked.diagnostics.length) throw new Error(checked.diagnostics[0].message);
  return text + (text.trim() ? text.endsWith('\n') ? '\n' : '\n\n' : '') + block + '\n';
}
export function insertCommand(text: string, instrumentKeys: string[], name: string, targetKey: string, instrumentKey: string) {
  const parsed = assertEditable(text, instrumentKeys);
  const command = COMMANDS.find(c => c.name === name);
  if (!command) throw new Error('Unknown command card.');
  if (name === 'track') return appendTrack(text, instrumentKeys, nextTrackKey(text, instrumentKeys), instrumentKey, ['C5 quarter']);
  if (name === 'tempo' || name === 'time') {
    const existing = new RegExp(`^([\\t ]*${name}\\s+)(\\S+)`, 'm').exec(text);
    if (!existing) return command.snippet + '\n' + text;
    const valueFrom = existing.index + existing[1].length;
    return text.slice(0, valueFrom) + command.snippet.split(' ')[1] + text.slice(valueFrom + existing[2].length);
  }
  const target = parsed.tracks.find(t => t.key === targetKey);
  if (!target) throw new Error('Make a track or choose an insertion destination first.');
  const lineStart = text.lastIndexOf('\n', target.bodyTo - 1) + 1;
  return text.slice(0, lineStart) + `  ${command.snippet}\n` + text.slice(lineStart);
}
