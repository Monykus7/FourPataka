import {
  defineEngine,
  fourierShape,
  validateFourierSound,
  createFourierVoice,
  MODULE_API_VERSION,
  type FourierSound,
} from '../../index';

/** The existing signal path, now behind the public lifecycle boundary. */
export const fourierEngine = defineEngine<FourierSound>({
  id: 'fourpataka:engine/fourier',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  label: 'Fourier',
  author: 'Monykus7',
  attribution: 'FourPataka Fourier synthesis',
  minimumSampleRate: 3000,
  maximumSampleRate: 384000,
  supportsLive: true,
  supportsOffline: true,
  randomness: 'fixed',
  capabilities: { fourier: true, dotEditor: true, partialSolo: true, update: 'phase-continuous' },
  // Conservative steady-voice estimates, excluding temporary edit crossfades.
  // Noise storage is shared per context, rather than duplicated per voice.
  resources: { estimatedNodesPerVoice: 24, estimatedBytesPerVoice: 1536000 },
  defaults: () => fourierShape('sine'),
  validateSettings: validateFourierSound,
  create: (note) =>
    createFourierVoice(
      note.context,
      note.destination,
      note.settings,
      note.frequencyHz,
      note.startSeconds,
      note.durationSeconds,
      note.solo,
      note.releaseLimitSeconds,
    ),
});
