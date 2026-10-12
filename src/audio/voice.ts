import { requireEngine, isFourierSound, type InstrumentSound } from '../core/engineSound';
import type { EngineVoice } from '../modules';
export { holdParameter } from '../modules';
export type Voice = EngineVoice<InstrumentSound>;

// One owned voice can change algorithms without restarting the score clock.
export function createVoice(
  context: BaseAudioContext,
  destination: AudioNode,
  sound: InstrumentSound,
  frequency: number,
  start: number,
  duration: number,
  solo?: string,
  releaseLimit?: number,
): Voice {
  type Branch = { voice: EngineVoice; gain: GainNode; retire?: number };
  const branches = new Set<Branch>();
  let disposed = false;
  let currentSound = sound;
  const identity = (s: InstrumentSound) =>
    isFourierSound(s) ? 'fourpataka:engine/fourier' : s.engine.id;
  const allocate = (s: InstrumentSound, selection?: string, replacing = false): Branch => {
    const definition = requireEngine(s);
    const gain = context.createGain();
    const at = Math.max(start, context.currentTime);
    gain.gain.setValueAtTime(replacing ? 0 : 1, at);
    if (replacing) gain.gain.linearRampToValueAtTime(1, at + 0.02);
    let voice: EngineVoice;
    try {
      voice = definition.create({
        context,
        destination: gain,
        settings: isFourierSound(s) ? s : s.engine.settings,
        frequencyHz: frequency,
        startSeconds: start,
        durationSeconds: duration,
        releaseLimitSeconds: releaseLimit,
        solo: definition.capabilities.partialSolo ? selection : undefined,
        seed: 0,
      });
      gain.connect(destination);
    } catch (error) {
      gain.disconnect();
      throw error;
    }
    const branch = { voice, gain };
    branches.add(branch);
    return branch;
  };
  let current = allocate(sound, solo);
  const prune = () => {
    for (const b of branches)
      if (b !== current && (b.retire ?? b.voice.end) <= context.currentTime) {
        b.voice.dispose();
        b.gain.disconnect();
        branches.delete(b);
      }
  };
  return {
    get envelope() {
      return current.voice.envelope;
    },
    get oscillators() {
      return [...branches].flatMap((b) => b.voice.oscillators ?? []);
    },
    get end() {
      return Math.max(0, ...[...branches].map((b) => b.voice.end));
    },
    update(next, selection) {
      if (disposed) return;
      prune();
      const definition = requireEngine(next);
      if (identity(next) === identity(currentSound)) {
        current.voice.update(
          isFourierSound(next) ? next : next.engine.settings,
          definition.capabilities.partialSolo ? selection : undefined,
        );
      } else {
        const at = Math.max(start, context.currentTime);
        if (at >= current.voice.end) return;
        // Allocate before retiring the current sound, so a failed replacement is atomic.
        const replacement = allocate(next, selection, true);
        current.gain.gain.cancelAndHoldAtTime(at);
        current.gain.gain.setValueAtTime(current.gain.gain.value, at);
        current.gain.gain.linearRampToValueAtTime(0, at + 0.02);
        current.voice.steal(at + 0.02);
        current.retire = at + 0.04;
        current = replacement;
        // Bound transient branch ownership even during unusually rapid switching.
        while (branches.size > 8) {
          const oldest = [...branches].find((b) => b !== current)!;
          oldest.voice.dispose();
          oldest.gain.disconnect();
          branches.delete(oldest);
        }
      }
      currentSound = structuredClone(next);
    },
    steal(at) {
      if (!disposed) for (const b of branches) b.voice.steal(at);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const b of branches) {
        b.voice.dispose();
        b.gain.disconnect();
      }
      branches.clear();
    },
  };
}
