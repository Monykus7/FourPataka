type Peak = { hz: number; power: number };

// One bounded Hann spectrum per search window. Modal candidates need sharp,
// repeatable peaks before the fitter treats residual energy as an oscillator.
export function wavSpectralPeaks(samples: Float32Array, rate: number, center: number): Peak[] {
  const size = 2 ** Math.ceil(Math.log2(rate * 0.064));
  const first = Math.round(center * rate) - size / 2;
  const real = Float64Array.from(
    { length: size },
    (_, i) => (samples[first + i] ?? 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size)),
  );
  const imag = new Float64Array(size);
  for (let i = 1, reversed = 0; i < size; i++) {
    let bit = size >> 1;
    while (reversed & bit) {
      reversed ^= bit;
      bit >>= 1;
    }
    reversed ^= bit;
    if (i < reversed) [real[i], real[reversed]] = [real[reversed], real[i]];
  }
  for (let length = 2; length <= size; length *= 2) {
    const half = length / 2;
    for (let bin = 0; bin < half; bin++) {
      const angle = (-2 * Math.PI * bin) / length;
      const c = Math.cos(angle),
        s = Math.sin(angle);
      for (let i = bin; i < size; i += length) {
        const j = i + half;
        const x = c * real[j] - s * imag[j];
        const y = s * real[j] + c * imag[j];
        real[j] = real[i] - x;
        imag[j] = imag[i] - y;
        real[i] += x;
        imag[i] += y;
      }
    }
  }
  const power = real.subarray(0, size / 2).map((value, i) => value ** 2 + imag[i] ** 2);
  const width = rate / size;
  const minimum = Math.max(3, Math.ceil(45 / width));
  const maximum = Math.min(power.length - 8, Math.floor(16000 / width));
  const found: Peak[] = [];
  for (let i = minimum; i <= maximum; i++) {
    if (power[i] <= power[i - 1] || power[i] <= power[i + 1]) continue;
    let nearby = 0;
    for (const offset of [-6, -5, -4, 4, 5, 6]) nearby += power[i + offset] ?? 0;
    if (power[i] < Math.max(1e-8, nearby * 3)) continue;
    const left = Math.log(Math.max(1e-12, power[i - 1]));
    const middle = Math.log(power[i]);
    const right = Math.log(Math.max(1e-12, power[i + 1]));
    const offset = (left - right) / (2 * (left - 2 * middle + right));
    found.push({ hz: width * (i + offset), power: power[i] });
  }
  return found.sort((a, b) => b.power - a.power).slice(0, 32);
}
