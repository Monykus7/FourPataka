export interface HitPitch {
  amount: number; // Initial upward semitones; falls toward the written pitch.
  decay: number; // E-fold time in seconds, in frequency rather than semitones.
}
interface Segment {
  at: number;
  integral: number;
  from: number;
  to: number;
  decay?: number;
  until?: number;
}

/** Integrate the same frequency curve scheduled on every source in a voice. */
export function createPitchEnvelope(start: number, initial?: HitPitch) {
  const ratioAt = (pitch: HitPitch | undefined, time: number) =>
    pitch ? 1 + (2 ** (pitch.amount / 12) - 1) * Math.exp(-(time - start) / pitch.decay) : 1;
  let key = JSON.stringify(initial);
  let segments: Segment[] = [
    { at: start, integral: 0, from: ratioAt(initial, start), to: 1, decay: initial?.decay ?? 0.03 },
  ];
  const sample = (time: number) => {
    const segment = [...segments].reverse().find((segment) => segment.at <= time) ?? segments[0];
    const elapsed = Math.max(0, time - segment.at);
    if (segment.decay !== undefined) {
      const fade = Math.exp(-elapsed / segment.decay);
      return {
        ratio: segment.to + (segment.from - segment.to) * fade,
        integral:
          segment.integral +
          segment.to * elapsed +
          (segment.from - segment.to) * segment.decay * (1 - fade),
      };
    }
    const slope = (segment.to - segment.from) / (segment.until! - segment.at);
    return {
      ratio: segment.from + slope * elapsed,
      integral: segment.integral + segment.from * elapsed + (slope * elapsed * elapsed) / 2,
    };
  };
  return {
    sample,
    update(pitch: HitPitch | undefined, at: number) {
      const nextKey = JSON.stringify(pitch);
      if (key === nextKey) return false;
      const current = sample(at);
      const settle = at + 0.02;
      const target = ratioAt(pitch, settle);
      // Preserve accumulated phase and current frequency, including an unfinished
      // transition. The new target is aged from the original start, not retriggered.
      segments = [
        { at, integral: current.integral, from: current.ratio, to: target, until: settle },
        {
          at: settle,
          integral: current.integral + (current.ratio + target) * 0.01,
          from: target,
          to: 1,
          decay: pitch?.decay ?? 0.03,
        },
      ];
      key = nextKey;
      return true;
    },
    maximum(at: number) {
      return Math.max(
        1,
        sample(at).ratio,
        ...segments.filter((segment) => segment.at > at).map((segment) => segment.from),
      );
    },
    schedule(parameter: AudioParam, base: number, at: number) {
      parameter.cancelScheduledValues(at);
      parameter.setValueAtTime(base * sample(at).ratio, at);
      const active = [...segments].reverse().find((segment) => segment.at <= at) ?? segments[0];
      if (active.until !== undefined) {
        parameter.linearRampToValueAtTime(base * active.to, active.until);
        const next = segments.find((segment) => segment.at === active.until)!;
        parameter.setTargetAtTime(base, next.at, next.decay!);
      } else parameter.setTargetAtTime(base, at, active.decay!);
    },
  };
}
