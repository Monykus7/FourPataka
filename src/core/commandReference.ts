import { type CommandDefinition } from './commands';

export interface ReferenceContext {
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
