import { createModuleRegistry } from './index';
import { eqModule } from './pedals/eq';

// Reviewed, explicit source assembly. Data registration does not install DSP,
// add equipment or enable a new persisted kind; those are M2 host responsibilities.
export const bundledModules = createModuleRegistry([eqModule], { builtInIds: [eqModule.id] });
export const LEGACY_MODULE_IDS = Object.freeze({ eq: eqModule.id });
