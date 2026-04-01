import { LLM_PROVIDER_IDS } from './providers';

export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

export interface LlmRef {
  provider: LlmProviderId;
  model: string;
}

export interface LlmModelOption {
  label: string;
  value: string;
  provider: LlmProviderId;
  displayName?: string;
}

export interface GenerationLlmPayload {
  googleModel?: string;
  llm?: { provider?: string; model?: string };
}
