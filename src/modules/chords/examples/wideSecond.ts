import { CHORD_SHAPE_API_VERSION, type ChordShape } from '../contracts';

/** Compound degrees keep the ninth and twelfth above the root, not in one octave. */
export const WIDE_SECOND: ChordShape = {
  id: 'example:wide-second',
  apiVersion: CHORD_SHAPE_API_VERSION,
  label: 'Wide suspended second',
  aliases: ['wide2'],
  tones: [
    { degree: 0, semitones: 0 },
    { degree: 8, semitones: 14 },
    { degree: 11, semitones: 19 },
  ],
};
