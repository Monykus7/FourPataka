/** Experimental, bundled-source chord-shape contract. Not a runtime plugin loader. */
export const CHORD_SHAPE_API_VERSION = 1;
export interface ChordTone {
  /** Zero-based diatonic degree: root=0, third=2, ninth=8. */
  readonly degree: number;
  /** Ascending semitone offset from the root, including compound octaves. */
  readonly semitones: number;
}
export interface ChordShape {
  readonly id: string;
  readonly apiVersion: number;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly tones: readonly ChordTone[];
}
export interface ChordShapeRegistry {
  readonly shapes: readonly ChordShape[];
  find: (alias: string) => ChordShape | undefined;
}
