// Approved public surface for the llm module.
//
// Allowed categories:
//   - Gateway:  generateTextJsonWithFallback, generateMultimodalForRef, generateForRef
//   - Catalog:  getLlmProviderCatalog, listModelsForProvider, getConfiguredLlmProviderIds,
//               hasAnyLlmProvider, isLlmProviderConfigured
//   - Policy:   resolveAllowedGrokModelIds, resolveAllowedOpenrouterModelIds, resolveStoredPrimary, resolveStoredFallback,
//               resolveGenerationRef, resolveFallbackForGeneration,
//               resolveGithubAutomationGeminiModel, workspaceConfigFromStored
//   - Helpers:  generateLlmParsedJson, resolveGenerationWorkerLlmRef
//   - Types:    LlmModelOption, LlmProviderId, LlmRef, LlmWorkspaceConfig,
//               GenerationLlmPayload, WorkerEnvForLlm
//
// Direct provider symbols (generateGeminiJson, STATIC_GEMINI_MODELS, listGeminiModels,
// generateGrokJson, STATIC_GROK_MODELS, listGrokModels, etc.) are intentionally NOT
// re-exported here. Callers inside the llm/ directory import providers directly.
// Callers outside llm/ that need provider-specific symbols must import from
// ./llm/providers/{gemini,grok} directly.

export type { LlmModelOption, LlmProviderId, LlmRef, LlmWorkspaceConfig, GenerationLlmPayload, WorkerEnvForLlm } from './types';
export {
  resolveAllowedGrokModelIds,
  resolveAllowedOpenrouterModelIds,
  resolveAllowedMinimaxModelIds,
  resolveStoredPrimary,
  resolveStoredFallback,
  resolveGenerationRef,
  resolveFallbackForGeneration,
  resolveGithubAutomationGeminiModel,
  workspaceConfigFromStored,
} from './policy';
export { generateTextJsonWithFallback, generateMultimodalForRef, generateForRef } from './gateway';
export {
  getConfiguredLlmProviderIds,
  hasAnyLlmProvider,
  listModelsForProvider,
  getLlmProviderCatalog,
  isLlmProviderConfigured,
} from './catalog';
export { generateLlmParsedJson } from './structuredJson';
export { resolveGenerationWorkerLlmRef } from './genWorkerDefaults';
export type { LlmSettingKey, LlmSettingsMap } from './d1Settings';
export { LLM_SETTING_KEYS, getLlmSettingsFromD1, setLlmSettingInD1, seedLlmSettingsIfEmpty } from './d1Settings';
