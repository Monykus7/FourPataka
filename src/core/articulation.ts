export type Articulation = 'staccato' | 'legato';
export interface ArticulatedEvent {
  duration: number;
  gateDuration?: number;
  articulation?: Articulation;
  legatoToNext?: boolean;
}

export function playbackTiming(event: ArticulatedEvent, tempo: number) {
  const seconds = (event.duration * 60) / tempo;
  const gate = ((event.gateDuration ?? event.duration) * 60) / tempo;
  // Score spacing is independent of the sounding gate. Keep overlap in seconds,
  // bounded for fast tuplets; each new pitch still owns its original attack.
  return {
    duration: gate + (event.legatoToNext ? Math.min(0.03, seconds * 0.1) : 0),
    releaseLimit: event.articulation === 'staccato' ? Math.min(0.03, seconds * 0.25) : undefined,
  };
}
