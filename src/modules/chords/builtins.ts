import { CHORD_SHAPE_API_VERSION, type ChordShape } from './contracts';

const shape = (
  id: string,
  label: string,
  aliases: string[],
  semitones: number[],
  degrees?: number[],
): ChordShape => ({
  id: `builtin:${id}`,
  apiVersion: CHORD_SHAPE_API_VERSION,
  label,
  aliases,
  tones: semitones.map((value, i) => ({ semitones: value, degree: degrees?.[i] ?? i * 2 })),
});

// Full ascending shapes are deliberate; performance voicings/omissions are separate.
export const BUILTIN_CHORD_SHAPES: readonly ChordShape[] = [
  shape('major', 'Major', ['', 'maj', 'M'], [0, 4, 7]),
  shape('minor', 'Minor', ['m', 'min'], [0, 3, 7]),
  shape('diminished', 'Diminished', ['dim'], [0, 3, 6]),
  shape('augmented', 'Augmented', ['aug', '+'], [0, 4, 8]),
  shape('sus2', 'Suspended second', ['sus2'], [0, 2, 7], [0, 1, 4]),
  shape('sus4', 'Suspended fourth', ['sus4', 'sus'], [0, 5, 7], [0, 3, 4]),
  shape('power', 'Power fifth', ['5'], [0, 7], [0, 4]),
  shape('sixth', 'Major sixth', ['6'], [0, 4, 7, 9], [0, 2, 4, 5]),
  shape('minor-sixth', 'Minor sixth', ['m6'], [0, 3, 7, 9], [0, 2, 4, 5]),
  shape('dominant-seven', 'Dominant seventh', ['7'], [0, 4, 7, 10]),
  shape('major-seven', 'Major seventh', ['maj7', 'M7'], [0, 4, 7, 11]),
  shape('minor-seven', 'Minor seventh', ['m7', 'min7'], [0, 3, 7, 10]),
  shape('diminished-seven', 'Diminished seventh', ['dim7'], [0, 3, 6, 9]),
  shape('half-diminished', 'Half-diminished seventh', ['m7b5'], [0, 3, 6, 10]),
  shape('add-nine', 'Added ninth', ['add9'], [0, 4, 7, 14], [0, 2, 4, 8]),
  shape('dominant-nine', 'Dominant ninth', ['9'], [0, 4, 7, 10, 14]),
  shape('major-nine', 'Major ninth', ['maj9', 'M9'], [0, 4, 7, 11, 14]),
  shape('minor-nine', 'Minor ninth', ['m9'], [0, 3, 7, 10, 14]),
  shape('dominant-eleven', 'Dominant eleventh', ['11'], [0, 4, 7, 10, 14, 17]),
  shape('major-eleven', 'Major eleventh', ['maj11'], [0, 4, 7, 11, 14, 17]),
  shape('minor-eleven', 'Minor eleventh', ['m11'], [0, 3, 7, 10, 14, 17]),
  shape('dominant-thirteen', 'Dominant thirteenth', ['13'], [0, 4, 7, 10, 14, 17, 21]),
  shape('major-thirteen', 'Major thirteenth', ['maj13'], [0, 4, 7, 11, 14, 17, 21]),
  shape('minor-thirteen', 'Minor thirteenth', ['m13'], [0, 3, 7, 10, 14, 17, 21]),
  shape(
    'major-thirteen-sharp-eleven',
    'Major thirteenth, sharp eleventh',
    ['maj13#11', 'M13#11'],
    [0, 4, 7, 11, 14, 18, 21],
  ),
];
