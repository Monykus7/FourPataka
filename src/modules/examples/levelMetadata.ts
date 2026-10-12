import { defineNumericModule, MODULE_API_VERSION } from '../index';

/** Buildable data example only: M2 supplies the audio/equipment registration seam. */
export const levelMetadata = defineNumericModule({
  id: 'example:pedal/level',
  category: 'pedal',
  label: 'Example level',
  apiVersion: MODULE_API_VERSION,
  dataVersion: 1,
  parameters: {
    gain: {
      label: 'Gain',
      description: 'Output gain; convert dB at the audio boundary.',
      min: -24,
      max: 12,
      step: 0.5,
      unit: 'dB',
      defaultValue: 0,
      update: 'continuous',
    },
  },
});
