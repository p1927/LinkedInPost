// Re-export shared types from llm-core
export type { LlmProviderId, LlmRef, LlmModelOption, GenerationLlmPayload } from '@repo/llm-core';

/** Secrets + bindings used by LLM HTTP calls. */
export type WorkerEnvForLlm = {
  GEMINI_API_KEY?: string;
  XAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MINIMAX_API_KEY?: string;
};

/** Subset of StoredConfig for resolution (no import from index). */
export interface LlmWorkspaceConfig {
  googleModel: string;
  allowedGoogleModels?: string[];
  llm?: {
    primary?: import('@repo/llm-core').LlmRef;
    fallback?: import('@repo/llm-core').LlmRef;
    allowedGrokModels?: string[];
    allowedOpenrouterModels?: string[];
    allowedMinimaxModels?: string[];
  };
}

export interface LlmGenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
}
