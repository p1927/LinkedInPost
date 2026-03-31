import { getConfiguredLlmProviderIds, listModelsForProvider } from './catalog';
import type { LlmProviderId, LlmRef, WorkerEnvForLlm } from './types';

function isProviderId(v: string): v is LlmProviderId {
  return v === 'gemini' || v === 'grok';
}

/**
 * Pick provider/model for the generation worker using the same catalog as the main Worker
 * (`listGeminiModels` / `listGrokModels`). Optional body override must reference a configured provider.
 */
export async function resolveGenerationWorkerLlmRef(
  env: WorkerEnvForLlm,
  override?: { provider?: string; model?: string },
): Promise<LlmRef> {
  const configured = getConfiguredLlmProviderIds(env);
  if (configured.length === 0) {
    throw new Error('No LLM provider is configured. Set GEMINI_API_KEY or XAI_API_KEY.');
  }

  const prov = String(override?.provider || '').trim();
  const mod = String(override?.model || '').trim();
  if (prov && mod && isProviderId(prov) && configured.includes(prov)) {
    return { provider: prov, model: mod };
  }

  const primary = configured[0];
  const models = await listModelsForProvider(env, primary);
  const first = models[0]?.value;
  if (!first) {
    throw new Error(`No models returned for provider ${primary}. Check API keys and provider status.`);
  }
  return { provider: primary, model: first };
}
