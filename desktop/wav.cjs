const LIMIT = 256 * 1024 * 1024;
function validateWav(value) {
  if (!(value instanceof ArrayBuffer) || value.byteLength < 44 || value.byteLength > LIMIT)
    throw new Error('Invalid WAV data or file exceeds 256 MiB.');
  const buffer = Buffer.from(value);
  const channels = buffer.readUInt16LE(22),
    rate = buffer.readUInt32LE(24);
  const block = channels * 2;
  if (
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WAVE' ||
    buffer.toString('ascii', 12, 16) !== 'fmt ' ||
    buffer.toString('ascii', 36, 40) !== 'data' ||
    buffer.readUInt32LE(4) !== buffer.length - 8 ||
    buffer.readUInt32LE(16) !== 16 ||
    buffer.readUInt16LE(20) !== 1 ||
    ![1, 2].includes(channels) ||
    ![44100, 48000].includes(rate) ||
    buffer.readUInt32LE(28) !== rate * block ||
    buffer.readUInt16LE(32) !== block ||
    buffer.readUInt16LE(34) !== 16 ||
    buffer.readUInt32LE(40) !== buffer.length - 44 ||
    (buffer.length - 44) % block !== 0
  )
    throw new Error('Expected a valid 16-bit mono/stereo PCM WAV at 44.1 or 48 kHz.');
  return buffer;
}
module.exports = { validateWav };
