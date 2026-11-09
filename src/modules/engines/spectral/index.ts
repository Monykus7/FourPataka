import {
  MODULE_API_VERSION,
  defineEngine,
  defaultSpectralSettings,
  spectralControls,
  SPECTRAL_ENGINE_ID,
  SPECTRAL_TONES,
  validateSpectralSettings,
  type SpectralSettings,
  createSpectralVoice,
} from '../../index';

export const spectralEngine = defineEngine<SpectralSettings>({
  id: SPECTRAL_ENGINE_ID,
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  label: 'Evolving spectrum',
  author: 'Monykus7',
  attribution: 'FourPataka WAV reconstruction',
  minimumSampleRate: 3000,
  maximumSampleRate: 192000,
  latencySeconds: 0,
  supportsLive: true,
  supportsOffline: true,
  randomness: 'fixed',
  capabilities: {
    fourier: false,
    dotEditor: false,
    partialSolo: false,
    update: 'phase-continuous',
  },
  // Two carrier/gain pairs per tone, one shared-buffer source and splitter,
  // three noise gains, trim and output. Charge the shared buffer per voice.
  resources: {
    estimatedNodesPerVoice: SPECTRAL_TONES * 4 + 7,
    estimatedBytesPerVoice: 192000 * 3 * 4 + 65536,
  },
  parameters: spectralControls,
  releaseSeconds: (settings) => settings.release,
  defaults: defaultSpectralSettings,
  validateSettings: validateSpectralSettings,
  create: createSpectralVoice,
});
