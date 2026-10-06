import { CHORD_SHAPE_API_VERSION, type ChordShape, type ChordShapeRegistry } from './contracts';

export function createChordShapeRegistry(definitions: readonly ChordShape[]): ChordShapeRegistry {
  if (definitions.length > 256) throw new Error('Maximum 256 chord shapes.');
  const ids = new Set<string>();
  const aliases = new Map<string, ChordShape>();
  const shapes = definitions.map((definition) => {
    if (
      !/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/.test(definition.id) ||
      ids.has(definition.id) ||
      definition.apiVersion !== CHORD_SHAPE_API_VERSION ||
      !definition.label.trim() ||
      definition.label.length > 80 ||
      !definition.aliases.length ||
      definition.aliases.length > 16 ||
      !definition.tones.length ||
      definition.tones.length > 32
    )
      throw new Error(`Invalid or incompatible chord shape: ${definition.id}.`);
    ids.add(definition.id);
    let previous = -1;
    definition.tones.forEach(({ degree, semitones }, i) => {
      const natural = [0, 2, 4, 5, 7, 9, 11][degree % 7] + 12 * Math.floor(degree / 7);
      if (
        !Number.isInteger(degree) ||
        degree < 0 ||
        degree > 28 ||
        !Number.isInteger(semitones) ||
        semitones < 0 ||
        semitones > 48 ||
        semitones <= previous ||
        Math.abs(semitones - natural) > 2 ||
        (i === 0 && (degree !== 0 || semitones !== 0))
      )
        throw new Error(`Invalid ascending tones for ${definition.id}.`);
      previous = semitones;
    });
    // Copy before freezing: contributor/default objects never become mutable shared state.
    const shape = Object.freeze({
      ...definition,
      aliases: Object.freeze([...definition.aliases]),
      tones: Object.freeze(definition.tones.map((tone) => Object.freeze({ ...tone }))),
    });
    shape.aliases.forEach((alias) => {
      if (alias.length > 48 || !/^[A-Za-z0-9#+-]*$/.test(alias) || aliases.has(alias))
        throw new Error(`Invalid or duplicate chord alias: ${alias}.`);
      aliases.set(alias, shape);
    });
    return shape;
  });
  return Object.freeze({
    shapes: Object.freeze(shapes),
    find: (alias: string) => aliases.get(alias),
  });
}
