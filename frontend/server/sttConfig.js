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

// Returns the path where nodejs-whisper stores its models internally.
// nodejs-whisper resolves models at <pkg>/cpp/whisper.cpp/models/ggml-<name>.bin
// (see frontend/node_modules/nodejs-whisper/dist/autoDownloadModel.js).
export function getLibraryModelPath(serverDir, modelName) {
  return join(
    serverDir,
    '../node_modules/nodejs-whisper/cpp/whisper.cpp/models',
    `ggml-${modelName}.bin`,
  );
}
