export const GOOGLE_MODEL_DEFAULT = 'gemini-2.0-flash';

export interface GoogleModelPolicyConfig {
  googleModel?: string;
  allowedGoogleModels?: string[];
}

export function resolveAllowedGoogleModelIds(config: GoogleModelPolicyConfig): string[] {
  const raw = config.allowedGoogleModels;
  if (!Array.isArray(raw)) {
    return [GOOGLE_MODEL_DEFAULT];
  }
  const ids = [...new Set(raw.map((x) => String(x || '').trim()).filter(Boolean))];
  return ids.length > 0 ? ids : [GOOGLE_MODEL_DEFAULT];
}

export function resolveEffectiveGoogleModel(config: GoogleModelPolicyConfig, requested?: string | null): string {
  const allowed = resolveAllowedGoogleModelIds(config);
  const preferred = String(requested ?? '').trim();
  if (preferred && allowed.includes(preferred)) {
    return preferred;
  }
  const stored = String(config.googleModel ?? '').trim();
  if (stored && allowed.includes(stored)) {
    return stored;
  }
  return allowed[0] || GOOGLE_MODEL_DEFAULT;
}
