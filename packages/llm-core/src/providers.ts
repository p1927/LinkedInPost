export const LLM_PROVIDER_IDS = ['gemini', 'grok', 'openrouter', 'minimax'] as const;

export const LLM_PROVIDER_LABELS: Record<(typeof LLM_PROVIDER_IDS)[number], string> = {
  gemini: 'Gemini',
  grok: 'Grok (xAI)',
  openrouter: 'OpenRouter',
  minimax: 'MiniMax',
};

export function getProviderLabel(id: (typeof LLM_PROVIDER_IDS)[number]): string {
  return LLM_PROVIDER_LABELS[id] ?? id;
}
