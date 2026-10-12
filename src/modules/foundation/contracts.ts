/** Experimental bundled-source data API. Audio factories arrive in later milestones. */
export const MODULE_API_VERSION = 1;
export type ModuleCategory = 'pedal' | 'instrument' | 'engine' | 'feature';
export type ParameterUnit = 'dB' | 'Hz' | 'ms' | 's' | '%' | ':1' | 'linear';
export interface NumericParameter {
  readonly label: string;
  readonly description: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: ParameterUnit;
  readonly defaultValue: number;
  readonly update: 'continuous' | 'replay';
}
export interface NumericModuleDefinition {
  /** Stable namespace:category/name identity; independent of score and instance keys. */
  readonly id: string;
  readonly category: ModuleCategory;
  readonly label: string;
  readonly apiVersion: number;
  readonly dataVersion: number;
  readonly parameters: Readonly<Record<string, NumericParameter>>;
}
export interface ModuleRegistry {
  readonly definitions: readonly NumericModuleDefinition[];
  get: (id: string) => NumericModuleDefinition;
}
