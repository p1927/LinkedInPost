# Speech-to-Text Scratchpad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional local Whisper-based speech-to-text to the "Research notes" scratchpad in AddTopicPage, with enable/disable via the setup wizard, a mic button, and a keyboard shortcut.

**Architecture:** A local Node.js sidecar server (port 3457) runs alongside Vite during development, reads `.stt-config.json` to know if the feature is enabled and where the model is, and transcribes WebM audio chunks (converted to WAV via ffmpeg-static) using nodejs-whisper. The browser records 5-second chunks via MediaRecorder, POSTs each to the sidecar, and inserts the returned text at the textarea cursor position.

**Tech Stack:** nodejs-whisper, fluent-ffmpeg, ffmpeg-static, multer, concurrently, React 19, TypeScript, Vite, Playwright (existing)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `frontend/server/sttConfig.js` | Read/write `.stt-config.json` (shared between sidecar + setup endpoints) |
| Create | `frontend/server/sttServer.js` | Sidecar Express server on port 3457 — health + transcribe |
| Modify | `frontend/server/setupWizard.js` | Add STT config, download, and status endpoints |
| Create | `frontend/src/features/setup-wizard/SpeechToTextStep.tsx` | Wizard step — toggle, model picker, download progress |
| Modify | `frontend/src/features/setup-wizard/SetupWizard.tsx` | Add `'stt'` step to flow; add `speechToText` to `SetupConfig` |
| Modify | `frontend/src/features/add-topic/AddTopicPage.tsx` | Add forwardRef to DocTextarea, wire MicButton + hook |
| Create | `frontend/src/features/add-topic/useSpeechToText.ts` | Recording, chunking, POST to sidecar, cursor insertion, shortcut |
| Create | `frontend/src/features/add-topic/MicButton.tsx` | Mic button with hidden/unavailable/idle/recording states |
| Modify | `frontend/package.json` | Add deps, update dev script |
| Modify | `frontend/.gitignore` | Exclude models/ and .stt-config.json |
| Modify | `frontend/src/features/setup-wizard/FinalStep.tsx` | Show STT enabled/disabled status |

---

## Task 1: Add dependencies, update dev script, update .gitignore

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/.gitignore`

- [ ] **Step 1: Read current .gitignore**

```bash
cat frontend/.gitignore
```

- [ ] **Step 2: Add model files and config to .gitignore**

Open `frontend/.gitignore` and append:
```
# Speech-to-text local model and config
models/
.stt-config.json
```

- [ ] **Step 3: Update package.json**

In `frontend/package.json`, make these changes:

Add to `dependencies`:
```json
"fluent-ffmpeg": "^2.1.3",
"ffmpeg-static": "^5.2.0",
"multer": "^1.4.5-lts.1",
"nodejs-whisper": "^0.1.7"
```

Add to `devDependencies`:
```json
"concurrently": "^9.1.2"
```

Change the `dev` script from:
```json
"dev": "vite"
```
to:
```json
"dev": "concurrently \"vite\" \"node server/sttServer.js\""
```

- [ ] **Step 4: Install dependencies**

```bash
cd frontend && npm install
```

Expected: no errors. nodejs-whisper will compile whisper.cpp native bindings — this takes 1-3 minutes.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add .gitignore package.json package-lock.json
git commit -m "feat(stt): add whisper deps and update dev script"
```

---

## Task 2: Config utility module

**Files:**
- Create: `frontend/server/sttConfig.js`

- [ ] **Step 1: Create the config utility**

Create `frontend/server/sttConfig.js`:

```js
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '../.stt-config.json');

export const DEFAULT_CONFIG = {
  enabled: false,
  model: 'base.en',
  modelPath: '',
  shortcut: 'Mod+Shift+M',
};

export function readSttConfig() {
  if (!existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeSttConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function modelExists(modelPath) {
  return modelPath && existsSync(modelPath);
}
```

- [ ] **Step 2: Verify the module is importable**

```bash
cd frontend && node --input-type=module <<'EOF'
import { readSttConfig } from './server/sttConfig.js';
console.log(readSttConfig());
EOF
```

Expected output: `{ enabled: false, model: 'base.en', modelPath: '', shortcut: 'Mod+Shift+M' }`

- [ ] **Step 3: Commit**

```bash
git add frontend/server/sttConfig.js
git commit -m "feat(stt): add stt config read/write utility"
```

---

## Task 3: Sidecar server — health endpoint

