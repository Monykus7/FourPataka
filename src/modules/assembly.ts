import { createModuleRegistry, createPedalRegistry } from './index';
import { eqModule } from './pedals/eq';
import { compressorModule } from './pedals/compressor';
import { overdriveModule } from './pedals/overdrive';
import { delayModule } from './pedals/delay';
const definitions = [compressorModule, overdriveModule, eqModule, delayModule];
const builtInIds = definitions.map((definition) => definition.id);
// Reviewed source is registered once. Project data cannot register executable code.
export const pedalModules = createPedalRegistry(definitions, builtInIds);
export const bundledModules = createModuleRegistry(definitions, { builtInIds });
export const LEGACY_MODULE_IDS = Object.freeze(
  Object.fromEntries(definitions.map((d) => [d.legacyKind!, d.id])),
);
