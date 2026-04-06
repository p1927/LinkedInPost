import { listGeminiModels, STATIC_GEMINI_MODELS } from './providers/gemini';
import { listGrokModels, STATIC_GROK_MODELS } from './providers/grok';
import { listOpenrouterModels, STATIC_OPENROUTER_MODELS } from './providers/openrouter';
import type { LlmModelOption, LlmProviderId, WorkerEnvForLlm } from './types';
import { LLM_PROVIDER_IDS } from '@repo/llm-core';

const ENV_KEY_MAP: Record<LlmProviderId, keyof WorkerEnvForLlm> = {
  gemini: 'GEMINI_API_KEY',
  grok: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

const STATIC_FALLBACKS: Record<LlmProviderId, LlmModelOption[]> = {
  gemini: STATIC_GEMINI_MODELS,
  grok: STATIC_GROK_MODELS,
  openrouter: STATIC_OPENROUTER_MODELS,
};

export function isLlmProviderConfigured(env: WorkerEnvForLlm, provider: LlmProviderId): boolean {
  const key = ENV_KEY_MAP[provider];
  if (!key) return false;
  return Boolean(String(env[key] || '').trim());
}

/** Providers that have credentials in env, in stable preference order (Gemini first). */
export function getConfiguredLlmProviderIds(env: WorkerEnvForLlm): LlmProviderId[] {
  return LLM_PROVIDER_IDS.filter((p) => isLlmProviderConfigured(env, p));
}

export function hasAnyLlmProvider(env: WorkerEnvForLlm): boolean {
  return getConfiguredLlmProviderIds(env).length > 0;
}

export async function listModelsForProvider(
  env: WorkerEnvForLlm,
  provider: LlmProviderId,
): Promise<LlmModelOption[]> {
  if (provider === 'gemini') return listGeminiModels(env);
  if (provider === 'openrouter') return listOpenrouterModels(env);
  return listGrokModels(env);
}

/** Live model lists per configured provider (same source as dashboard `listLlmModels`). */
export async function getLlmProviderCatalog(
  env: WorkerEnvForLlm,
): Promise<Array<{ provider: LlmProviderId; models: LlmModelOption[] }>> {
  const configured = getConfiguredLlmProviderIds(env);
  if (configured.length === 0) {
    console.warn('[llm/catalog] No LLM providers configured — check GEMINI_API_KEY / XAI_API_KEY env vars');
    return [];
  }

  const results = await Promise.allSettled(
    configured.map(async (provider) => ({
      provider,
      models: await listModelsForProvider(env, provider),
    })),
  );

  const out: Array<{ provider: LlmProviderId; models: LlmModelOption[] }> = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      out.push(result.value);
    } else {
      // Extract provider from the error context — use the index to correlate
      const idx = results.indexOf(result);
      const provider = configured[idx];
      console.error(`[llm/catalog] Failed to list models for "${provider}", using static fallback:`, result.reason);
      out.push({ provider, models: STATIC_FALLBACKS[provider] ?? [] });
    }
  }
  return out;
}
