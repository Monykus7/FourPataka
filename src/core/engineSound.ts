import { engineModules } from '../modules/assembly';
import { validateFourierSound, validateEngineData, type FourierSound } from '../modules';

export interface EngineSound {
  engine: { id: string; apiVersion: number; dataVersion: number; settings: unknown };
  unavailable?: string;
}
export type InstrumentSound = FourierSound | EngineSound;
export const isFourierSound = (sound: InstrumentSound): sound is FourierSound =>
  !('engine' in sound);
export function readInstrumentSound(value: unknown, count = 32): InstrumentSound {
  if (!value || typeof value !== 'object') throw new Error('Invalid instrument sound.');
  if (!('engine' in value)) {
    validateFourierSound(value, count);
    return structuredClone(value);
  }
  validateEngineData(value);
  const raw = value as EngineSound;
  const e = raw.engine;
  if (
    !e ||
    typeof e.id !== 'string' ||
    e.id.length > 160 ||
    !/^[a-z][a-z0-9-]*:engine\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(e.id) ||
    !Number.isSafeInteger(e.apiVersion) ||
    e.apiVersion < 1 ||
    !Number.isSafeInteger(e.dataVersion) ||
    e.dataVersion < 1 ||
    !('settings' in e)
  )
    throw new Error('Invalid saved engine identity.');
  const copy = structuredClone(raw);
  try {
    const definition = engineModules.get(e.id);
    if (definition.capabilities.fourier) throw new Error('Fourier uses its existing sound format.');
    if (definition.apiVersion !== e.apiVersion || definition.dataVersion !== e.dataVersion)
      copy.unavailable = 'Unsupported engine version';
    else {
      definition.validateSettings(e.settings);
      delete copy.unavailable;
    }
  } catch (error) {
    if ((error as Error).message.startsWith('Unavailable engine:'))
      copy.unavailable = 'Engine is not installed';
    else throw error;
  }
  return copy;
}
export function requireEngine(sound: InstrumentSound) {
  if (isFourierSound(sound)) return engineModules.get('fourpataka:engine/fourier');
  const checked = readInstrumentSound(sound) as EngineSound;
  if (checked.unavailable)
    throw new Error(
      `${checked.engine.id}: ${checked.unavailable}. Original settings are preserved.`,
    );
  return engineModules.get(checked.engine.id);
}
export function engineRelease(sound: InstrumentSound) {
  const definition = requireEngine(sound);
  const settings = isFourierSound(sound) ? sound : sound.engine.settings;
  definition.validateSettings(settings);
  const seconds = definition.releaseSeconds(settings);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 10)
    throw new Error('Invalid engine release seconds.');
  return seconds;
}
export function createEngineSound(id: string): EngineSound {
  const definition = engineModules.get(id);
  if (definition.capabilities.fourier) throw new Error('Choose an independent engine.');
  return {
    engine: {
      id,
      apiVersion: definition.apiVersion,
      dataVersion: definition.dataVersion,
      settings: definition.defaults(),
    },
  };
}
