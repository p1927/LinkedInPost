/**
 * Static token pricing map ($ per 1M tokens).
 * Prices are approximate and may lag behind provider updates.
 * OpenRouter models use dynamic pricing from the API response where available.
 */
export interface ModelPricing {
  inputPer1M: number;   // USD per 1M input tokens
  outputPer1M: number;  // USD per 1M output tokens
}

// Key format: "provider:model"
const PRICING: Record<string, ModelPricing> = {
  // Gemini
  'gemini:gemini-2.0-flash': { inputPer1M: 0.10, outputPer1M: 0.40 },
  'gemini:gemini-2.0-flash-lite': { inputPer1M: 0.075, outputPer1M: 0.30 },
  'gemini:gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30 },
  'gemini:gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.00 },
  'gemini:gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.60 },
  // Grok
  'grok:grok-3': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'grok:grok-3-mini': { inputPer1M: 0.30, outputPer1M: 0.50 },
  'grok:grok-2-latest': { inputPer1M: 2.00, outputPer1M: 10.00 },
  // OpenRouter popular models
  'openrouter:openai/gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
  'openrouter:openai/gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'openrouter:anthropic/claude-3.5-sonnet': { inputPer1M: 3.00, outputPer1M: 15.00 },
  'openrouter:anthropic/claude-3-haiku': { inputPer1M: 0.25, outputPer1M: 1.25 },
  'openrouter:google/gemini-2.0-flash-001': { inputPer1M: 0.10, outputPer1M: 0.40 },
  'openrouter:meta-llama/llama-3.3-70b-instruct': { inputPer1M: 0.12, outputPer1M: 0.30 },
};

export function estimateCostUsd(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const key = `${provider}:${model}`;
  const p = PRICING[key];
  if (!p) return 0; // unknown model — log as $0 rather than failing
  return (promptTokens / 1_000_000) * p.inputPer1M + (completionTokens / 1_000_000) * p.outputPer1M;
}
