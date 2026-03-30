export type LlmProviderId = 'gemini' | 'grok';

export interface LlmRef {
  provider: LlmProviderId;
  model: string;
}

export interface LlmModelOption {
  value: string;
  label: string;
}

/** Secrets + bindings used by LLM HTTP calls. */
export type WorkerEnvForLlm = {
  GEMINI_API_KEY?: string;
  XAI_API_KEY?: string;
};

/** Subset of StoredConfig for resolution (no import from index). */
export interface LlmWorkspaceConfig {
  googleModel: string;
  allowedGoogleModels?: string[];
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels?: string[];
  };
}

export interface GenerationLlmPayload {
  googleModel?: string;
  llm?: { provider?: string; model?: string };
}
