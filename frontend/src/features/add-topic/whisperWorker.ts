import { pipeline, env } from '@huggingface/transformers';

env.useBrowserCache = true;
env.allowLocalModels = false;

type InMsg =
  | { type: 'load'; model: string }
  | { type: 'transcribe'; audio: Float32Array };

let transcriber: Awaited<ReturnType<typeof pipeline>> | null = null;
let workerReady = false;
let loadedModel = '';

const post = (msg: object) => self.postMessage(msg);

async function loadPipeline(model: string): Promise<{ transcriber: Awaited<ReturnType<typeof pipeline>>; device: string }> {
  // Try WebGPU first (3–10x faster); fall back to WASM
  try {
    const t = await pipeline('automatic-speech-recognition', model, {
      device: 'webgpu',
      dtype: 'q4',
      progress_callback: (p: Record<string, unknown>) => post({ type: 'progress', ...p }),
    });
    return { transcriber: t, device: 'webgpu' };
  } catch {
    const t = await pipeline('automatic-speech-recognition', model, {
      device: 'wasm',
      dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' },
      progress_callback: (p: Record<string, unknown>) => post({ type: 'progress', ...p }),
    });
    return { transcriber: t, device: 'wasm' };
  }
}

self.onmessage = async (e: MessageEvent<InMsg>) => {
  const msg = e.data;

  if (msg.type === 'load') {
    workerReady = false;
    loadedModel = msg.model;
    try {
      const result = await loadPipeline(msg.model);
      transcriber = result.transcriber;
      workerReady = true;
      post({ type: 'ready', device: result.device });
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
      const isMultilingual = !loadedModel.endsWith('.en') && !loadedModel.includes('moonshine');
      const opts: Record<string, unknown> = {};
      if (isMultilingual) { opts.language = 'english'; opts.task = 'transcribe'; }
      const out = await (transcriber as unknown as ASRPipeline)(msg.audio, opts);
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
