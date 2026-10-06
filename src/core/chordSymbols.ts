import { pitch } from './music';
import { CHORD_SHAPES, type ChordShapeRegistry } from '../modules/chords';

export interface ChordExpansion {
  symbol: string;
  shapeId: string;
  shapeLabel: string;
  rootOctave: number;
  notes: string[];
}

export function expandChordSymbol(
  symbol: string,
  registry: ChordShapeRegistry = CHORD_SHAPES,
): ChordExpansion {
  const match = /^([A-G])([#b]?)([^@\s]*)(?:@([0-8]))?$/.exec(symbol);
  if (!match) throw new Error('Use a chord symbol such as Cmaj13#11 or Cmaj13#11@3.');
  const [, letter, accidental, alias, octaveText] = match;
  const rootOctave = Number(octaveText ?? 4);
  const root = pitch(`${letter}${accidental}${rootOctave}`);
  const shape = registry.find(alias);
  if (!shape) throw new Error(`Unknown chord shape “${alias}”.`);
  const letters = 'CDEFGAB';
  const naturals = [0, 2, 4, 5, 7, 9, 11];
  const notes = shape.tones.map(({ degree, semitones }) => {
    const midi = root.midi + semitones;
    if (midi < 12 || midi > 119)
      throw new Error('Chord voicing extends outside C0–B8. Choose a lower root octave.');
    const position = rootOctave * 7 + letters.indexOf(letter) + degree;
    const noteOctave = Math.floor(position / 7);
    const index = position % 7;
    const alteration = midi - ((noteOctave + 1) * 12 + naturals[index]);
    // Preserve chord-degree spelling where the pitch grammar can represent it.
    // Double accidentals fall back to an equivalent single-accidental pitch.
    if (Math.abs(alteration) <= 1 && noteOctave <= 8) {
      return pitch(
        `${letters[index]}${alteration === 1 ? '#' : alteration === -1 ? 'b' : ''}${noteOctave}`,
      ).name;
    }
    const names =
      accidental === 'b'
        ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
        : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
  });
  return { symbol, shapeId: shape.id, shapeLabel: shape.label, rootOctave, notes };
}
