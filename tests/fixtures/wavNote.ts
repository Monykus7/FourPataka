import { encodeWav } from '../../src/core/wav';

export function recordedNote(
  rate = 48000,
  frequency = 220,
  partials = [0.46, -0.19, -0.12],
  offset = 0.13,
) {
  return Float32Array.from({ length: Math.round(rate * 0.78) }, (_, i) => {
    const time = i / rate - 0.08;
    if (time < 0 || time >= 0.5) return 0;
    const gain = Math.min(1, time / 0.04, (0.5 - time) / 0.13);
    const angle = 2 * Math.PI * frequency * time + offset;
    return (
      gain *
      partials.reduce((sum, coefficient, h) => sum + coefficient * Math.sin(angle * (h + 1)), 0)
    );
  });
}

export function noteWav(rate = 48000, antiphase = false, seconds = 0.78) {
  const samples = new Float32Array(Math.round(rate * seconds));
  samples.set(recordedNote(rate));
  return encodeWav(antiphase ? [samples, samples.map((value) => -value)] : [samples], rate);
}
