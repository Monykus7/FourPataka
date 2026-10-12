// Public bundled-source contracts; no React, core project or native imports.
export * from './foundation/contracts';
export {
  defineNumericModule,
  createModuleRegistry,
  defaultModuleSettings,
  validateModuleSettings,
  moduleControlRanges,
} from './foundation/registry';

export * from './foundation/pedals';
export {
  createMixedProcessor,
  type ProcessorPorts,
  type ProcessorBehavior,
} from './foundation/processor';

export { readSavedPedal, type SavedPedal, type ModuleReference } from './foundation/savedPedals';

export {
  fourierShape,
  validateFourierSound,
  validateWavePoints,
  HARMONIC_COUNT,
  LEGACY_HARMONIC_COUNT,
  type FourierSound,
  type FourierPoint,
  type WavePreset,
} from './foundation/fourier';

export {
  defineFourierPreset,
  createFourierPresetRegistry,
  type FourierPresetModule,
} from './foundation/presets';

export * from './foundation/engines';

export { components, dbToGain, type Component } from './foundation/fourierComponents';
export {
  createFourierVoice,
  holdParameter,
  type Voice as FourierVoice,
} from './foundation/fourierVoice';

export * from './foundation/features';
