import { encodeWav } from '../../src/core/wav';

export function evolvingWav(rate = 48000) {
  return encodeWav(
    [
      Float32Array.from({ length: 4 * rate }, (_, i) => {
        const t = i / rate - 0.05;
        if (t < 0 || t >= 0.64) return 0;
        const angle = 2 * Math.PI * 220 * t;
        const level = Math.min(1, t / 0.009, (0.64 - t) / 0.17);
        return (
          level *
          (0.36 * Math.sin(angle + 0.3) +
            0.31 * Math.exp(-t / 0.075) * Math.cos(2 * angle - 0.5) +
            0.09 * Math.exp(-t / 0.28) * Math.cos(2 * Math.PI * 537.5 * t))
        );
      }),
    ],
    rate,
  );
}

export function shortNoiseWav(rate = 48000) {
  let seed = 9271;
  let previous = 0;
  return encodeWav(
    [
      Float32Array.from({ length: Math.round(rate * 0.3) }, (_, i) => {
        const t = i / rate - 0.045;
        if (t < 0 || t > 0.019) return 0;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const white = seed / 2147483648 - 1;
        const high = white - previous;
        previous = white;
        return 0.52 * high * Math.exp(-t / 0.007);
      }),
    ],
    rate,
  );
}
