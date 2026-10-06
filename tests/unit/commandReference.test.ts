import { describe, expect, it } from 'vitest';
import { COMMANDS } from '../../src/core/commands';
import {
  insertionReason,
  referenceSnippet,
  matchesCommand,
  searchCommands,
} from '../../src/core/commandReference';
import { insertCommand, setScoreInstrument } from '../../src/core/scoreTools';
import { parseScore } from '../../src/core/parser';

const keys = ['personalKeys', 'quietBrass'];
const chains = ['bodyChain'];
const text =
  '// retained\r\ntrack lead using personalKeys through bodyChain { // header\r\n C4 quarter\r\n}\r\n';
const context = {
  instrumentKey: 'quietBrass',
  chainKey: 'bodyChain',
  newTrackKey: 'lead2',
  targetKey: 'lead',
  playing: false,
  invalid: false,
};
const command = (name: string) => COMMANDS.find((item) => item.name === name)!;

describe('contextual command reference', () => {
  it('looks up command names without incidental mentions in other rules', () => {
    for (const name of [
      'time',
      'tempo',
      'track',
      'rest',
      'chord',
      'legato',
      'staccato',
      'tuplet',
      'repeat',
    ]) {
      expect(
        searchCommands(name, context).map((card) => card.name),
        name,
      ).toEqual([name]);
    }
    expect(searchCommands('  STACCATO[', context).map((card) => card.name)).toEqual(['staccato']);
    expect(searchCommands('rest bar', context).map((card) => card.name)).toEqual(['rest-bar']);
    expect(searchCommands('chord:', context).map((card) => card.name)).toEqual(['chord']);
    expect(searchCommands('chord symbol', context).map((card) => card.name)).toEqual([
      'chord-symbol',
    ]);
    expect(searchCommands('leg', context).map((card) => card.name)).toEqual(['legato']);
    expect(searchCommands('chord s', context).map((card) => card.name)).toEqual(['chord-symbol']);
  });
  it('retains rule/key searches and constrains named queries before applying extra terms', () => {
    expect(searchCommands('master bodyChain', context).map((card) => card.name)).toEqual([
      'master',
    ]);
    expect(searchCommands('master missing', context)).toEqual([]);
    expect(searchCommands('duration 0.25', context).map((card) => card.name)).toContain('note');
    expect(searchCommands('bodyChain', context).map((card) => card.name)).toEqual([
      'master',
      'through',
    ]);
    expect(searchCommands('', context)).toEqual(COMMANDS);
    expect(searchCommands('nonsense command', context)).toEqual([]);
  });
  it('inserts every card with a custom-only library and shows matching routing/new-track examples', () => {
    for (const card of COMMANDS) {
      const inserted = insertCommand(
        text,
        keys,
        card.name,
        context.targetKey,
        context.instrumentKey,
        chains,
        context.chainKey,
      );
      expect(parseScore(inserted, keys, chains).diagnostics, card.name).toEqual([]);
      expect(inserted, card.name).toContain(referenceSnippet(card, context));
    }
  });
  it('instrument assignment preserves exact comments, CRLF, events and pedal keys', () => {
    expect(setScoreInstrument(text, keys, chains, 'lead', 'quietBrass')).toBe(
      text.replace('using personalKeys', 'using quietBrass'),
    );
    expect(setScoreInstrument(text, keys, chains, 'lead', 'personalKeys')).toBe(text);
    expect(() => setScoreInstrument(text, keys, chains, 'gone', 'quietBrass')).toThrow(
      'existing track',
    );
    expect(() => setScoreInstrument(text, keys, chains, 'lead', 'missing')).toThrow('instrument');
    expect(() => setScoreInstrument('track broken {', keys, chains, 'lead', 'quietBrass')).toThrow(
      'diagnostics',
    );
  });
  it('allows project and first-track cards on an empty score while explaining unavailable actions', () => {
    const empty = { ...context, targetKey: '' };
    for (const card of COMMANDS) {
      expect(insertionReason(card, empty)).toBe(
        card.scope === 'track' ? 'Create a track first.' : null,
      );
      if (card.scope !== 'track') {
        const result = insertCommand(
          '',
          keys,
          card.name,
          '',
          context.instrumentKey,
          chains,
          context.chainKey,
        );
        const parsed = parseScore(result, keys, chains);
        expect(
          parsed.diagnostics.filter((item) => item.message !== 'Add a track to start composing.'),
        ).toEqual([]);
      }
    }
    expect(insertionReason(command('master'), { ...empty, chainKey: '' })).toBe(
      'Save a pedal chain first.',
    );
    expect(insertionReason(command('note'), { ...context, playing: true })).toContain('Stop');
    expect(insertionReason(command('tempo'), { ...context, invalid: true })).toContain(
      'diagnostics',
    );
  });
  it('searches syntax, restrictions, units and selected preset keys using all query terms', () => {
    expect(matchesCommand(command('master'), 'master through bodyChain', 'BODYCHAIN master')).toBe(
      true,
    );
    expect(matchesCommand(command('note'), 'C5 quarter', 'duration 0.25')).toBe(true);
    expect(matchesCommand(command('through'), 'through bodyChain', 'header cables')).toBe(true);
    expect(matchesCommand(command('note'), 'C5 quarter', 'master bodyChain')).toBe(false);
  });
});
