import { reviewWav, type WavReviewRequest, type WavWorkerMessage } from '../core/wavReview';

self.onmessage = async ({ data }: MessageEvent<WavReviewRequest>) => {
  const send = (message: WavWorkerMessage, transfer: Transferable[] = []) =>
    self.postMessage(message, { transfer });
  try {
    const review = await reviewWav(data, (text) => send({ stage: 'progress', text }));
    // The review owns just the bounded crop. Full decoded channels stay in the worker.
    send({ stage: 'done', review }, [review.samples.buffer]);
  } catch (error) {
    send({ stage: 'error', text: (error as Error).message });
  }
};