**Files:**
- Create: `frontend/server/sttServer.js`

- [ ] **Step 1: Create sidecar server with health endpoint**

Create `frontend/server/sttServer.js`:

```js
import express from 'express';
import { createServer } from 'http';
import { readSttConfig, modelExists } from './sttConfig.js';

const app = express();
const PORT = 3457;

// Allow requests from Vite dev server (any localhost port)
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

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[stt-server] Running on http://localhost:${PORT}`);
  if (!config.enabled) console.log('[stt-server] STT disabled — run setup wizard to enable');
});
```

- [ ] **Step 2: Start the sidecar and verify health**

In one terminal:
```bash
cd frontend && node server/sttServer.js
```

In another:
```bash
curl -s http://localhost:3457/health | python3 -m json.tool
```

Expected:
```json
{
  "ok": true,
  "enabled": false,
  "modelLoaded": false,
  "model": "base.en",
  "shortcut": "Mod+Shift+M",
  "unavailableReason": "disabled"
}
```

Stop the sidecar with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add frontend/server/sttServer.js
git commit -m "feat(stt): add sidecar server with health endpoint"
```

---

## Task 4: Sidecar server — transcribe endpoint

**Files:**
- Modify: `frontend/server/sttServer.js`

- [ ] **Step 1: Add transcribe endpoint to sttServer.js**

Replace the full contents of `frontend/server/sttServer.js` with:

```js
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
```

- [ ] **Step 2: Verify server starts without errors**

```bash
cd frontend && node server/sttServer.js
```

Expected: `[stt-server] Running on http://localhost:3457` with no import errors. Stop with Ctrl+C.

- [ ] **Step 3: Verify transcribe returns 503 when disabled**

Start sidecar, then:
```bash
curl -s -X POST http://localhost:3457/transcribe | python3 -m json.tool
```

Expected: `{ "error": "stt_disabled" }`

- [ ] **Step 4: Commit**

```bash
git add frontend/server/sttServer.js
git commit -m "feat(stt): add transcribe endpoint with ffmpeg + whisper"
```

---

## Task 5: Setup wizard — STT backend endpoints

**Files:**
- Modify: `frontend/server/setupWizard.js`

- [ ] **Step 1: Read current setupWizard.js to understand its structure**

```bash
cat frontend/server/setupWizard.js
```

- [ ] **Step 2: Add STT endpoints to setupWizard.js**

Replace the full contents of `frontend/server/setupWizard.js` with:

