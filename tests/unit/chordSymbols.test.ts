import { describe, expect, it } from 'vitest';
import { expandChordSymbol } from '../../src/core/chordSymbols';
import { parseScore } from '../../src/core/parser';
import { createChordShapeRegistry } from '../../src/modules/chords';

describe('registered chord symbols', () => {
  it('expands compound degrees in ascending root position with predictable octaves', () => {
    expect(expandChordSymbol('Cmaj13#11').notes).toEqual([
      'C4',
      'E4',
      'G4',
      'B4',
      'D5',
      'F#5',
      'A5',
    ]);
    expect(expandChordSymbol('Bbmaj7@3').notes).toEqual(['Bb3', 'D4', 'F4', 'A4']);
    expect(expandChordSymbol('C').notes).toEqual(['C4', 'E4', 'G4']);
    expect(expandChordSymbol('Cdim7').notes).toEqual(['C4', 'Eb4', 'Gb4', 'A4']);
    expect(expandChordSymbol('Cb').notes).toEqual(['Cb4', 'Eb4', 'Gb4']);
  });
  it('rejects unknown shapes, invalid roots and out-of-range voicings', () => {
    for (const symbol of ['Cunknown', 'Hmaj7', 'Cmaj7@9', 'Bmaj13@8'])
      expect(() => expandChordSymbol(symbol)).toThrow();
  });
  it('uses contributed definitions without a parser branch and preserves source spans', () => {
    const registry = createChordShapeRegistry([
      {
        id: 'test:wide',
        apiVersion: 1,
        label: 'Wide',
        aliases: ['wide'],
        tones: [
          { degree: 0, semitones: 0 },
          { degree: 7, semitones: 12 },
        ],
      },
    ]);
    const text = 'track lead using sine {\n  chord: Cwide@3 quarter // original\n}';
    const score = parseScore(text, ['sine'], [], registry);
    expect(score.diagnostics).toEqual([]);
    const event = score.events[0];
    expect(event.notes).toEqual(['C3', 'C4']);
    expect(text.slice(event.chordSymbol!.from, event.chordSymbol!.to)).toBe('Cwide@3');
    const explicit = parseScore('track lead using sine {\n chord:(C3 C4) quarter\n}', ['sine']);
    expect(event.frequencies).toEqual(explicit.events[0].frequencies);
    expect(event.duration).toBe(explicit.events[0].duration);
    expect(parseScore(text, ['sine']).diagnostics[0].message).toContain('Unknown chord shape');
  });
});
