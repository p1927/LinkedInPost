import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import { createWriteStream, existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { readSttConfig, writeSttConfig } from './sttConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3456;

app.use(express.json());

// Serve static files from public directory for the setup wizard
app.use(express.static(join(__dirname, '../public')));

// Setup wizard route - serves setup wizard page
app.get('/setup', (req, res) => {
  const htmlPath = join(__dirname, '../public/setup-wizard.html');
  res.sendFile(htmlPath);
});

// Redirect root to setup wizard
app.get('/', (req, res) => {
  const htmlPath = join(__dirname, '../public/setup-wizard.html');
  res.sendFile(htmlPath);
});

// STT endpoints

const MODEL_URLS = {
  'base.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
  'small.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
};

// Module-level state (single user, local tool)
let downloadState = { inProgress: false, downloaded: 0, total: 0, done: false, error: null };

app.get('/api/setup/stt/config', (req, res) => {
  res.json(readSttConfig());
});

app.get('/api/setup/stt/status', (req, res) => {
  res.json(downloadState);
});

app.post('/api/setup/stt/download', (req, res) => {
  const { projectDir, model, shortcut } = req.body || {};

  if (!projectDir) return res.status(400).json({ error: 'projectDir required' });

  if (!MODEL_URLS[model]) {
    return res.status(400).json({ error: 'unknown model' });
  }

  if (downloadState.inProgress) return res.status(409).json({ error: 'download_in_progress' });

  const destDir = join(
    projectDir,
    'frontend/node_modules/nodejs-whisper/cpp/whisper.cpp/models',
  );
  const destPath = join(destDir, `ggml-${model}.bin`);
  const cached = existsSync(destPath);

  res.json({ ok: true, cached });

  if (cached) {
    writeSttConfig({ enabled: true, model, modelPath: '', shortcut });
    return;
  }

  // Background download
  downloadState = { inProgress: true, downloaded: 0, total: 0, done: false, error: null };

  function doDownload(url, redirectCount = 0) {
    if (redirectCount > 5) {
      downloadState = { ...downloadState, inProgress: false, error: 'too many redirects' };
      return;
    }

    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const location = response.headers.location;
        response.resume();
        doDownload(location, redirectCount + 1);
        return;
      }

      if (response.statusCode !== 200) {
        downloadState = {
          ...downloadState,
          inProgress: false,
          error: `HTTP ${response.statusCode}`,
        };
        return;
      }

      const total = parseInt(response.headers['content-length'] || '0', 10);
      downloadState = { inProgress: true, downloaded: 0, total, done: false, error: null };

      mkdir(destDir, { recursive: true })
        .then(() => {
          const writer = createWriteStream(destPath);

          response.on('data', (chunk) => {
            downloadState.downloaded += chunk.length;
          });

          response.pipe(writer);

          writer.on('finish', () => {
            writeSttConfig({ enabled: true, model, modelPath: '', shortcut });
            downloadState = { inProgress: false, downloaded: downloadState.downloaded, total, done: true, error: null };
          });

          writer.on('error', (err) => {
            downloadState = { ...downloadState, inProgress: false, error: err.message };
          });
        })
        .catch((err) => {
          downloadState = { ...downloadState, inProgress: false, error: err.message };
        });
    }).on('error', (err) => {
      downloadState = { ...downloadState, inProgress: false, error: err.message };
    });
  }

  doDownload(MODEL_URLS[model]);
});

app.post('/api/setup/stt/disable', (req, res) => {
  const existing = readSttConfig();
  writeSttConfig({ ...existing, enabled: false });
  res.json({ ok: true });
});

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`\n🚀 LinkedIn Post Setup Wizard`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down setup wizard...');
  server.close(() => {
    console.log('Setup wizard stopped.');
    process.exit(0);
  });
});
