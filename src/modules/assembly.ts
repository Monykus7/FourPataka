import { createModuleRegistry, createPedalRegistry } from './index';
import { eqModule } from './pedals/eq';
import { compressorModule } from './pedals/compressor';
import { overdriveModule } from './pedals/overdrive';
import { levelPedal } from './examples/level/index';
import { delayModule } from './pedals/delay';
const builtIns = [compressorModule, overdriveModule, eqModule, delayModule];
const definitions = [...builtIns, levelPedal];
const builtInIds = builtIns.map((definition) => definition.id);
// Reviewed source is registered once. Project data cannot register executable code.
export const pedalModules = createPedalRegistry(definitions, builtInIds);
export const bundledModules = createModuleRegistry(definitions, { builtInIds });
export const LEGACY_MODULE_IDS = Object.freeze(
  Object.fromEntries(builtIns.map((d) => [d.legacyKind!, d.id])),
);
