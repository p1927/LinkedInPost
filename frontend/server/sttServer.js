import express from 'express';
import { createServer } from 'http';
import multer from 'multer';
import { tmpdir } from 'os';
import { join, basename } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import Ffmpeg from 'fluent-ffmpeg';
import { nodewhisper } from 'nodejs-whisper';
import { readSttConfig, modelExists } from './sttConfig.js';

Ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
const PORT = 3457;
const upload = multer({ dest: tmpdir() });

// CORS for any localhost origin
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

const config = readSttConfig();

app.get('/health', (req, res) => {
  const modelLoaded = config.enabled && modelExists(config.modelPath);
  res.json({
    ok: true,
    enabled: config.enabled,
    modelLoaded,
    model: config.model,
    shortcut: config.shortcut,
    unavailableReason: !config.enabled
      ? 'disabled'
      : !modelExists(config.modelPath)
        ? 'model_missing'
        : null,
  });
});

function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    Ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath);
  });
}

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!config.enabled) {
    return res.status(503).json({ error: 'stt_disabled' });
  }
  if (!modelExists(config.modelPath)) {
    return res.status(503).json({ error: 'model_missing' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'no_audio' });
  }

  const webmPath = req.file.path;
  const wavPath = webmPath + '.wav';

  try {
    await convertToWav(webmPath, wavPath);

    const transcript = await nodewhisper(wavPath, {
      modelName: config.model,
      modelPath: config.modelPath,
      whisperOptions: {
        outputInText: true,
        language: 'en',
      },
    });

    const text = typeof transcript === 'string'
      ? transcript.trim()
      : (transcript?.text ?? '').trim();

    res.json({ text });
  } catch (err) {
    console.error('[stt-server] Transcription error:', err);
    res.status(500).json({ error: 'transcription_failed', detail: err.message });
  } finally {
    await Promise.allSettled([
      unlink(webmPath).catch(() => {}),
      unlink(wavPath).catch(() => {}),
    ]);
  }
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[stt-server] Running on http://localhost:${PORT}`);
  if (!config.enabled) console.log('[stt-server] STT disabled — run setup wizard to enable');
});
