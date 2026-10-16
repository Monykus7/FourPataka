import { levelWindow, sampleLevels } from './levels';

export function createOutputMeter(context: BaseAudioContext, input: AudioNode) {
  const { windowSamples, fftSize } = levelWindow(context.sampleRate);
  const tap = context.createGain();
  // Upmix mono only in this observation branch. The audible routing, latency
  // and existing spectrum analyser are untouched; stereo polarity stays separate.
  tap.channelCount = 2;
  tap.channelCountMode = 'explicit';
  const splitter = context.createChannelSplitter(2);
  input.connect(tap);
  tap.connect(splitter);
  const analysers = [0, 1].map((channel) => {
    const analyser = context.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = 0;
    splitter.connect(analyser, channel);
    return analyser;
  });
  const buffers = analysers.map(() => new Float32Array(fftSize));
  const windows = buffers.map((buffer) => buffer.subarray(fftSize - windowSamples));
  return {
    windowSamples,
    channels: 2,
    read() {
      analysers.forEach((analyser, i) => analyser.getFloatTimeDomainData(buffers[i]));
      return sampleLevels(windows);
    },
    disconnect() {
      input.disconnect(tap);
      tap.disconnect();
      splitter.disconnect();
      analysers.forEach((analyser) => analyser.disconnect());
    },
  };
}
