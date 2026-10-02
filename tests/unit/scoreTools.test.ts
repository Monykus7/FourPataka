import { describe, expect, it } from 'vitest';
import {
  appendTrack,
  insertCommand,
  nextTrackKey,
  setScoreDirective,
  setScoreChain,
} from '../../src/core/scoreTools';
import { parseScore } from '../../src/core/parser';
const keys = ['sine', 'brightReed'];
const original = '// keep me\ntempo 80 // slow\ntrack lead using sine {\n  C4 quarter\n}\n';
describe('source-authoritative composition tools', () => {
  it('edits and removes chain assignments without damaging comments, spacing or events', () => {
    const chains = ['clean', 'warmDrive', 'cleanGlue'];
    const text =
      '  master  through cleanGlue // mix\r\ntrack lead using sine   through warmDrive { // lead\r\n C4 quarter\r\n}\r\n';
    expect(setScoreChain(text, keys, chains, 'lead', 'clean')).toBe(
      text.replace('through warmDrive', 'through clean'),
    );
    const removed = setScoreChain(text, keys, chains, 'lead', null);
    expect(removed).toBe(text.replace('   through warmDrive', ''));
    expect(setScoreChain(text, keys, chains, null, null)).toBe(
      text.replace('master  through cleanGlue', ''),
    );
    expect(setScoreChain(removed, keys, chains, 'lead', 'warmDrive')).toContain(
      'using sine through warmDrive { // lead',
    );
    expect(setScoreDirective(text, keys, 'tempo', '90', chains)).toContain('tempo 90');
    expect(appendTrack(text, keys, 'bass', 'sine', ['C2 half'], chains, 'clean')).toContain(
      'using sine through clean',
    );
    expect(insertCommand(text, keys, 'master', 'lead', 'sine', chains, 'clean')).toBe(
      text.replace('through cleanGlue', 'through clean'),
    );
    expect(insertCommand(text, keys, 'through', 'lead', 'sine', chains, 'clean')).toBe(
      text.replace('through warmDrive', 'through clean'),
    );
    expect(() => setScoreChain(text, keys, chains, 'lead', 'unknown')).toThrow('score key');
  });
  it('edits exact global value spans while preserving comments, CRLF and whitespace', () => {
    const text = '// time 4/4\r\n\t time  3/4 // waltz\r\n' + original;
    const result = setScoreDirective(text, keys, 'time', '6/8');
    expect(result).toBe(text.replace('time  3/4', 'time  6/8'));
    expect(parseScore(result, keys).meter).toEqual({ numerator: 6, denominator: 8 });
    expect(setScoreDirective(original, keys, 'tempo', '95.5')).toBe(
      original.replace('tempo 80', 'tempo 95.5'),
    );
  });
  it('adds missing directives, supports empty projects and refuses invalid edits', () => {
    expect(setScoreDirective('', keys, 'time', '7/8')).toBe('time 7/8\n');
    expect(() => setScoreDirective(original, keys, 'time', '3/3')).toThrow('Time signature');
    expect(() => setScoreDirective(original, keys, 'tempo', '301')).toThrow('Tempo');
    expect(() => setScoreDirective(original, keys, 'time', '3/4\nrest quarter')).toThrow();
    expect(() => setScoreDirective('time 4/4\ntime 3/4', keys, 'time', '6/8')).toThrow('Fix');
  });
  it('adds a valid independent track without changing existing text', () => {
    const result = appendTrack(original, keys, 'bass', 'brightReed', ['Bb2 half', 'F2 half']);
    expect(result.startsWith(original)).toBe(true);
    expect(parseScore(result, keys).diagnostics).toEqual([]);
    expect(parseScore(result, keys).tracks[1].beats).toBe(4);
  });
  it('creates the first track from an empty score', () =>
    expect(
      parseScore(appendTrack('', keys, 'lead', 'sine', ['C4 quarter']), keys).diagnostics,
    ).toEqual([]));
  it('finds unique track keys', () => expect(nextTrackKey(original, keys)).toBe('lead2'));
  it('updates global values without duplicate directives or losing comments', () => {
    const text = insertCommand(original, keys, 'tempo', 'lead', 'sine');
    expect(text).toBe(original.replace('tempo 80', 'tempo 120'));
    expect(text.match(/tempo/g)).toHaveLength(1);
  });
  it('inserts event cards into the chosen track before its closing brace', () => {
    const two = appendTrack(original, keys, 'bass', 'sine', ['C2 half']);
    const result = insertCommand(two, keys, 'chord', 'bass', 'sine');
    const compiled = parseScore(result, keys);
    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.tracks[0].events).toHaveLength(1);
    expect(compiled.tracks[1].events).toHaveLength(2);
    expect(compiled.tracks[1].events[1].notes).toEqual(['Bb5', 'D5', 'F5']);
  });
  it.each([
    ['lead', 'sine', ['C4 half']],
    ['bad-key', 'sine', ['C4 half']],
    ['bass', 'missing', ['C4 half']],
    ['bass', 'sine', ['C9 half']],
    ['bass', 'sine', []],
  ])('rejects invalid or duplicate tracks', (key, instrument, events) =>
    expect(() =>
      appendTrack(original, keys, key as string, instrument as string, events as string[]),
    ).toThrow(),
  );
  it('leaves invalid scores alone and refuses header injection through event rows', () => {
    expect(() => insertCommand('track {', keys, 'note', 'lead', 'sine')).toThrow();
    expect(() =>
      appendTrack(original, keys, 'bass', 'sine', ['C4 half\n}\ntrack injected using sine {']),
    ).toThrow();
  });
});
