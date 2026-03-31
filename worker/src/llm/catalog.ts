import { listGeminiModels } from './providers/gemini';
import { listGrokModels } from './providers/grok';
import type { LlmModelOption, LlmProviderId, WorkerEnvForLlm } from './types';

const PROVIDER_ORDER: LlmProviderId[] = ['gemini', 'grok'];

export function isLlmProviderConfigured(env: WorkerEnvForLlm, provider: LlmProviderId): boolean {
  if (provider === 'gemini') return Boolean(String(env.GEMINI_API_KEY || '').trim());
  return Boolean(String(env.XAI_API_KEY || '').trim());
}

/** Providers that have credentials in env, in stable preference order (Gemini first). */
export function getConfiguredLlmProviderIds(env: WorkerEnvForLlm): LlmProviderId[] {
  return PROVIDER_ORDER.filter((p) => isLlmProviderConfigured(env, p));
}

export function hasAnyLlmProvider(env: WorkerEnvForLlm): boolean {
  return getConfiguredLlmProviderIds(env).length > 0;
}

export async function listModelsForProvider(
  env: WorkerEnvForLlm,
  provider: LlmProviderId,
): Promise<LlmModelOption[]> {
  if (provider === 'gemini') return listGeminiModels(env);
  return listGrokModels(env);
}

/** Live model lists per configured provider (same source as dashboard `listLlmModels`). */
export async function getLlmProviderCatalog(
  env: WorkerEnvForLlm,
): Promise<Array<{ provider: LlmProviderId; models: LlmModelOption[] }>> {
  const out: Array<{ provider: LlmProviderId; models: LlmModelOption[] }> = [];
  for (const provider of getConfiguredLlmProviderIds(env)) {
    out.push({ provider, models: await listModelsForProvider(env, provider) });
  }
  return out;
}
