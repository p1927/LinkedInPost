import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'public', 'google-models.json');

const fallbackModels = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

function toLabel(modelName) {
  return modelName
    .split('-')
    .map(part => {
      if (/^\d/.test(part)) {
        return part;
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ')
    .replace('Gemini ', 'Gemini ');
}

function normalizeModels(models) {
  const filtered = models
    .filter(model => typeof model?.name === 'string')
    .filter(model => model.name.startsWith('models/gemini'))
    .filter(model => Array.isArray(model.supportedGenerationMethods))
    .filter(model => model.supportedGenerationMethods.includes('generateContent'))
    .map(model => {
      const value = model.name.replace(/^models\//, '');
      return {
        value,
        label: toLabel(value),
      };
    });

  const deduped = Array.from(new Map(filtered.map(model => [model.value, model])).values());
  return deduped.length > 0 ? deduped : fallbackModels;
}

async function fetchAvailableModels(apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
  if (!response.ok) {
    throw new Error(`Model discovery failed with status ${response.status}`);
  }

  const payload = await response.json();
  return normalizeModels(payload.models ?? []);
}

async function writeManifest(models, source) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source,
        models,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

  if (!apiKey) {
    await writeManifest(fallbackModels, 'fallback-no-key');
    console.warn('No GEMINI_API_KEY found for build-time model discovery. Using fallback model list.');
    return;
  }

  try {
    const models = await fetchAvailableModels(apiKey);
    await writeManifest(models, 'google-models-api');
    console.log(`Generated google-models.json with ${models.length} model entries.`);
  } catch (error) {
    await writeManifest(fallbackModels, 'fallback-fetch-failed');
    console.warn(`Failed to fetch Google models dynamically: ${error instanceof Error ? error.message : String(error)}`);
    console.warn('Wrote fallback model manifest instead.');
  }
}

await main();