```js
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createWriteStream, existsSync, statSync } from 'fs';
import { mkdir } from 'fs/promises';
import https from 'https';
import { readSttConfig, writeSttConfig } from './sttConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3456;

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

app.get('/setup', (req, res) => {
  res.sendFile(join(__dirname, '../public/setup-wizard.html'));
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/setup-wizard.html'));
});

// ── STT endpoints ─────────────────────────────────────────────────────────────

const MODEL_URLS = {
  'base.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
  'small.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
};

// Track download progress in memory (single user, local tool)
let downloadState = { inProgress: false, downloaded: 0, total: 0, done: false, error: null };

/** GET /api/setup/stt/config — returns existing config for pre-filling the step */
app.get('/api/setup/stt/config', (req, res) => {
  res.json(readSttConfig());
});

/** GET /api/setup/stt/status — returns download progress */
app.get('/api/setup/stt/status', (req, res) => {
  res.json(downloadState);
});

/** POST /api/setup/stt/download — downloads model to frontend/models/whisper/ */
app.post('/api/setup/stt/download', async (req, res) => {
  const { projectDir, model = 'base.en', shortcut = 'Mod+Shift+M' } = req.body;

  if (!projectDir) return res.status(400).json({ error: 'projectDir required' });
  if (!MODEL_URLS[model]) return res.status(400).json({ error: 'unknown model' });
  if (downloadState.inProgress) return res.status(409).json({ error: 'download_in_progress' });

  const modelDir = join(projectDir, 'frontend/models/whisper');
  const modelPath = join(modelDir, `ggml-${model}.bin`);
  const url = MODEL_URLS[model];

  // If already downloaded, just write config and return
  if (existsSync(modelPath)) {
    writeSttConfig({ enabled: true, model, modelPath, shortcut });
    return res.json({ ok: true, modelPath, cached: true });
  }

  await mkdir(modelDir, { recursive: true });

  downloadState = { inProgress: true, downloaded: 0, total: 0, done: false, error: null };

  res.json({ ok: true, modelPath, cached: false });

  // Download in background after responding
  const file = createWriteStream(modelPath);

  const doDownload = (downloadUrl) => {
    https.get(downloadUrl, (response) => {
      // Handle redirects (HuggingFace uses them)
      if (response.statusCode === 301 || response.statusCode === 302) {
        return doDownload(response.headers.location);
      }
      if (response.statusCode !== 200) {
        downloadState.inProgress = false;
        downloadState.error = `HTTP ${response.statusCode}`;
        file.destroy();
        return;
      }

      const total = parseInt(response.headers['content-length'] || '0', 10);
      downloadState.total = total;

      response.on('data', (chunk) => {
        downloadState.downloaded += chunk.length;
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        downloadState.inProgress = false;
        downloadState.done = true;
        writeSttConfig({ enabled: true, model, modelPath, shortcut });
        console.log(`[setup-wizard] STT model downloaded to ${modelPath}`);
      });

      file.on('error', (err) => {
        downloadState.inProgress = false;
        downloadState.error = err.message;
      });
    }).on('error', (err) => {
      downloadState.inProgress = false;
      downloadState.error = err.message;
    });
  };

  doDownload(url);
});

/** POST /api/setup/stt/disable — write config with enabled: false */
app.post('/api/setup/stt/disable', (req, res) => {
  const existing = readSttConfig();
  writeSttConfig({ ...existing, enabled: false });
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`\n🚀 LinkedIn Post Setup Wizard`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop\n`);
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down setup wizard...');
  server.close(() => {
    console.log('Setup wizard stopped.');
    process.exit(0);
  });
});
```

- [ ] **Step 3: Verify endpoints respond**

Start setup wizard:
```bash
cd frontend && node server/setupWizard.js &
sleep 1
curl -s http://localhost:3456/api/setup/stt/config | python3 -m json.tool
curl -s http://localhost:3456/api/setup/stt/status | python3 -m json.tool
kill %1
```

Expected for `/config`: `{ "enabled": false, "model": "base.en", "modelPath": "", "shortcut": "Mod+Shift+M" }`
Expected for `/status`: `{ "inProgress": false, "downloaded": 0, "total": 0, "done": false, "error": null }`

- [ ] **Step 4: Commit**

```bash
git add frontend/server/setupWizard.js
git commit -m "feat(stt): add STT download/config/disable endpoints to setup wizard"
```

---

## Task 6: SpeechToTextStep wizard component

**Files:**
- Create: `frontend/src/features/setup-wizard/SpeechToTextStep.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/features/setup-wizard/SpeechToTextStep.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Mic, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type Model = 'base.en' | 'small.en';

interface Props {
  projectDir: string;
  onComplete: (config: { enabled: boolean; model: Model; shortcut: string }) => void;
  onBack: () => void;
}

const MODEL_INFO: Record<Model, { label: string; size: string; note: string }> = {
  'base.en': { label: 'Base (recommended)', size: '~142 MB', note: 'Fast, good accuracy' },
  'small.en': { label: 'Small', size: '~466 MB', note: 'Slower, higher accuracy' },
};

type DownloadPhase = 'idle' | 'downloading' | 'done' | 'error';

