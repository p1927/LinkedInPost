import {
  GOOGLE_MODEL_DEFAULT,
  resolveAllowedGoogleModelIds,
  resolveEffectiveGoogleModel,
} from '../google-model-policy';
import { STATIC_GROK_MODELS } from './providers/grok';
import { STATIC_OPENROUTER_MODELS } from './providers/openrouter';
import { STATIC_MINIMAX_MODELS } from './providers/minimax';
import type { GenerationLlmPayload, LlmRef, LlmWorkspaceConfig, LlmProviderId } from './types';

export function resolveAllowedGrokModelIds(config: LlmWorkspaceConfig): string[] {
  const raw = config.llm?.allowedGrokModels;
  if (Array.isArray(raw) && raw.length > 0) {
    return [...new Set(raw.map((x) => String(x || '').trim()).filter(Boolean))];
  }
  return STATIC_GROK_MODELS.map((m) => m.value);
}

export function resolveAllowedOpenrouterModelIds(config: LlmWorkspaceConfig): string[] {
  const raw = config.llm?.allowedOpenrouterModels;
  if (Array.isArray(raw) && raw.length > 0) {
    return [...new Set(raw.map((x) => String(x || '').trim()).filter(Boolean))];
  }
  return STATIC_OPENROUTER_MODELS.map((m) => m.value);
}

export function resolveAllowedMinimaxModelIds(config: LlmWorkspaceConfig): string[] {
  const raw = config.llm?.allowedMinimaxModels;
  if (Array.isArray(raw) && raw.length > 0) {
    return [...new Set(raw.map((x) => String(x || '').trim()).filter(Boolean))];
  }
  return STATIC_MINIMAX_MODELS.map((m) => m.value);
}

function isLlmProviderId(v: string): v is LlmProviderId {
  return v === 'gemini' || v === 'grok' || v === 'openrouter' || v === 'minimax';
}

/** Workspace default primary (after allowlist checks). */
export function resolveStoredPrimary(config: LlmWorkspaceConfig, multiProvider: boolean): LlmRef {
  const gemDefault = resolveEffectiveGoogleModel(config, config.googleModel);
  if (!multiProvider) {
    return { provider: 'gemini', model: gemDefault };
  }
  const p = config.llm?.primary;
  if (p?.provider === 'grok' && p.model) {
    const allow = resolveAllowedGrokModelIds(config);
    const model = p.model.trim();
    if (allow.includes(model)) {
      return { provider: 'grok', model };
    }
  }
  if (p?.provider === 'openrouter' && p.model) {
    const allow = resolveAllowedOpenrouterModelIds(config);
    const model = p.model.trim();
    if (allow.includes(model)) {
      return { provider: 'openrouter', model };
    }
  }
  if (p?.provider === 'minimax' && p.model) {
    const allow = resolveAllowedMinimaxModelIds(config);
    const model = p.model.trim();
    if (allow.includes(model)) {
      return { provider: 'minimax', model };
    }
  }
  if (p?.provider === 'gemini' && p.model) {
    const m = resolveEffectiveGoogleModel(config, p.model);
    return { provider: 'gemini', model: m };
  }
  return { provider: 'gemini', model: gemDefault };
}

export function resolveStoredFallback(config: LlmWorkspaceConfig, multiProvider: boolean): LlmRef | undefined {
  if (!multiProvider) {
    return undefined;
  }
  const f = config.llm?.fallback;
  if (!f?.model?.trim()) {
    return undefined;
  }
  const model = f.model.trim();
  if (f.provider === 'grok') {
    const allow = resolveAllowedGrokModelIds(config);
    if (!allow.includes(model)) return undefined;
    return { provider: 'grok', model };
  }
  if (f.provider === 'openrouter') {
    const allow = resolveAllowedOpenrouterModelIds(config);
    if (!allow.includes(model)) return undefined;
    return { provider: 'openrouter', model };
  }
  if (f.provider === 'minimax') {
    const allow = resolveAllowedMinimaxModelIds(config);
    if (!allow.includes(model)) return undefined;
    return { provider: 'minimax', model };
  }
  if (f.provider === 'gemini') {
    return { provider: 'gemini', model: resolveEffectiveGoogleModel(config, model) };
  }
  return undefined;
}

/** Per-request override when client sends llm or legacy googleModel. */
export function resolveGenerationRef(
  config: LlmWorkspaceConfig,
  payload: GenerationLlmPayload,
  multiProvider: boolean,
): LlmRef {
  const primary = resolveStoredPrimary(config, multiProvider);
  const rawLlm = payload.llm;
  if (rawLlm && multiProvider) {
    const prov = String(rawLlm.provider || '').trim();
    const mod = String(rawLlm.model || '').trim();
    if (isLlmProviderId(prov) && mod) {
      if (prov === 'grok' && resolveAllowedGrokModelIds(config).includes(mod)) {
        return { provider: 'grok', model: mod };
      }
      if (prov === 'openrouter' && resolveAllowedOpenrouterModelIds(config).includes(mod)) {
        return { provider: 'openrouter', model: mod };
      }
      if (prov === 'minimax' && resolveAllowedMinimaxModelIds(config).includes(mod)) {
        return { provider: 'minimax', model: mod };
      }
      if (prov === 'gemini') {
        return { provider: 'gemini', model: resolveEffectiveGoogleModel(config, mod) };
      }
    }
  }
  const legacy = String(payload.googleModel || '').trim();
  if (legacy) {
    return { provider: 'gemini', model: resolveEffectiveGoogleModel(config, legacy) };
  }
  return primary;
}

export function resolveFallbackForGeneration(
  config: LlmWorkspaceConfig,
  primary: LlmRef,
  multiProvider: boolean,
): LlmRef | undefined {
  const fb = resolveStoredFallback(config, multiProvider);
  if (!fb) return undefined;
  if (fb.provider === primary.provider && fb.model === primary.model) {
    return undefined;
  }
  return fb;
}

export function resolveGithubAutomationGeminiModel(config: LlmWorkspaceConfig, multiProvider: boolean): string {
  const primary = resolveStoredPrimary(config, multiProvider);
  if (primary.provider === 'gemini') {
    return primary.model;
  }
  const allowed = resolveAllowedGoogleModelIds(config);
  const stored = resolveEffectiveGoogleModel(config, config.googleModel);
  if (stored && allowed.includes(stored)) {
    return stored;
  }
  return allowed[0] || GOOGLE_MODEL_DEFAULT;
}

export function workspaceConfigFromStored(
  googleModel: string,
  allowedGoogleModels: string[] | undefined,
  llm: LlmWorkspaceConfig['llm'] | undefined,
): LlmWorkspaceConfig {
  return { googleModel, allowedGoogleModels, llm };
}
