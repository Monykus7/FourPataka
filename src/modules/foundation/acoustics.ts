/** Host-owned instrument body settings, independent of engine settings and pedals. */
export interface InstrumentAcoustics {
  enabled: boolean;
  mix: number;
  size: number;
  decay: number;
  damping: number;
}
export const ACOUSTICS_DEFAULTS: Readonly<InstrumentAcoustics> = Object.freeze({
  enabled: false,
  mix: 25,
  size: 4,
  decay: 180,
  damping: 6000,
});
export const ACOUSTICS_CONTROLS = {
  mix: { label: 'Chamber mix', min: 0, max: 100, step: 1, unit: '%' },
  size: { label: 'Chamber size', min: 1, max: 8, step: 0.1, unit: 'ms' },
  decay: { label: 'Chamber decay', min: 40, max: 600, step: 10, unit: 'ms' },
  damping: { label: 'Chamber damping', min: 500, max: 14000, step: 100, unit: 'Hz' },
} as const;
export function validateAcoustics(value: unknown): asserts value is InstrumentAcoustics {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid instrument acoustics.');
  const data = value as InstrumentAcoustics;
  if (typeof data.enabled !== 'boolean') throw new Error('Invalid acoustics enable state.');
  for (const [key, range] of Object.entries(ACOUSTICS_CONTROLS)) {
    const n = data[key as keyof typeof ACOUSTICS_CONTROLS];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < range.min || n > range.max)
      throw new Error(`Invalid ${range.label}: expected ${range.min}–${range.max} ${range.unit}.`);
  }
}
/** Includes feed closure/filter settling and a conservative -120dB decay budget. */
export const ACOUSTICS_TAIL = 1.3;
export function acousticsTail(settings?: InstrumentAcoustics) {
  return settings?.enabled && settings.mix > 0 ? ACOUSTICS_TAIL : 0;
}
