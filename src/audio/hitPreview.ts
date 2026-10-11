import type { Sound } from '../core/music';
import { createVoice } from './voice';

export interface HitPreview {
  duration: number;
  bins: { low: number; high: number }[];
}
const cache = new Map<string, Promise<HitPreview>>();

/** Render the actual dry voice, not a harmonic drawing pretending to be noise. */
export function renderHitPreview(sound: Sound, frequency: number): Promise<HitPreview> {
  const key = JSON.stringify([sound, frequency]);
  const existing = cache.get(key);
  if (existing) return existing;
  // A fixed 250 ms gate exposes a whole hit independently of score articulation.
  // The captured sound belongs to this render; editor changes cannot mutate it.
  const owned = structuredClone(sound);
  const duration = 0.25 + owned.release + 0.01;
  const context = new OfflineAudioContext(1, Math.ceil(duration * 44100), 44100);
  const voice = createVoice(context, context.destination, owned, frequency, 0, 0.25);
  const result = context.startRendering().then(
    (buffer) => {
      const data = buffer.getChannelData(0);
      const bins = Array.from({ length: 180 }, (_, i) => {
        let low = 0,
          high = 0;
        // Min/max buckets retain transient peaks that point sampling would miss.
        for (
          let j = Math.floor((i * data.length) / 180);
          j < Math.floor(((i + 1) * data.length) / 180);
          j++
        ) {
          low = Math.min(low, data[j]);
          high = Math.max(high, data[j]);
        }
        return { low, high };
      });
      voice.dispose();
      return { duration, bins };
    },
    (error) => {
      voice.dispose();
      cache.delete(key);
      throw error;
    },
  );
  cache.set(key, result);
  // Bound private rendered-data memory while deduplicating library/editor work.
  if (cache.size > 24) cache.delete(cache.keys().next().value!);
  return result;
}
