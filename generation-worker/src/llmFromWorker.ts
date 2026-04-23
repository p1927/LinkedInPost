/**
 * Re-exports the main Worker LLM module (no duplicate providers).
 * Imports are scoped to catalog / structured output / defaults — not llm/index.ts — so Wrangler does not bundle policy + google-model-policy.
 */
export type { LlmRef } from '@repo/llm-core';
export { generateLlmParsedJson } from '../../worker/src/llm/structuredJson';
export { hasAnyLlmProvider, getLlmProviderCatalog } from '../../worker/src/llm/catalog';
export { resolveGenerationWorkerLlmRef } from '../../worker/src/llm/genWorkerDefaults';
export { generateTextJsonWithFallback, generateMultimodalForRef } from '../../worker/src/llm/gateway';
