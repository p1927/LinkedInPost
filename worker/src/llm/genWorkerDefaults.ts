import { getConfiguredLlmProviderIds, listModelsForProvider } from './catalog';
import type { LlmProviderId, LlmRef, WorkerEnvForLlm } from './types';

function isProviderId(v: string): v is LlmProviderId {
  return v === 'gemini' || v === 'grok' || v === 'openrouter';
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
  const provId = prov && isProviderId(prov) && configured.includes(prov) ? prov : configured[0];

  const models = await listModelsForProvider(env, provId);
  const first = models[0]?.value;
  if (!first) {
    throw new Error(`No models returned for provider ${provId}. Check API keys and provider status.`);
  }

  // Only use the override model if it exists in the provider's catalog.
  // This prevents stale or invalid model values (e.g. from D1 settings) from
  // reaching the provider API and causing 400 "unexpected model name format" errors.
  if (mod && models.some((m) => m.value === mod)) {
    return { provider: provId, model: mod };
  }

  return { provider: provId, model: first };
}
