import { fourierLearning } from './features/fourierLearning/index';
import { sourceOutputAnalysis } from './features/sourceOutputAnalysis/index';
import { partialPair } from './examples/partialPair/index';
import { createFeatureRegistry } from './index';
import { basicTone } from './examples/basicTone/index';
import { fourierEngine } from './engines/fourier/index';
import { createEngineRegistry } from './index';
import { mellowPluck } from './examples/mellowPluck/index';
import { builtInPresetDefinitions } from './instruments/catalogue';
import { createFourierPresetRegistry } from './index';
import { createModuleRegistry, createPedalRegistry } from './index';
import { eqModule } from './pedals/eq';
import { compressorModule } from './pedals/compressor';
import { overdriveModule } from './pedals/overdrive';
import { levelPedal } from './examples/level/index';
import { delayModule } from './pedals/delay';
import { phaserModule } from './pedals/phaser';
const builtIns = [compressorModule, overdriveModule, eqModule, delayModule, phaserModule];
const definitions = [...builtIns, levelPedal];
const builtInIds = builtIns.map((definition) => definition.id);
// Reviewed source is registered once. Project data cannot register executable code.
export const pedalModules = createPedalRegistry(definitions, builtInIds);
export const bundledModules = createModuleRegistry(definitions, { builtInIds });
export const LEGACY_MODULE_IDS = Object.freeze(
  Object.fromEntries(builtIns.map((d) => [d.legacyKind!, d.id])),
);

export const instrumentModules = createFourierPresetRegistry(
  [...builtInPresetDefinitions, mellowPluck],
  builtInPresetDefinitions.map((d) => d.id),
);

export const factoryPreviews = instrumentModules.definitions
  .filter((d) => d.preview)
  .map((d) => ({ key: d.scoreKey, createSound: d.createSound, ...d.preview! }));

export const engineModules = createEngineRegistry([fourierEngine, basicTone], [fourierEngine.id]);

export const featureModules = createFeatureRegistry(
  [fourierLearning, sourceOutputAnalysis, partialPair],
  [fourierLearning.id, sourceOutputAnalysis.id],
);
