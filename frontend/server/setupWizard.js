import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import https from 'https';
import { createWriteStream, existsSync, unlink, readFileSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { spawn } from 'child_process';
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

// ─── Setup State & Config Endpoints ────────────────────────────────────────

/**
 * Parse a .env / .dev.vars file and return key-value map
 */
function parseEnvFile(filePath) {
  try {
    if (!existsSync(filePath)) return {};
    const content = readFileSync(filePath, 'utf-8');
    const result = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex);
        let value = trimmed.substring(eqIndex + 1);
        value = value.replace(/^['"]|['"]$/g, '');
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * GET /api/setup/state?projectDir=/path/to/project
 * Returns setup state by reading .env and .dev.vars files
 */
app.get('/api/setup/state', (req, res) => {
  const { projectDir } = req.query;
  if (!projectDir || typeof projectDir !== 'string') {
    return res.status(400).json({ error: 'projectDir required' });
  }

  // Sanitize: must be absolute, no traversal
  const resolvedProject = path.resolve(projectDir);
  if (!path.isAbsolute(resolvedProject) || resolvedProject.includes('..')) {
    return res.status(400).json({ error: 'invalid projectDir' });
  }

  const frontendEnv = parseEnvFile(join(resolvedProject, 'frontend/.env'));
  const workerEnv = parseEnvFile(join(resolvedProject, 'worker/.dev.vars'));

  const allEnv = { ...frontendEnv, ...workerEnv };

  // Detect integrations
  const integrations = [
    {
      id: 'google',
      name: 'Google Workspace',
      connected: Boolean(workerEnv['GOOGLE_CLIENT_ID'] && workerEnv['GOOGLE_CREDENTIALS_JSON']),
      icon: 'mail',
      config: { clientId: workerEnv['GOOGLE_CLIENT_ID'] || '' },
      status: workerEnv['GOOGLE_CLIENT_ID'] ? 'connected' : 'disconnected',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      connected: Boolean(workerEnv['LINKEDIN_ACCESS_TOKEN']),
      icon: 'linkedin',
      config: {
        hasClientId: String(Boolean(workerEnv['LINKEDIN_CLIENT_ID'])),
        hasAccessToken: String(Boolean(workerEnv['LINKEDIN_ACCESS_TOKEN'])),
      },
      status: workerEnv['LINKEDIN_ACCESS_TOKEN'] ? 'connected' : 'disconnected',
    },
    {
      id: 'github',
      name: 'GitHub',
      connected: Boolean(workerEnv['SECRET_ENCRYPTION_KEY']),
      icon: 'github',
      config: {},
      status: workerEnv['SECRET_ENCRYPTION_KEY'] ? 'connected' : 'disconnected',
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Workers',
      connected: Boolean(workerEnv['CLOUDFLARE_API_TOKEN']),
      icon: 'cloud',
      config: {
        workerUrl: workerEnv['VITE_WORKER_URL'] || frontendEnv['VITE_WORKER_URL'] || '',
      },
      status: workerEnv['CLOUDFLARE_API_TOKEN'] ? 'connected' : 'disconnected',
    },
  ];

  // Required env vars
  const requiredEnvVars = [
    { name: 'VITE_GOOGLE_CLIENT_ID', isRequired: true, description: 'Google OAuth Client ID for authentication' },
    { name: 'VITE_WORKER_URL', isRequired: true, description: 'Cloudflare Worker URL for API backend' },
    { name: 'GOOGLE_CLIENT_ID', isRequired: true, description: 'Google service account client ID' },
    { name: 'GOOGLE_CREDENTIALS_JSON', isRequired: true, description: 'Google service account credentials JSON' },
    { name: 'GEMINI_API_KEY', isRequired: true, description: 'Gemini API key for content generation' },
    { name: 'CLOUDFLARE_API_TOKEN', isRequired: false, description: 'Cloudflare API token for deployment' },
    { name: 'LINKEDIN_CLIENT_ID', isRequired: false, description: 'LinkedIn OAuth app client ID' },
    { name: 'LINKEDIN_CLIENT_SECRET', isRequired: false, description: 'LinkedIn OAuth app secret' },
    { name: 'SERPAPI_API_KEY', isRequired: false, description: 'SerpAPI key for news research' },
  ];

  const envVars = requiredEnvVars.map(({ name, isRequired, description }) => ({
    name,
    value: allEnv[name] || '',
    isSet: Boolean(allEnv[name]?.trim()),
    isRequired,
    description,
  }));

  // Detect workers
  const workers = [
    {
      id: 'api-worker',
      name: 'API Worker',
      deployed: Boolean(workerEnv['VITE_WORKER_URL']),
      status: workerEnv['VITE_WORKER_URL'] ? 'running' : 'unknown',
      url: workerEnv['VITE_WORKER_URL'] || frontendEnv['VITE_WORKER_URL'] || '',
    },
    {
      id: 'generation-worker',
      name: 'Generation Worker',
      deployed: existsSync(join(resolvedProject, 'generation-worker/wrangler.jsonc')),
      status: 'unknown',
    },
  ];

  // Calculate progress
  const setRequiredVars = requiredEnvVars.filter(v => v.isRequired && allEnv[v.name]?.trim()).length;
  const totalRequired = requiredEnvVars.filter(v => v.isRequired).length;
  const connectedIntegrations = integrations.filter(i => i.connected).length;
  const varScore = totalRequired > 0 ? (setRequiredVars / totalRequired) * 50 : 0;
  const intScore = integrations.length > 0 ? (connectedIntegrations / integrations.length) * 50 : 0;
  const overallProgress = Math.round(varScore + intScore);

  res.json({
    envVars,
    integrations,
    workers,
    overallProgress,
    lastUpdated: new Date().toISOString(),
  });
});

/**
 * POST /api/setup/write-config
 * Write collected env vars to .env and .dev.vars files
 * Body: { projectDir: string, envVars: Record<string, string> }
 */
app.post('/api/setup/write-config', async (req, res) => {
  const { projectDir, envVars } = req.body || {};
  if (!projectDir || typeof projectDir !== 'string') {
    return res.status(400).json({ error: 'projectDir required' });
  }
  if (!envVars || typeof envVars !== 'object') {
    return res.status(400).json({ error: 'envVars required' });
  }

  // Sanitize: must be absolute, no traversal
  const resolvedProject = path.resolve(projectDir);
  if (!path.isAbsolute(resolvedProject) || resolvedProject.includes('..')) {
    return res.status(400).json({ error: 'invalid projectDir' });
  }

  try {
    // Ensure directories exist
    await mkdir(join(resolvedProject, 'frontend'), { recursive: true });
    await mkdir(join(resolvedProject, 'worker'), { recursive: true });

    // Write frontend .env (VITE_* vars)
    const frontendLines = ['# LinkedIn Post Frontend Environment Variables', ''];
    const workerLines = ['# LinkedIn Post Worker Environment Variables', ''];

    for (const [key, value] of Object.entries(envVars)) {
      if (!value || typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;

      if (key.startsWith('VITE_')) {
        frontendLines.push(`${key}=${trimmed}`);
      }
      // Also put non-VITE_ keys in worker
      if (!key.startsWith('VITE_')) {
        workerLines.push(`${key}=${trimmed}`);
      }
    }

    // Write frontend/.env
    const frontendEnvPath = join(resolvedProject, 'frontend/.env');
    writeFileSync(frontendEnvPath, frontendLines.join('\n'), 'utf-8');

    // Write worker/.dev.vars
    const workerVarsPath = join(resolvedProject, 'worker/.dev.vars');
    writeFileSync(workerVarsPath, workerLines.join('\n'), 'utf-8');

    res.json({ ok: true, message: 'Config files written successfully' });
  } catch (err) {
    res.status(500).json({ error: `Failed to write config: ${err.message}` });
  }
});

/**
 * POST /api/setup/validate-cloudflare
 * Validate Cloudflare API token by running wrangler whoami
 * Body: { apiToken: string }
 */
app.post('/api/setup/validate-cloudflare', (req, res) => {
  const { apiToken } = req.body || {};
  if (!apiToken || typeof apiToken !== 'string') {
    return res.status(400).json({ error: 'apiToken required' });
  }

  const child = spawn('npx', ['wrangler', 'whoami', '--json'], {
    env: { ...process.env, CLOUDFLARE_API_TOKEN: apiToken },
    timeout: 30000,
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (data) => { stdout += data.toString(); });
  child.stderr?.on('data', (data) => { stderr += data.toString(); });

  child.on('close', (code) => {
    if (code === 0) {
      try {
        const parsed = JSON.parse(stdout);
        res.json({ ok: true, result: parsed });
      } catch {
        res.json({ ok: true, result: { raw: stdout } });
      }
    } else {
      res.status(400).json({ ok: false, error: `Cloudflare validation failed: ${stderr.slice(0, 500)}` });
    }
  });

  child.on('error', (err) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

/**
 * POST /api/setup/run-setup-py
 * Run setup.py with provided args
 * Body: { projectDir: string, args: string[], envVars: Record<string, string> }
 */
app.post('/api/setup/run-setup-py', (req, res) => {
  const { projectDir, args = [], envVars = {} } = req.body || {};
  if (!projectDir || typeof projectDir !== 'string') {
    return res.status(400).json({ error: 'projectDir required' });
  }

  // Sanitize
  const resolvedProject = path.resolve(projectDir);
  if (!path.isAbsolute(resolvedProject) || resolvedProject.includes('..')) {
    return res.status(400).json({ error: 'invalid projectDir' });
  }

  // Build env with passed vars
  const env = { ...process.env, ...envVars };
  const fullArgs = args.length > 0 ? args : ['--all'];

  const child = spawn('python3', ['setup.py', ...fullArgs], {
    cwd: resolvedProject,
    env,
    timeout: 300000, // 5 min timeout for setup.py
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (data) => { stdout += data.toString(); });
  child.stderr?.on('data', (data) => { stderr += data.toString(); });

  child.on('close', (code) => {
    if (code === 0) {
      res.json({ ok: true, output: stdout });
    } else {
      res.status(500).json({ ok: false, error: `setup.py failed (exit ${code}): ${stderr.slice(0, 1000)}` });
    }
  });

  child.on('error', (err) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

/**
 * GET /api/setup/project-path
 * Auto-detect project path by looking for known files
 */
app.get('/api/setup/project-path', (req, res) => {
  const { cwd } = req.query;
  const searchBase = cwd && typeof cwd === 'string' ? path.resolve(cwd) : process.cwd();

  const markers = [
    'frontend/package.json',
    'worker/package.json',
    'setup.py',
    'package.json',
  ];

  let detected = '';
  for (const marker of markers) {
    const fullPath = join(searchBase, marker);
    if (existsSync(fullPath)) {
      detected = searchBase;
      break;
    }
  }

  res.json({ projectDir: detected || searchBase, detected: Boolean(detected) });
});

/**
 * POST /api/setup/reset-database
 * Reset D1 database tables (drafts, posts)
 * Body: { projectDir: string }
 */
app.post('/api/setup/reset-database', (req, res) => {
  const { projectDir } = req.body || {};
  if (!projectDir || typeof projectDir !== 'string') {
    return res.status(400).json({ error: 'projectDir required' });
  }

  const resolvedProject = path.resolve(projectDir);
  if (!path.isAbsolute(resolvedProject) || resolvedProject.includes('..')) {
    return res.status(400).json({ error: 'invalid projectDir' });
  }

  const workerDir = join(resolvedProject, 'worker');
  const child = spawn('bash', ['-c',
    `cd "${workerDir}" && npx wrangler d1 execute linkedin-pipeline-db --command="DELETE FROM sheet_rows" --local 2>/dev/null && npx wrangler d1 execute linkedin-pipeline-db --command="DELETE FROM generation_runs" --local 2>/dev/null && echo "done"`
  ], { timeout: 60000 });

  let stderr = '';
  child.stderr?.on('data', (data) => { stderr += data.toString(); });

  child.on('close', (code) => {
    if (code === 0) {
      res.json({ ok: true, message: 'Database reset complete' });
    } else {
      res.status(500).json({ ok: false, error: `Reset failed: ${stderr.slice(0, 500)}` });
    }
  });

  child.on('error', (err) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

/**
 * POST /api/setup/regenerate-features
 * Run scripts/generate_features.py
 * Body: { projectDir: string }
 */
app.post('/api/setup/regenerate-features', (req, res) => {
  const { projectDir } = req.body || {};
  if (!projectDir || typeof projectDir !== 'string') {
    return res.status(400).json({ error: 'projectDir required' });
  }

  const resolvedProject = path.resolve(projectDir);
  if (!path.isAbsolute(resolvedProject) || resolvedProject.includes('..')) {
    return res.status(400).json({ error: 'invalid projectDir' });
  }

  const child = spawn('python3', ['scripts/generate_features.py'], {
    cwd: resolvedProject,
    timeout: 60000,
  });

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (data) => { stdout += data.toString(); });
  child.stderr?.on('data', (data) => { stderr += data.toString(); });

  child.on('close', (code) => {
    if (code === 0) {
      res.json({ ok: true, message: 'Features regenerated', output: stdout });
    } else {
      res.status(500).json({ ok: false, error: `Failed: ${stderr.slice(0, 500)}` });
    }
  });

  child.on('error', (err) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

/**
 * POST /api/setup/deployment-mode
 * Write deploymentMode to features.yaml and regenerate features.ts
 * Body: { projectDir: string, mode: 'saas' | 'selfHosted' }
 */
app.post('/api/setup/deployment-mode', (req, res) => {
  const { projectDir, mode } = req.body || {};
  if (!projectDir || typeof projectDir !== 'string') {
    return res.status(400).json({ error: 'projectDir required' });
  }
  if (mode !== 'saas' && mode !== 'selfHosted') {
    return res.status(400).json({ error: 'mode must be saas or selfHosted' });
  }

  const resolvedProject = path.resolve(projectDir);
  if (!path.isAbsolute(resolvedProject) || resolvedProject.includes('..')) {
    return res.status(400).json({ error: 'invalid projectDir' });
  }

  const featuresPath = join(resolvedProject, 'features.yaml');
  try {
    let content = readFileSync(featuresPath, 'utf-8');
    content = content.replace(/^deploymentMode:.*$/m, `deploymentMode: ${mode}`);
    writeFileSync(featuresPath, content, 'utf-8');
  } catch (err) {
    return res.status(500).json({ error: `Failed to write features.yaml: ${err.message}` });
  }

  // Regenerate features.ts
  const child = spawn('python3', ['scripts/generate_features.py'], {
    cwd: resolvedProject,
    timeout: 30000,
  });

  let stderr = '';
  child.stderr?.on('data', d => { stderr += d.toString(); });

  child.on('close', code => {
    if (code === 0) {
      res.json({ ok: true, mode });
    } else {
      res.status(500).json({ ok: false, error: `generate_features.py failed: ${stderr.slice(0, 300)}` });
    }
  });

  child.on('error', err => res.status(500).json({ ok: false, error: err.message }));
});

// ─── STT Endpoints ───────────────────────────────────────────────────────────

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

  // Sanitize projectDir: must be absolute, no traversal
  const resolvedProject = path.resolve(projectDir);
  if (!path.isAbsolute(resolvedProject) || resolvedProject.includes('..')) {
    return res.status(400).json({ error: 'invalid projectDir' });
  }

  const destDir = join(
    resolvedProject,
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
            unlink(destPath, () => {}); // clean up partial download
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
