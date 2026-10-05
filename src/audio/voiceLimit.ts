import type { Voice } from './voice';
export const VOICE_LIMIT = 32;

export function admitVoice(voices: Voice[], start: number) {
  // Count overlaps at the new note's scheduled time. Wall-clock look-ahead
  // would steal different notes during fast offline rendering and live Play.
  const active = voices.filter((voice) => voice.end > start);
  if (active.length >= VOICE_LIMIT) active.shift()!.steal(start);
  return active;
}
