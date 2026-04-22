import type { LlmModelOption } from './types';

export const STATIC_MODELS_BY_PROVIDER: Record<string, LlmModelOption[]> = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite', provider: 'gemini' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini' },
  ],
  grok: [
    { value: 'grok-3', label: 'Grok 3', provider: 'grok' },
    { value: 'grok-3-mini', label: 'Grok 3 Mini', provider: 'grok' },
    { value: 'grok-2-latest', label: 'Grok 2 Latest', provider: 'grok' },
  ],
  minimax: [
    { value: 'MiniMax-M2.7', label: 'MiniMax M2.7', provider: 'minimax' },
    { value: 'MiniMax-M2', label: 'MiniMax M2', provider: 'minimax' },
  ],
};
