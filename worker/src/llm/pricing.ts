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

/** Flat cost per image generation call (USD). Unknown models default to $0. */
const IMAGE_GEN_PRICING: Record<string, number> = {
  // DALL-E
  'dall-e:dall-e-3': 0.04,
  'dall-e:dall-e-2': 0.02,
  // Stability AI
  'stability:stable-diffusion-3': 0.065,
  'stability:stable-diffusion-xl-1024-v1-0': 0.002,
  'stability:stable-image-ultra': 0.08,
  'stability:stable-image-core': 0.03,
  // Ideogram
  'ideogram:ideogram-v2': 0.08,
  'ideogram:ideogram-v2-turbo': 0.05,
  // Flux (via fal.ai)
  'flux-kontext:flux-kontext-pro': 0.04,
  'flux-kontext:flux-kontext-max': 0.08,
  'flux-kontext:flux-dev': 0.025,
  'flux-kontext:flux-schnell': 0.003,
  // Gemini image generation
  'gemini:gemini-2.0-flash-preview-image-generation': 0.039,
  // Seedance
  'seedance:seedance-1-lite': 0.02,
  'seedance:seedance-1': 0.04,
  // Pixazo
  'pixazo:sdxl': 0.002,
};

export function estimateImageGenCostUsd(provider: string, model: string): number {
  const key = `${provider}:${model}`;
  return IMAGE_GEN_PRICING[key] ?? 0;
}

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
