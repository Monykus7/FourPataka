import { CHORD_SHAPE_API_VERSION, type ChordShape } from '../contracts';

/** Contributor example: a fifth and octave, added without a parser/DSP branch. */
export const OPEN_FIFTH: ChordShape = {
  id: 'example:open-fifth',
  apiVersion: CHORD_SHAPE_API_VERSION,
  label: 'Open fifth with octave',
  aliases: ['open5'],
  tones: [
    { degree: 0, semitones: 0 },
    { degree: 4, semitones: 7 },
    { degree: 7, semitones: 12 },
  ],
};
