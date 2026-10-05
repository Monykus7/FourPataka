import { expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { encodeWav } from '../../src/core/wav';
const { validateWav } = createRequire(import.meta.url)('../../desktop/wav.cjs');
it('native WAV bridge validates PCM fields and lengths before opening a destination', () => {
  const pcm = encodeWav([new Float32Array([0, 0.2])], 48000);
  expect(validateWav(pcm).length).toBe(48);
  expect(() => validateWav('text')).toThrow(/Invalid WAV/);
  expect(() => validateWav(new ArrayBuffer(43))).toThrow(/Invalid WAV/);
  for (const at of [0, 4, 8, 12, 16, 20, 22, 24, 28, 32, 34, 36, 40]) {
    const damaged = pcm.slice(0);
    new Uint8Array(damaged)[at] ^= 127;
    expect(() => validateWav(damaged)).toThrow();
  }
});
