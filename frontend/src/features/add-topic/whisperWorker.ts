import { pipeline, env } from '@huggingface/transformers';

env.useBrowserCache = true;
env.allowLocalModels = false;

type InMsg =
  | { type: 'load'; model: string }
  | { type: 'transcribe'; audio: Float32Array };

let transcriber: Awaited<ReturnType<typeof pipeline>> | null = null;
let workerReady = false;

const post = (msg: object) => self.postMessage(msg);

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === 'load') {
    workerReady = false;
    try {
      transcriber = await pipeline('automatic-speech-recognition', msg.model, {
        dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
        progress_callback: (p: Record<string, unknown>) => post({ type: 'progress', ...p }),
      });
      workerReady = true;
      post({ type: 'ready' });
    } catch (err) {
      post({ type: 'error', error: String(err) });
    }
    return;
  }

  if (msg.type === 'transcribe') {
    if (!transcriber || !workerReady) {
      post({ type: 'error', error: 'Model not loaded' });
      return;
    }
    try {
      console.log('[whisperWorker] transcribe called, audio samples:', msg.audio.length);
      type ASRPipeline = (input: Float32Array, opts: Record<string, unknown>) => Promise<unknown>;
      const out = await (transcriber as unknown as ASRPipeline)(msg.audio, { language: 'english', task: 'transcribe' });
      console.log('[whisperWorker] raw output:', JSON.stringify(out));
      const item = Array.isArray(out) ? out[0] : out;
      const text = ((item as { text?: string })?.text ?? '').trim();
      console.log('[whisperWorker] extracted text:', JSON.stringify(text));
      post({ type: 'result', text });
    } catch (err) {
      post({ type: 'error', error: String(err) });
    }
  }
};
