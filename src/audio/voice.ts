import type { Sound } from '../core/music';
import { engineModules } from '../modules/assembly';
import type { FourierVoice } from '../modules';
export { holdParameter } from '../modules';
export type Voice = FourierVoice;

// Keep every existing audition, transport and offline caller on the same adapter.
// The host owns admission, clocks and track snapshots; the module owns its nodes.
export function createVoice(
  context: BaseAudioContext,
  destination: AudioNode,
  sound: Sound,
  frequency: number,
  start: number,
  duration: number,
  solo?: string,
  releaseLimit?: number,
): Voice {
  const voice = engineModules.get('fourpataka:engine/fourier').create({
    context,
    destination,
    settings: sound,
    frequencyHz: frequency,
    startSeconds: start,
    durationSeconds: duration,
    solo,
    releaseLimitSeconds: releaseLimit,
    seed: 0,
  });
  // Only this compatibility adapter depends on Fourier diagnostic ports.
  if (!voice.envelope || !voice.oscillators) {
    voice.dispose();
    throw new Error('Fourier engine did not expose its diagnostic ports.');
  }
  return voice as Voice;
}
