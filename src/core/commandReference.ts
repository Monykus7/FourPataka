import { COMMANDS, type CommandDefinition } from './commands';
import { nextSectionName } from './scoreSections';

export interface ReferenceContext {
  sectionNames?: string[];
  sectionKey?: string;
  meterChangeBeat?: number;
  instrumentKey: string;
  chainKey: string;
  newTrackKey: string;
  targetKey: string;
  playing: boolean;
  invalid: boolean;
}

export function referenceSnippet(command: CommandDefinition, context: ReferenceContext) {
  switch (command.name) {
    case 'section':
      return `section ${nextSectionName(context.sectionNames ?? [])} {\n  C4 quarter\n  D4 quarter\n}`;
    case 'play':
      return `play ${context.sectionKey || 'A'}`;
    case 'play-trim':
      return `play ${context.sectionKey || 'A'} trim 0 {\n  E4 quarter\n}`;
    case 'meter-change':
      return `time 7/8 at ${context.meterChangeBeat ?? 4}`;
    case 'track':
      return `track ${context.newTrackKey} using ${context.instrumentKey} {\n  C5 quarter\n}`;
    case 'using':
      return `using ${context.instrumentKey}`;
    case 'through':
      return `through ${context.chainKey}`;
    case 'master':
      return `master through ${context.chainKey}`;
    default:
      return command.snippet;
  }
}

export function insertionReason(command: CommandDefinition, context: ReferenceContext) {
  if (context.playing) return 'Stop score playback to insert commands.';
  if (context.invalid) return 'Fix score diagnostics before inserting commands.';
  if (command.scope === 'track' && !context.targetKey) return 'Create a track first.';
  if (['play', 'play-trim'].includes(command.name) && !context.sectionKey)
    return 'Define a section in this track first.';
  if (['track', 'using'].includes(command.name) && !context.instrumentKey)
    return 'Save an instrument preset first.';
  if (['through', 'master'].includes(command.name) && !context.chainKey)
    return 'Save a pedal chain first.';
  return null;
}

export function insertionDestination(command: CommandDefinition, context: ReferenceContext) {
  if (command.scope === 'project') return command.name === 'master' ? 'Master mix' : 'Project';
  if (command.scope === 'new-track') return `New track: ${context.newTrackKey}`;
  return context.targetKey ? `Track: ${context.targetKey}` : 'Requires a track';
}

export function matchesCommand(command: CommandDefinition, snippet: string, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const text =
    `${command.name} ${command.group} ${command.description} ${command.syntax} ${command.rules} ${snippet}`.toLowerCase();
  return terms.every((term) => text.includes(term));
}

export function searchCommands(query: string, context: ReferenceContext) {
  const nameQuery = query
    .trim()
    .toLowerCase()
    .replace(/[:[{}]+$/, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
  if (!nameQuery) return COMMANDS;
  const nameOf = (command: CommandDefinition) => command.name.replace(/-/g, ' ');
  // Resolve names before prose: rules often mention other commands as restrictions.
  const exact = COMMANDS.filter((command) => nameOf(command) === nameQuery);
  if (exact.length) return exact;
  const prefixes = COMMANDS.filter((command) => nameOf(command).startsWith(nameQuery));
  if (prefixes.length) return prefixes;
  const firstTerm = nameQuery.split(/\s+/)[0];
  const named = COMMANDS.filter((command) => nameOf(command) === firstTerm);
  const candidates = named.length ? named : COMMANDS;
  return candidates.filter((command) =>
    matchesCommand(command, referenceSnippet(command, context), query),
  );
}
