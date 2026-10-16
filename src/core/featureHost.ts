import { featureModules } from '../modules/assembly';
import {
  FEATURE_ID,
  validateEngineData,
  type FeatureSnapshot,
  type FeatureRequest,
} from '../modules';
import { descriptors } from './music';
import { isFourierSound, type InstrumentSound } from './engineSound';
export interface SavedFeature {
  apiVersion: number;
  dataVersion: number;
  settings: unknown;
  unavailable?: string;
  [key: string]: unknown;
}
export type FeatureSettings = Record<string, SavedFeature>;
export function readFeatureSettings(value: unknown): FeatureSettings {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 64)
    throw new Error('Invalid feature settings map.');
  const result: FeatureSettings = {};
  for (const [id, entry] of Object.entries(value)) {
    if (
      !FEATURE_ID.test(id) ||
      id.length > 160 ||
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry)
    )
      throw new Error('Invalid saved feature identity.');
    // The saved envelope adds one level; retain the same settings depth budget.
    validateEngineData(entry, -1);
    const copy = structuredClone(entry) as SavedFeature;
    if (
      !Number.isSafeInteger(copy.apiVersion) ||
      copy.apiVersion < 1 ||
      !Number.isSafeInteger(copy.dataVersion) ||
      copy.dataVersion < 1 ||
      !('settings' in copy)
    )
      throw new Error('Invalid feature versions/settings.');
    try {
      const definition = featureModules.get(id);
      if (definition.apiVersion !== copy.apiVersion || definition.dataVersion !== copy.dataVersion)
        copy.unavailable = 'Unsupported feature version';
      else {
        definition.validateSettings(copy.settings);
        delete copy.unavailable;
      }
    } catch (error) {
      if ((error as Error).message.startsWith('Unavailable feature:'))
        copy.unavailable = 'Feature is not installed';
      else throw error;
    }
    result[id] = copy;
  }
  return result;
}
export function featureSettingsEntry(id: string, settings: unknown): SavedFeature {
  const definition = featureModules.get(id);
  definition.validateSettings(settings);
  return {
    apiVersion: definition.apiVersion,
    dataVersion: definition.dataVersion,
    settings: structuredClone(settings),
  };
}
export function readFeatureVisibility(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 64)
    return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([id, v]) => FEATURE_ID.test(id) && id.length <= 160 && typeof v === 'boolean',
    ),
  );
}
export function featureAnalysis(
  sound: InstrumentSound,
  frequency: number,
  sampleRate: number,
): FeatureSnapshot['analysis'] {
  if (!isFourierSound(sound))
    return { supported: false, power: 0, centroidHz: null, oddShare: 0, subShare: 0 };
  const result = descriptors(sound, frequency, sampleRate);
  return {
    supported: true,
    power: result.power,
    centroidHz: result.centroid,
    oddShare: result.oddShare,
    subShare: result.subShare,
    details: {
      evenShare: result.evenShare,
      h1Share: result.h1Share,
      meanSquare: result.meanSquare,
      dominantHz: result.dominantHz,
      dominantLabel: result.dominantLabel,
      componentCount: result.componentCount,
      partialModel: !!sound.percussion,
    },
  };
}
/** Revision and destination are host-owned; stale/asynchronous source requests are rejected. */
export function guardFeatureSource(
  request: FeatureRequest,
  current: Pick<
    FeatureSnapshot,
    'sourceRevision' | 'sourceEditable' | 'targetTrack' | 'targetFile'
  >,
) {
  if (request.type !== 'insert-command') throw new Error('Expected a source insertion request.');
  if (!current.sourceEditable)
    throw new Error('Stop score playback and fix diagnostics before inserting commands.');
  if (
    request.expectedRevision !== current.sourceRevision ||
    request.targetTrack !== current.targetTrack ||
    request.targetFile !== current.targetFile
  )
    throw new Error('The score or insertion destination changed. Try the action again.');
}
