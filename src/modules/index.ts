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
