import type { CompiledScore, ScoreEvent } from './parser';
import { pitch } from './music';

export interface ComparisonMaterial {
  kind: 'note' | 'chord' | 'phrase';
  note: string;
  /** Quarter-note beats at the fixed 120 BPM note/chord audition tempo. */
  noteBeats?: number;
  trackKey: string;
  fromBeat: number;
  toBeat: number | null;
}
export const DEFAULT_MATERIAL: ComparisonMaterial = {
  kind: 'note',
  note: 'C4',
  trackKey: 'melody',
  fromBeat: 0,
  toBeat: null,
};
export interface AuditionPhrase {
  tempo: number;
  beats: number;
  events: Pick<
    ScoreEvent,
    'beat' | 'duration' | 'notes' | 'frequencies' | 'articulation' | 'gateDuration' | 'legatoToNext'
  >[];
}
// Musical material is independent of A/B sounds. Clip boundary-crossing notes,
// preserve rests, and start both snapshots at the same zero-based phrase origin.
export function comparisonPhrase(
  score: CompiledScore,
  material: ComparisonMaterial,
): AuditionPhrase {
  if (material.kind !== 'phrase') {
    const notes = material.kind === 'chord' ? ['Bb4', 'D5', 'F5'] : [material.note];
    const beats = material.noteBeats ?? 3.2;
    if (!Number.isFinite(beats) || beats < 1 / 64 || beats > 32)
      throw new Error('Audition note length must be 1/64–32 quarter-note beats.');
    return {
      tempo: 120,
      beats,
      events: [
        { beat: 0, duration: beats, notes, frequencies: notes.map((n) => pitch(n).frequency) },
      ],
    };
  }
  if (score.diagnostics.length) throw new Error('Fix score diagnostics before comparing a phrase.');
  const track = score.tracks.find((t) => t.key === material.trackKey);
  if (!track) throw new Error('Choose a score track for comparison.');
  const end = Math.min(material.toBeat ?? track.beats, track.beats);
  if (!Number.isFinite(material.fromBeat) || material.fromBeat < 0 || end <= material.fromBeat)
    throw new Error('Choose a nonempty phrase range within the track.');
  const events = track.events
    .filter((e) => e.beat < end && e.beat + e.duration > material.fromBeat)
    .map((e) => {
      const start = Math.max(e.beat, material.fromBeat);
      return {
        beat: start - material.fromBeat,
        duration: Math.min(e.beat + e.duration, end) - start,
        ...(e.articulation ? { articulation: e.articulation } : {}),
        ...(e.gateDuration !== undefined
          ? { gateDuration: Math.max(0, Math.min(e.beat + e.gateDuration, end) - start) }
          : {}),
        ...(e.legatoToNext && e.beat + e.duration < end ? { legatoToNext: true } : {}),
        notes: [...e.notes],
        frequencies:
          e.gateDuration !== undefined && start >= e.beat + e.gateDuration
            ? []
            : [...e.frequencies],
      };
    });
  return { tempo: score.tempo, beats: end - material.fromBeat, events };
}