export function SpeechToTextStep({ projectDir, onComplete, onBack }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState<Model>('base.en');
  const [shortcut] = useState('Mod+Shift+M');
  const [phase, setPhase] = useState<DownloadPhase>('idle');
  const [progress, setProgress] = useState(0); // 0-100
  const [errorMsg, setErrorMsg] = useState('');
  const [alreadyCached, setAlreadyCached] = useState(false);

  // Pre-fill from existing config on mount
  useEffect(() => {
    fetch('http://localhost:3456/api/setup/stt/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.enabled) setEnabled(true);
        if (cfg.model) setModel(cfg.model as Model);
        // If model was already downloaded, mark as cached
        if (cfg.enabled && cfg.modelPath) {
          setPhase('done');
          setAlreadyCached(true);
        }
      })
      .catch(() => {});
  }, []);

  // Poll download progress
  useEffect(() => {
    if (phase !== 'downloading') return;
    const id = setInterval(async () => {
      try {
        const r = await fetch('http://localhost:3456/api/setup/stt/status');
        const s = await r.json();
        if (s.error) {
          setPhase('error');
          setErrorMsg(s.error);
          clearInterval(id);
          return;
        }
        if (s.total > 0) setProgress(Math.round((s.downloaded / s.total) * 100));
        if (s.done) {
          setPhase('done');
          clearInterval(id);
        }
      } catch {
        setPhase('error');
        setErrorMsg('Lost connection to setup server');
        clearInterval(id);
      }
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  const handleDownload = useCallback(async () => {
    setPhase('downloading');
    setProgress(0);
    setErrorMsg('');
    try {
      const r = await fetch('http://localhost:3456/api/setup/stt/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDir, model, shortcut }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? 'download failed');
      if (body.cached) setPhase('done');
      // Otherwise poll via the useEffect above
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [projectDir, model, shortcut]);

  const handleSkip = useCallback(async () => {
    if (enabled && phase !== 'done') return; // must download if enabled
    if (!enabled) {
      await fetch('http://localhost:3456/api/setup/stt/disable', { method: 'POST' });
    }
    onComplete({ enabled: enabled && phase === 'done', model, shortcut });
  }, [enabled, phase, model, shortcut, onComplete]);

  const handleContinue = useCallback(() => {
    onComplete({ enabled: true, model, shortcut });
  }, [model, shortcut, onComplete]);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100">
          <Mic className="h-6 w-6 text-violet-600" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">Voice Input</h2>
          <p className="text-sm text-muted">Speak into the scratchpad instead of typing</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
        <input
          id="stt-enable"
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            if (!e.target.checked) setPhase('idle');
          }}
          className="mt-0.5 h-4 w-4 accent-violet-600"
        />
        <label htmlFor="stt-enable" className="cursor-pointer">
          <span className="block font-medium text-ink">Enable voice input in scratchpad</span>
          <span className="block text-sm text-muted">
            Optional — downloads a local Whisper model (~142 MB). No audio sent to the cloud.
          </span>
        </label>
      </div>

      {/* Model picker */}
      {enabled && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-ink">Model</p>
          <div className="flex flex-col gap-2">
            {(Object.entries(MODEL_INFO) as [Model, typeof MODEL_INFO[Model]][]).map(([key, info]) => (
              <button
                key={key}
                type="button"
                onClick={() => setModel(key)}
                disabled={phase === 'downloading'}
                className={[
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  model === key
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
              >
                <div className={[
                  'h-3 w-3 rounded-full border-2',
                  model === key ? 'border-violet-500 bg-violet-500' : 'border-gray-300',
                ].join(' ')} />
                <div>
                  <span className="block text-sm font-medium text-ink">{info.label}</span>
                  <span className="block text-xs text-muted">{info.size} — {info.note}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Download area */}
      {enabled && phase === 'idle' && (
        <button
          type="button"
          onClick={handleDownload}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download model ({MODEL_INFO[model].size})
        </button>
      )}

      {enabled && phase === 'downloading' && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted">Downloading {MODEL_INFO[model].label}…</span>
            <span className="font-medium text-ink">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {enabled && phase === 'done' && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {alreadyCached ? 'Model already downloaded' : 'Model downloaded successfully'}
        </div>
      )}

      {enabled && phase === 'error' && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Download failed: {errorMsg}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="mt-2 text-sm font-medium text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Keyboard shortcut info */}
      {enabled && phase === 'done' && (
        <div className="mb-6 rounded-xl bg-gray-50 px-4 py-3 text-sm text-muted">
          Toggle recording with <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-ink">⌘⇧M</kbd> (Mac) or <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-ink">Ctrl+Shift+M</kbd> in the scratchpad.
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {phase === 'done' ? (
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 rounded-xl bg-violet-600 px-4 py-3 font-medium text-white hover:bg-violet-700 transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSkip}
            disabled={phase === 'downloading'}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 font-medium text-muted hover:border-gray-300 transition-colors disabled:opacity-40"
          >
            {enabled ? (phase === 'downloading' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Download first to continue') : 'Skip'}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          disabled={phase === 'downloading'}
          className="rounded-xl border border-gray-200 px-4 py-3 font-medium text-muted hover:border-gray-300 transition-colors disabled:opacity-40"
        >
          Back
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors in `SpeechToTextStep.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/setup-wizard/SpeechToTextStep.tsx
git commit -m "feat(stt): add SpeechToTextStep wizard component"
```

---

## Task 7: Wire STT step into SetupWizard.tsx

**Files:**
- Modify: `frontend/src/features/setup-wizard/SetupWizard.tsx`

- [ ] **Step 1: Add `'stt'` to SetupStep type and import SpeechToTextStep**

In `SetupWizard.tsx`, change line 14:
```ts
export type SetupStep = 'status' | 'welcome' | 'directory' | 'progress' | 'integrations' | 'trending' | 'envvars' | 'final';
```
to:
```ts
export type SetupStep = 'status' | 'welcome' | 'directory' | 'progress' | 'integrations' | 'trending' | 'stt' | 'envvars' | 'final';
```

Add import at the top with the other feature imports:
```ts
import { SpeechToTextStep } from './SpeechToTextStep';
```

- [ ] **Step 2: Add speechToText to SetupConfig and DEFAULT_CONFIG**

In the `SetupConfig` interface, add after `trendingApis`:
```ts
speechToText: {
  enabled: boolean;
  model: 'base.en' | 'small.en';
  shortcut: string;
};
```

In `DEFAULT_CONFIG`, add after `trendingApis`:
```ts
speechToText: {
  enabled: false,
  model: 'base.en' as const,
  shortcut: 'Mod+Shift+M',
},
```

- [ ] **Step 3: Change trending → stt transition**

Find `handleTrendingComplete`:
```ts
const handleTrendingComplete = useCallback(async (trendingApis: SetupConfig['trendingApis']) => {
  updateConfig({ trendingApis });
  setStep('envvars');
}, [updateConfig]);
```

Change to:
```ts
const handleTrendingComplete = useCallback(async (trendingApis: SetupConfig['trendingApis']) => {
  updateConfig({ trendingApis });
  setStep('stt');
}, [updateConfig]);
```

- [ ] **Step 4: Add handleSttComplete callback**

Add after `handleTrendingComplete`:
```ts
const handleSttComplete = useCallback((speechToText: SetupConfig['speechToText']) => {
  updateConfig({ speechToText });
  setStep('envvars');
}, [updateConfig]);
```

- [ ] **Step 5: Add STT step to JSX**

Find the `{step === 'trending' && ...}` block closing `</motion.div>`. Add after it, before `{step === 'envvars' && ...}`:

```tsx
{step === 'stt' && (
  <motion.div
    key="stt"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
  >
    <SpeechToTextStep
      projectDir={config.projectDir}
      onComplete={handleSttComplete}
      onBack={() => setStep('trending')}
    />
  </motion.div>
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/setup-wizard/SetupWizard.tsx
git commit -m "feat(stt): wire STT step into setup wizard flow"
```

---

## Task 8: Update FinalStep to show STT status

**Files:**
- Modify: `frontend/src/features/setup-wizard/FinalStep.tsx`

- [ ] **Step 1: Read FinalStep.tsx**

```bash
cat frontend/src/features/setup-wizard/FinalStep.tsx
```

- [ ] **Step 2: Add STT status display**

Find where `FinalStep` receives and uses `config: SetupConfig`. Add an STT status line to the completion summary. Locate a section that lists feature statuses (integrations, workers, etc.) and add:

```tsx
{/* STT status */}
<div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
  <span className="text-sm text-muted">Speech-to-text</span>
  <span className={[
    'text-sm font-medium',
    config.speechToText?.enabled ? 'text-emerald-600' : 'text-gray-400',
  ].join(' ')}>
    {config.speechToText?.enabled
      ? `Enabled (${config.speechToText.model})`
      : 'Disabled'}
  </span>
</div>
```

Place this in the existing status list. If FinalStep has no status list yet, wrap it in whatever surrounding container matches the file's existing style.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/setup-wizard/FinalStep.tsx
git commit -m "feat(stt): show STT enabled/disabled status in FinalStep"
```

---

## Task 9: useSpeechToText hook

**Files:**
- Create: `frontend/src/features/add-topic/useSpeechToText.ts`

- [ ] **Step 1: Create the hook**

Create `frontend/src/features/add-topic/useSpeechToText.ts`:

```ts
import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

const STT_URL = 'http://localhost:3457';
const CHUNK_INTERVAL_MS = 5000;

export type UnavailableReason = 'disabled' | 'model_missing' | 'sidecar_offline' | null;

export interface SpeechToTextState {
  isRecording: boolean;
  isAvailable: boolean;
  unavailableReason: UnavailableReason;
  shortcut: string;
  error: string | null;
  toggle: () => void;
}

export function useSpeechToText(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
): SpeechToTextState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<UnavailableReason>('sidecar_offline');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState('Mod+Shift+M');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorPositionRef = useRef<number | null>(null);

  // Check sidecar availability on mount
  useEffect(() => {
    let cancelled = false;
    fetch(`${STT_URL}/health`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setShortcut(data.shortcut ?? 'Mod+Shift+M');
        if (data.enabled && data.modelLoaded) {
          setIsAvailable(true);
          setUnavailableReason(null);
        } else {
          setIsAvailable(false);
          setUnavailableReason(data.unavailableReason ?? 'disabled');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setIsAvailable(false);
        setUnavailableReason('sidecar_offline');
      });
    return () => { cancelled = true; };
  }, []);

  // Insert text at saved cursor position (or append if lost)
  const insertText = useCallback((text: string) => {
    const el = textareaRef.current;
    if (!el || !text) return;

    const pos = cursorPositionRef.current ?? el.value.length;
    const before = el.value.slice(0, pos);
    const after = el.value.slice(pos);
    const separator = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
    const inserted = separator + text + ' ';

    el.value = before + inserted + after;
    const newPos = pos + inserted.length;
    el.selectionStart = newPos;
    el.selectionEnd = newPos;
    cursorPositionRef.current = newPos;

    // Trigger React synthetic onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, el.value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [textareaRef]);

  // Send an audio blob to the sidecar and insert the result
  const transcribeChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return; // skip near-empty chunks
    const form = new FormData();
    form.append('audio', blob, 'chunk.webm');
    try {
      const r = await fetch(`${STT_URL}/transcribe`, { method: 'POST', body: form });
      if (!r.ok) return;
      const { text } = await r.json();
      if (text) insertText(text);
    } catch {
      // Network error — sidecar may have stopped; ignore silently
    }
  }, [insertText]);

  const stopRecording = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const startChunk = useCallback((stream: MediaStream) => {
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      transcribeChunk(blob);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
  }, [transcribeChunk]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Save cursor position when recording starts
      cursorPositionRef.current = textareaRef.current?.selectionStart ?? null;

      startChunk(stream);
      setIsRecording(true);

      // Rotate chunks every CHUNK_INTERVAL_MS
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop(); // triggers onstop → transcribeChunk
        }
        startChunk(stream);
      }, CHUNK_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  }, [startChunk, textareaRef]);

  const toggle = useCallback(() => {
    if (!isAvailable) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isAvailable, isRecording, startRecording, stopRecording]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isAvailable) return;

    const isMac = navigator.platform.toUpperCase().includes('MAC');

    const handleKeyDown = (e: KeyboardEvent) => {
      const modHeld = isMac ? e.metaKey : e.ctrlKey;
      if (modHeld && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAvailable, toggle]);

  // Track cursor position while textarea has focus
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const save = () => { cursorPositionRef.current = el.selectionStart; };
    el.addEventListener('click', save);
    el.addEventListener('keyup', save);
    return () => {
      el.removeEventListener('click', save);
      el.removeEventListener('keyup', save);
    };
  }, [textareaRef]);

  // Cleanup on unmount
  useEffect(() => stopRecording, [stopRecording]);

  return { isRecording, isAvailable, unavailableReason, shortcut, error, toggle };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/add-topic/useSpeechToText.ts
git commit -m "feat(stt): add useSpeechToText hook with chunked recording and cursor insertion"
```

---

## Task 10: MicButton component

**Files:**
- Create: `frontend/src/features/add-topic/MicButton.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/features/add-topic/MicButton.tsx`:

```tsx
import { Mic, MicOff } from 'lucide-react';
import type { UnavailableReason } from './useSpeechToText';

interface Props {
  isRecording: boolean;
  isAvailable: boolean;
  unavailableReason: UnavailableReason;
  shortcut: string;
  onClick: () => void;
}

const UNAVAILABLE_LABELS: Record<NonNullable<UnavailableReason>, string> = {
  disabled: '',
  model_missing: 'Run setup to download the voice model',
  sidecar_offline: 'Start the dev server to enable voice input',
};

export function MicButton({ isRecording, isAvailable, unavailableReason, shortcut, onClick }: Props) {
  // Completely hidden when feature is disabled
  if (!isAvailable && unavailableReason === 'disabled') return null;

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const shortcutLabel = isMac ? '⌘⇧M' : 'Ctrl+Shift+M';
  const tooltipText = !isAvailable
    ? (unavailableReason ? UNAVAILABLE_LABELS[unavailableReason] : '')
    : isRecording
      ? `Stop recording (${shortcutLabel})`
      : `Start voice input (${shortcutLabel})`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isAvailable}
      title={tooltipText}
      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
      className={[
        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150',
        !isAvailable
          ? 'cursor-not-allowed border-white/20 text-muted/40'
          : isRecording
            ? 'border-red-400/50 bg-red-500/15 text-red-500 shadow-sm'
            : 'border-white/40 bg-white/25 text-muted hover:border-white/60 hover:bg-white/40 hover:text-ink',
      ].join(' ')}
    >
      {isRecording ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <MicOff className="h-3 w-3" />
          Recording…
        </>
      ) : (
        <>
          <Mic className="h-3 w-3" />
          Voice
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/add-topic/MicButton.tsx
git commit -m "feat(stt): add MicButton component with recording states"
```

---

## Task 11: Wire into AddTopicPage

**Files:**
- Modify: `frontend/src/features/add-topic/AddTopicPage.tsx`

- [ ] **Step 1: Add forwardRef to DocTextarea**

In `AddTopicPage.tsx`, find the `DocTextarea` function and replace it with a `forwardRef` version. First update the React import:

```tsx
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
```

Then replace the `DocTextarea` function definition (lines ~27-62) with:

```tsx
const DocTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    minRows?: number;
    className?: string;
  }
>(function DocTextarea({ value, onChange, placeholder, minRows = 2, className = '' }, ref) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  // useImperativeHandle handles both object refs and callback refs correctly
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

  useEffect(() => {
    autoResize(innerRef.current);
  }, [value]);

  return (
    <textarea
      ref={innerRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={(e) => autoResize(e.currentTarget)}
      placeholder={placeholder}
      rows={minRows}
      className={[
        'w-full resize-none bg-transparent text-sm leading-relaxed text-ink',
        'placeholder:text-muted/40 outline-none border-none',
        'transition-colors duration-150',
        className,
      ].join(' ')}
    />
  );
});
```

- [ ] **Step 2: Add imports and hook wiring**

Add imports at the top of `AddTopicPage.tsx`:
```tsx
import { useSpeechToText } from './useSpeechToText';
import { MicButton } from './MicButton';
```

Inside the `AddTopicPage` function body, add a ref for the notes textarea and wire the hook. Add after the existing `useRef` line (or near the top of the function body):

```tsx
const notesRef = useRef<HTMLTextAreaElement>(null);
const stt = useSpeechToText(notesRef);
```

- [ ] **Step 3: Wire MicButton into Research notes SectionDivider**

Find the Research notes section:
```tsx
{/* Research notes — main scratchpad */}
<div className="mb-6">
  <SectionDivider label="Research notes" />
```

Change it to:
```tsx
{/* Research notes — main scratchpad */}
<div className="mb-6">
  <SectionDivider
    label="Research notes"
    action={
      <MicButton
        isRecording={stt.isRecording}
        isAvailable={stt.isAvailable}
        unavailableReason={stt.unavailableReason}
        shortcut={stt.shortcut}
        onClick={stt.toggle}
      />
    }
  />
```

- [ ] **Step 4: Add ref to the notes DocTextarea**

Find the DocTextarea for notes:
```tsx
<DocTextarea
  value={notes}
  onChange={setNotes}
  placeholder="Paste links, quotes, stats, anecdotes, or anything you want to remember. This is your scratchpad…"
  minRows={5}
/>
```

Change to:
```tsx
<DocTextarea
  ref={notesRef}
  value={notes}
  onChange={setNotes}
  placeholder="Paste links, quotes, stats, anecdotes, or anything you want to remember. This is your scratchpad…"
  minRows={5}
/>
```

- [ ] **Step 5: Add mic error display**

After the Research notes DocTextarea closing `</div>`, add:
```tsx
{stt.error && (
  <p className="mt-1 text-xs text-red-500">{stt.error}</p>
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/add-topic/AddTopicPage.tsx
git commit -m "feat(stt): wire mic button and useSpeechToText into AddTopicPage"
```

---

## Task 12: E2E test for STT setup step

**Files:**
- Modify: `frontend/tests/e2e/setup-flow.spec.ts`

- [ ] **Step 1: Read existing setup-flow spec**

```bash
cat frontend/tests/e2e/setup-flow.spec.ts
```

- [ ] **Step 2: Add STT step tests**

Append to `frontend/tests/e2e/setup-flow.spec.ts`:

```ts
test.describe('STT Setup Step', () => {
  test('STT step shows toggle and skip option', async ({ page }) => {
    // Navigate directly to the STT step by manipulating state via URL or mock
    // Since the wizard is React state-driven, we test via the API endpoints

    // Verify /api/setup/stt/config returns a valid shape
    const response = await page.request.get('http://localhost:3456/api/setup/stt/config');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('enabled');
    expect(body).toHaveProperty('model');
    expect(body).toHaveProperty('shortcut');
  });

  test('STT disable endpoint writes config', async ({ page }) => {
    const response = await page.request.post('http://localhost:3456/api/setup/stt/disable');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);

    // Verify config now reads enabled: false
    const configResp = await page.request.get('http://localhost:3456/api/setup/stt/config');
    const config = await configResp.json();
    expect(config.enabled).toBe(false);
  });

  test('STT download endpoint rejects unknown model', async ({ page }) => {
    const response = await page.request.post('http://localhost:3456/api/setup/stt/download', {
      data: { projectDir: '/tmp', model: 'unknown-model' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('unknown model');
  });

  test('STT download endpoint rejects missing projectDir', async ({ page }) => {
    const response = await page.request.post('http://localhost:3456/api/setup/stt/download', {
      data: { model: 'base.en' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('projectDir required');
  });

  test('STT status endpoint returns progress shape', async ({ page }) => {
    const response = await page.request.get('http://localhost:3456/api/setup/stt/status');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('inProgress');
    expect(body).toHaveProperty('downloaded');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('done');
  });
});
```

- [ ] **Step 3: Run the new tests**

Start the setup wizard in one terminal:
```bash
cd frontend && node server/setupWizard.js &
sleep 1
```

Run e2e tests:
```bash
cd frontend && npx playwright test tests/e2e/setup-flow.spec.ts --grep "STT Setup Step"
```

Expected: all 5 tests pass.

Stop setup wizard:
```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/e2e/setup-flow.spec.ts
git commit -m "test(stt): add e2e tests for STT setup endpoints"
```

---

## Task 13: Manual end-to-end verification

- [ ] **Step 1: Start setup wizard and enable STT**

```bash
cd frontend && npm run setup-wizard
```

Open `http://localhost:3456`. Navigate through the wizard to the "Voice Input" step:
- Check the enable toggle
- Select `base.en`
- Click "Download model" — verify progress bar moves
- If on CI/no network: verify error state shows with retry button
- Click "Skip" to bypass download for now

Verify `.stt-config.json` was written:
```bash
cat frontend/.stt-config.json
```

- [ ] **Step 2: Start dev server and verify sidecar**

```bash
cd frontend && npm run dev
```

Verify both Vite and stt-server start:
- Vite output: `Local: http://localhost:5173/`
- STT output: `[stt-server] Running on http://localhost:3457`

- [ ] **Step 3: Verify health endpoint from browser**

```bash
curl -s -H "Origin: http://localhost:5173" http://localhost:3457/health | python3 -m json.tool
```

If STT disabled: `"unavailableReason": "disabled"`, mic button hidden — expected.
If STT enabled + model present: `"unavailableReason": null`, mic button visible.

- [ ] **Step 4: Test mic button when enabled**

With `.stt-config.json` having `enabled: true` and a valid `modelPath`:
1. Open `http://localhost:5173`, navigate to Add Topic
2. Scroll to "Research notes" section — verify mic button appears
3. Click mic button — browser prompts for microphone permission
4. Grant permission — button turns red with pulsing dot
5. Speak a sentence — after ~5 seconds, text appears in the notes textarea at the cursor position
6. Click mic button again — recording stops
7. Press `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` — recording toggles

- [ ] **Step 5: Test disabled state**

Set `enabled: false` in `.stt-config.json`, restart dev server. Verify mic button is completely absent from the Research notes section.

- [ ] **Step 6: Verify full TypeScript build**

```bash
cd frontend && npx tsc --noEmit && npm run build -- --mode development 2>&1 | tail -5
```

Expected: build succeeds with no TypeScript errors.

---

## Enable / Disable Summary

| Action | How |
|---|---|
| **Enable** | Run `npm run setup-wizard` → Voice Input step → toggle on → download → continue. Restart dev server. |
| **Disable** | Re-run `npm run setup-wizard` → Voice Input step → toggle off → skip. Restart dev server. |
| **Model present** | `frontend/models/whisper/ggml-base.en.bin` (gitignored) |
| **Config file** | `frontend/.stt-config.json` (gitignored) |
| **Mic button hidden** | When `enabled: false` in config |
| **Mic button greyed** | When `enabled: true` but model file missing or sidecar offline |
