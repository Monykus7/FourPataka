export { CHORD_SHAPE_API_VERSION } from './contracts';
export type { ChordShape, ChordTone, ChordShapeRegistry } from './contracts';
export { createChordShapeRegistry } from './registry';
import { createChordShapeRegistry } from './registry';
import { BUILTIN_CHORD_SHAPES } from './builtins';
import { OPEN_FIFTH } from './examples/openFifth';

// Explicit reviewed build assembly; project data never installs executable modules.
export const CHORD_SHAPES = createChordShapeRegistry([...BUILTIN_CHORD_SHAPES, OPEN_FIFTH]);
