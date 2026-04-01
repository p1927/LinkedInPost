export const LLM_PROVIDER_IDS = ['gemini', 'grok'] as const;

export const LLM_PROVIDER_LABELS: Record<(typeof LLM_PROVIDER_IDS)[number], string> = {
  gemini: 'Gemini',
  grok: 'Grok (xAI)',
};

export function getProviderLabel(id: (typeof LLM_PROVIDER_IDS)[number]): string {
  return LLM_PROVIDER_LABELS[id] ?? id;
}
