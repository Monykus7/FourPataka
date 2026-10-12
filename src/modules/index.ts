// Public M1 data boundary; no React, core project, DSP or native imports.
export * from './foundation/contracts';
export {
  defineNumericModule,
  createModuleRegistry,
  defaultModuleSettings,
  validateModuleSettings,
  moduleControlRanges,
} from './foundation/registry';
