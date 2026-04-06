# OpenRouter Admin Allowlist & Tenant Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire OpenRouter fully into the admin allowed-models system so (a) admins can fetch live OpenRouter models and pick an allowlist, and (b) tenants see only admin-approved OpenRouter models during generation.

**Architecture:** Mirror the existing Grok allowlist pattern end-to-end: types → worker save/bootstrap/RPC → frontend hook → admin UI → tenant UI. Every OpenRouter change is a direct parallel of the Grok code that already exists.

**Tech Stack:** TypeScript, Cloudflare Workers, React, Vite, `@repo/llm-core` shared package.

---

## File Map

| File | Change |
|---|---|
| `worker/src/llm/index.ts` | Re-export `resolveAllowedOpenrouterModelIds` from policy (mirrors `resolveAllowedGrokModelIds`) |
| `worker/src/index.ts` | Add imports for `listOpenrouterModels`/`STATIC_OPENROUTER_MODELS` and `resolveAllowedOpenrouterModelIds`; add `allowedOpenrouterModels` to `StoredConfig.llm`, `BotConfig.llm`, `BotConfigUpdate.llm`; add `openrouter` to `llmProviderKeys`; add `openrouter` case to `listLlmModels`; filter by allowlist in `getLlmProviderCatalog`; add `normalizeAllowedOpenrouterModelsAgainstCatalog`, `computeNextAllowedOpenrouterModels`; update `computeNextLlmStored` and bootstrap |
| `frontend/src/services/configService.ts` | Add `allowedOpenrouterModels` to `BotConfig.llm` / `BotConfigUpdate.llm`; add `openrouter` to `llmProviderKeys`; update `normalizeBotConfig` |
| `frontend/src/components/dashboard/hooks/useDashboardSettings.ts` | Add OpenRouter catalog state, fetch, allowed-models state, toggle, refresh, save, unsaved-changes tracking |
| `frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx` | Add OpenRouter props; fix primary/fallback catalog selection; add "Allowed OpenRouter models" section; add key-status line; add refresh button |
| `frontend/src/features/review/components/PostGenerateSettings.tsx` | Add `openrouter` to `llmProviderKeys` type; fix "no keys" hint |

---

## Task 0: Add missing imports/exports

**Files:**
- Modify: `worker/src/llm/index.ts`
- Modify: `worker/src/index.ts` (lines ~39-57)

- [ ] **Step 1: Re-export `resolveAllowedOpenrouterModelIds` from `worker/src/llm/index.ts`**

Find:
```typescript
//   - Policy:   resolveAllowedGrokModelIds, resolveStoredPrimary, resolveStoredFallback,
```
Replace with:
```typescript
//   - Policy:   resolveAllowedGrokModelIds, resolveAllowedOpenrouterModelIds, resolveStoredPrimary, resolveStoredFallback,
```

Find:
```typescript
  resolveAllowedGrokModelIds,
```
Replace with:
```typescript
  resolveAllowedGrokModelIds,
  resolveAllowedOpenrouterModelIds,
```

- [ ] **Step 2: Add OpenRouter provider imports to `worker/src/index.ts`**

Find:
```typescript
import { listGrokModels, STATIC_GROK_MODELS } from './llm/providers/grok';
```
Replace with:
```typescript
import { listGrokModels, STATIC_GROK_MODELS } from './llm/providers/grok';
import { listOpenrouterModels, STATIC_OPENROUTER_MODELS } from './llm/providers/openrouter';
```

- [ ] **Step 3: Add `resolveAllowedOpenrouterModelIds` to the `./llm` import block**

Find:
```typescript
  resolveAllowedGrokModelIds,
  resolveGithubAutomationGeminiModel,
```
Replace with:
```typescript
  resolveAllowedGrokModelIds,
  resolveAllowedOpenrouterModelIds,
  resolveGithubAutomationGeminiModel,
```

- [ ] **Step 4: Run TypeScript dry-run**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0.

---

## Task 1: Add `allowedOpenrouterModels` to worker-side types

**Files:**
- Modify: `worker/src/index.ts` (lines ~141-145, ~250-254, ~293-297)

- [ ] **Step 1: Update `BotConfig.llm` to include `allowedOpenrouterModels`**

Find (around line 141):
```typescript
  llm?: {
    primary: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels: string[];
  };
  llmProviderKeys?: {
    gemini: boolean;
    grok: boolean;
  };
```
Replace with:
```typescript
  llm?: {
    primary: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels: string[];
    allowedOpenrouterModels: string[];
  };
  llmProviderKeys?: {
    gemini: boolean;
    grok: boolean;
    openrouter: boolean;
  };
```

- [ ] **Step 2: Update `StoredConfig.llm` to include `allowedOpenrouterModels`**

Find (around line 250):
```typescript
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels?: string[];
  };
```
Replace with:
```typescript
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels?: string[];
    allowedOpenrouterModels?: string[];
  };
```

- [ ] **Step 3: Update `BotConfigUpdate.llm` to include `allowedOpenrouterModels`**

Find (around line 293):
```typescript
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef | null;
    allowedGrokModels?: string[];
  };
```
Replace with:
```typescript
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef | null;
    allowedGrokModels?: string[];
    allowedOpenrouterModels?: string[];
  };
```

- [ ] **Step 4: Run TypeScript dry-run to confirm no type errors**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0, no tsc errors.

---

## Task 2: Add `normalizeAllowedOpenrouterModelsAgainstCatalog` and update `computeNextLlmStored`

**Files:**
- Modify: `worker/src/index.ts` (around lines 2721-2835)

- [ ] **Step 1: Add the normalize function after `normalizeAllowedGrokModelsAgainstCatalog`**

After the closing `}` of `normalizeAllowedGrokModelsAgainstCatalog` (around line 2740), insert:
```typescript
async function normalizeAllowedOpenrouterModelsAgainstCatalog(env: Env, raw: unknown[]): Promise<string[]> {
  const catalogModels = await listOpenrouterModels(env);
  const catalog = new Set<string>();
  for (const m of catalogModels) {
    catalog.add(m.value);
  }
  for (const m of STATIC_OPENROUTER_MODELS) {
    catalog.add(m.value);
  }
  const picked = [...new Set(
    raw
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .filter((id) => catalog.has(id)),
  )];
  if (picked.length === 0) {
    throw new Error('Choose at least one allowed OpenRouter model from the catalog.');
  }
  return picked;
}
```

- [ ] **Step 2: Add `computeNextAllowedOpenrouterModels` after `computeNextAllowedGrokModels`**

After the closing `}` of `computeNextAllowedGrokModels` (around line 2788), insert:
```typescript
async function computeNextAllowedOpenrouterModels(
  env: Env,
  current: StoredConfig,
  update: BotConfigUpdate,
): Promise<string[]> {
  if (!FEATURE_MULTI_PROVIDER_LLM) {
    return resolveAllowedOpenrouterModelIds(
      workspaceConfigFromStored(current.googleModel, current.allowedGoogleModels, current.llm),
    );
  }
  if (Array.isArray(update.llm?.allowedOpenrouterModels) && update.llm.allowedOpenrouterModels.length > 0) {
    return normalizeAllowedOpenrouterModelsAgainstCatalog(env, update.llm.allowedOpenrouterModels);
  }
  return resolveAllowedOpenrouterModelIds(
    workspaceConfigFromStored(current.googleModel, current.allowedGoogleModels, current.llm),
  );
}
```

- [ ] **Step 3: Update `computeNextLlmStored` to compute and use OpenRouter allowlist**

Find the body of `computeNextLlmStored` (around line 2790). Replace the function with:
```typescript
async function computeNextLlmStored(
  env: Env,
  current: StoredConfig,
  update: BotConfigUpdate,
  nextAllowedGoogle: string[],
  resolvedGoogleModel: string,
): Promise<StoredConfig['llm'] | undefined> {
  if (!FEATURE_MULTI_PROVIDER_LLM) {
    return undefined;
  }
  const grokAllowed = await computeNextAllowedGrokModels(env, current, update, nextAllowedGoogle, resolvedGoogleModel);
  const openrouterAllowed = await computeNextAllowedOpenrouterModels(env, current, update);
  const geminiPolicy = { googleModel: resolvedGoogleModel, allowedGoogleModels: nextAllowedGoogle };
  const ws = workspaceConfigFromStored(resolvedGoogleModel, nextAllowedGoogle, {
    ...current.llm,
    allowedGrokModels: grokAllowed,
    allowedOpenrouterModels: openrouterAllowed,
  });

  let primary: LlmRef = update.llm?.primary ?? current.llm?.primary ?? resolveStoredPrimary(ws, true);
  if (primary.provider === 'grok' && !grokAllowed.includes(primary.model)) {
    primary = resolveStoredPrimary(ws, true);
  }
  if (primary.provider === 'openrouter' && !openrouterAllowed.includes(primary.model)) {
    primary = resolveStoredPrimary(ws, true);
  }
  if (primary.provider === 'gemini') {
    primary = {
      provider: 'gemini',
      model: resolveEffectiveGoogleModel(geminiPolicy, primary.model),
    };
  }

  let fallback: LlmRef | undefined =
    update.llm?.fallback === null ? undefined : (update.llm?.fallback ?? current.llm?.fallback);
  if (fallback) {
    if (fallback.provider === 'grok' && !grokAllowed.includes(fallback.model)) {
      fallback = undefined;
    } else if (fallback.provider === 'openrouter' && !openrouterAllowed.includes(fallback.model)) {
      fallback = undefined;
    } else if (fallback.provider === 'gemini') {
      fallback = {
        provider: 'gemini',
        model: resolveEffectiveGoogleModel(geminiPolicy, fallback.model),
      };
    }
    if (fallback && fallback.provider === primary.provider && fallback.model === primary.model) {
      fallback = undefined;
    }
  }

  return { primary, fallback, allowedGrokModels: grokAllowed, allowedOpenrouterModels: openrouterAllowed };
}
```

- [ ] **Step 4: Run TypeScript dry-run**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0.

---

## Task 3: Update worker `listLlmModels` RPC and `getLlmProviderCatalog` RPC

**Files:**
- Modify: `worker/src/index.ts` (lines ~857-898)

- [ ] **Step 1: Add `openrouter` case to `listLlmModels`**

Find (around line 871):
```typescript
      if (provider === 'grok') {
        const full = await listGrokModels(env);
        if (session.isAdmin) {
          return full;
        }
        const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
        const allow = new Set(resolveAllowedGrokModelIds(ws));
        const filtered = full.filter((m) => allow.has(m.value));
        return filtered.length > 0 ? filtered : full.filter((m) => allow.has(m.value));
      }
      throw new Error('Unknown LLM provider.');
```
Replace with:
```typescript
      if (provider === 'grok') {
        const full = await listGrokModels(env);
        if (session.isAdmin) {
          return full;
        }
        const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
        const allow = new Set(resolveAllowedGrokModelIds(ws));
        const filtered = full.filter((m) => allow.has(m.value));
        return filtered.length > 0 ? filtered : full.filter((m) => allow.has(m.value));
      }
      if (provider === 'openrouter') {
        const full = await listOpenrouterModels(env);
        if (session.isAdmin) {
          return full;
        }
        const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
        const allow = new Set(resolveAllowedOpenrouterModelIds(ws));
        const filtered = full.filter((m) => allow.has(m.value));
        return filtered.length > 0 ? filtered : STATIC_OPENROUTER_MODELS.filter((m) => allow.has(m.value));
      }
      throw new Error('Unknown LLM provider.');
```

- [ ] **Step 2: Update `getLlmProviderCatalog` to filter by allowlist and add openrouter to staticFallbacks**

Find (around line 883):
```typescript
    case 'getLlmProviderCatalog': {
      if (!FEATURE_MULTI_PROVIDER_LLM) {
        throw new Error('Multi-provider LLM is disabled for this deployment.');
      }
      const catalog = await getLlmProviderCatalog(env);
      return {
        providers: catalog.map((entry) => ({
          id: entry.provider,
          name: getProviderLabel(entry.provider),
          models: entry.models,
        })),
        staticFallbacks: {
          gemini: STATIC_GEMINI_MODELS,
          grok: STATIC_GROK_MODELS,
        },
      };
    }
```
Replace with:
```typescript
    case 'getLlmProviderCatalog': {
      if (!FEATURE_MULTI_PROVIDER_LLM) {
        throw new Error('Multi-provider LLM is disabled for this deployment.');
      }
      const catalog = await getLlmProviderCatalog(env);
      const ws = workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
      return {
        providers: catalog.map((entry) => {
          let models = entry.models;
          if (!session.isAdmin) {
            if (entry.provider === 'gemini') {
              const allow = new Set(resolveAllowedGoogleModelIds(storedConfig));
              models = models.filter((m) => allow.has(m.value));
              if (models.length === 0) models = STATIC_GEMINI_MODELS.filter((m) => allow.has(m.value));
            } else if (entry.provider === 'grok') {
              const allow = new Set(resolveAllowedGrokModelIds(ws));
              models = models.filter((m) => allow.has(m.value));
              if (models.length === 0) models = STATIC_GROK_MODELS.filter((m) => allow.has(m.value));
            } else if (entry.provider === 'openrouter') {
              const allow = new Set(resolveAllowedOpenrouterModelIds(ws));
              models = models.filter((m) => allow.has(m.value));
              if (models.length === 0) models = STATIC_OPENROUTER_MODELS.filter((m) => allow.has(m.value));
            }
          }
          return {
            id: entry.provider,
            name: getProviderLabel(entry.provider),
            models,
          };
        }),
        staticFallbacks: {
          gemini: STATIC_GEMINI_MODELS,
          grok: STATIC_GROK_MODELS,
          openrouter: STATIC_OPENROUTER_MODELS,
        },
      };
    }
```

- [ ] **Step 3: Update bootstrap response to include `allowedOpenrouterModels` and `openrouter` key status**

Find (around line 1694):
```typescript
  if (FEATURE_MULTI_PROVIDER_LLM) {
    const ws = workspaceConfigFromStored(config.googleModel, config.allowedGoogleModels, config.llm);
    base = {
      ...base,
      llm: {
        primary: resolveStoredPrimary(ws, true),
        fallback: resolveStoredFallback(ws, true),
        allowedGrokModels: resolveAllowedGrokModelIds(ws),
      },
      llmProviderKeys: (() => {
        const ids = getConfiguredLlmProviderIds(env);
        return { gemini: ids.includes('gemini'), grok: ids.includes('grok') };
      })(),
    };
  }
```
Replace with:
```typescript
  if (FEATURE_MULTI_PROVIDER_LLM) {
    const ws = workspaceConfigFromStored(config.googleModel, config.allowedGoogleModels, config.llm);
    base = {
      ...base,
      llm: {
        primary: resolveStoredPrimary(ws, true),
        fallback: resolveStoredFallback(ws, true),
        allowedGrokModels: resolveAllowedGrokModelIds(ws),
        allowedOpenrouterModels: resolveAllowedOpenrouterModelIds(ws),
      },
      llmProviderKeys: (() => {
        const ids = getConfiguredLlmProviderIds(env);
        return { gemini: ids.includes('gemini'), grok: ids.includes('grok'), openrouter: ids.includes('openrouter') };
      })(),
    };
  }
```

- [ ] **Step 4: Run TypeScript dry-run**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0.

---

## Task 4: Update frontend `configService.ts` types

**Files:**
- Modify: `frontend/src/services/configService.ts`

- [ ] **Step 1: Add `allowedOpenrouterModels` to `BotConfig.llm` and `openrouter` to `llmProviderKeys`**

Find the `BotConfig` interface section containing:
```typescript
  llm?: {
    primary: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels: string[];
  };
  llmProviderKeys?: {
    gemini: boolean;
    grok: boolean;
  };
```
Replace with:
```typescript
  llm?: {
    primary: LlmRef;
    fallback?: LlmRef;
    allowedGrokModels: string[];
    allowedOpenrouterModels: string[];
  };
  llmProviderKeys?: {
    gemini: boolean;
    grok: boolean;
    openrouter: boolean;
  };
```

- [ ] **Step 2: Add `allowedOpenrouterModels` to `BotConfigUpdate.llm`**

Find:
```typescript
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef | null;
    allowedGrokModels?: string[];
  };
```
Replace with:
```typescript
  llm?: {
    primary?: LlmRef;
    fallback?: LlmRef | null;
    allowedGrokModels?: string[];
    allowedOpenrouterModels?: string[];
  };
```

- [ ] **Step 3: Update `normalizeBotConfig` to copy `allowedOpenrouterModels`**

Find (in `normalizeBotConfig`, the section building the llm object around line 388):
```typescript
        allowedGrokModels: [...(config.llm.allowedGrokModels || [])],
```
Replace with:
```typescript
        allowedGrokModels: [...(config.llm.allowedGrokModels || [])],
        allowedOpenrouterModels: [...(config.llm.allowedOpenrouterModels || [])],
```

- [ ] **Step 4: Run TypeScript dry-run**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0.

---

## Task 5: Update `useDashboardSettings.ts` — add OpenRouter state and logic

**Files:**
- Modify: `frontend/src/components/dashboard/hooks/useDashboardSettings.ts`

- [ ] **Step 1: Add `openrouterCatalogModels` and `allowedOpenrouterModels` state**

After the line:
```typescript
  const [grokCatalogModels, setGrokCatalogModels] = useState<GoogleModelOption[]>([]);
```
Add:
```typescript
  const [openrouterCatalogModels, setOpenrouterCatalogModels] = useState<GoogleModelOption[]>([]);
  const [allowedOpenrouterModels, setAllowedOpenrouterModels] = useState<string[]>(() =>
    FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedOpenrouterModels?.length
      ? [...session.config.llm.allowedOpenrouterModels]
      : [],
  );
```

- [ ] **Step 2: Add `normalizeOpenrouterOptions` helper (after `normalizeGrokOptions`)**

After the `normalizeGrokOptions` function definition, add:
```typescript
function normalizeOpenrouterOptions(models: GoogleModelOption[], selected?: string): GoogleModelOption[] {
  const deduped = Array.from(
    new Map(models.filter((m) => m.value.trim() && m.label.trim()).map((m) => [m.value.trim(), m])).values(),
  );
  if (selected && !deduped.some((m) => m.value === selected)) {
    deduped.unshift({ value: selected, label: selected, provider: 'openrouter' as const });
  }
  return deduped;
}
```

- [ ] **Step 3: Add OpenRouter models fetch effect (after the Grok fetch effect)**

After the closing `}` of the Grok fetch `useEffect` (the one ending around line 208), add:
```typescript
  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM) return;
    let cancelled = false;
    const run = async () => {
      try {
        const models = normalizeOpenrouterOptions(await api.listLlmModels(idToken, 'openrouter'));
        if (!cancelled) setOpenrouterCatalogModels(models);
      } catch {
        if (!cancelled) setOpenrouterCatalogModels([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [api, idToken]);
```

- [ ] **Step 4: Add OpenRouter allowed-models sync effect and auto-init (after the Grok equivalent)**

After the existing `useEffect` that auto-inits allowed Grok models (around line 210-215), add:
```typescript
  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM || !session.isAdmin) return;
    if (allowedOpenrouterModels.length > 0) return;
    if (openrouterCatalogModels.length === 0) return;
    setAllowedOpenrouterModels(openrouterCatalogModels.map((m) => m.value));
  }, [session.isAdmin, openrouterCatalogModels, allowedOpenrouterModels.length]);
```

- [ ] **Step 5: Update the `allowedGrokModels` sync effect to also sync OpenRouter**

Find:
```typescript
  useEffect(() => {
    setAllowedGoogleModels([...session.config.allowedGoogleModels]);
    if (FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedGrokModels?.length) {
      setAllowedGrokModels([...session.config.llm.allowedGrokModels]);
    }
  }, [session.config.allowedGoogleModels, session.config.llm?.allowedGrokModels]);
```
Replace with:
```typescript
  useEffect(() => {
    setAllowedGoogleModels([...session.config.allowedGoogleModels]);
    if (FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedGrokModels?.length) {
      setAllowedGrokModels([...session.config.llm.allowedGrokModels]);
    }
    if (FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedOpenrouterModels?.length) {
      setAllowedOpenrouterModels([...session.config.llm.allowedOpenrouterModels]);
    }
  }, [session.config.allowedGoogleModels, session.config.llm?.allowedGrokModels, session.config.llm?.allowedOpenrouterModels]);
```

- [ ] **Step 6: Add `toggleAllowedOpenrouterModel` and `refreshOpenrouterModels`**

After the `toggleAllowedGrokModel` callback definition, add:
```typescript
  const toggleAllowedOpenrouterModel = useCallback((modelId: string, enabled: boolean) => {
    setAllowedOpenrouterModels((prev) => {
      if (enabled) {
        return [...new Set([...prev, modelId])];
      }
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((id) => id !== modelId);
    });
  }, []);

  const refreshOpenrouterModels = useCallback(async () => {
    if (!FEATURE_MULTI_PROVIDER_LLM) return;
    try {
      const models = normalizeOpenrouterOptions(await api.listLlmModels(idToken, 'openrouter'), googleModel);
      setOpenrouterCatalogModels(models);
    } catch (error) {
      handleFailure(error, 'Failed to load OpenRouter models.');
    }
  }, [api, idToken, googleModel, handleFailure]);
```

- [ ] **Step 7: Update `availableModels` memo to handle OpenRouter**

Find:
```typescript
  const availableModels = useMemo(() => {
    if (FEATURE_MULTI_PROVIDER_LLM && llmPrimaryProvider === 'grok') {
      const catalog = grokCatalogModels.length > 0 ? grokCatalogModels : normalizeGrokOptions([], googleModel);
      const allow = new Set(effectiveAllowedGrok.length > 0 ? effectiveAllowedGrok : catalog.map((m) => m.value));
      return catalog.filter((model) => allow.has(model.value));
    }
    const allow = new Set(effectiveAllowedGemini.length > 0 ? effectiveAllowedGemini : [DEFAULT_GOOGLE_MODEL]);
    return catalogModels.filter((model) => allow.has(model.value));
  }, [
    llmPrimaryProvider,
    grokCatalogModels,
    catalogModels,
    effectiveAllowedGemini,
    effectiveAllowedGrok,
    googleModel,
  ]);
```
Replace with:
```typescript
  const effectiveAllowedOpenrouter = session.isAdmin
    ? allowedOpenrouterModels
    : session.config.llm?.allowedOpenrouterModels || [];

  const availableModels = useMemo(() => {
    if (FEATURE_MULTI_PROVIDER_LLM && llmPrimaryProvider === 'grok') {
      const catalog = grokCatalogModels.length > 0 ? grokCatalogModels : normalizeGrokOptions([], googleModel);
      const allow = new Set(effectiveAllowedGrok.length > 0 ? effectiveAllowedGrok : catalog.map((m) => m.value));
      return catalog.filter((model) => allow.has(model.value));
    }
    if (FEATURE_MULTI_PROVIDER_LLM && llmPrimaryProvider === 'openrouter') {
      const catalog = openrouterCatalogModels.length > 0 ? openrouterCatalogModels : normalizeOpenrouterOptions([], googleModel);
      const allow = new Set(effectiveAllowedOpenrouter.length > 0 ? effectiveAllowedOpenrouter : catalog.map((m) => m.value));
      return catalog.filter((model) => allow.has(model.value));
    }
    const allow = new Set(effectiveAllowedGemini.length > 0 ? effectiveAllowedGemini : [DEFAULT_GOOGLE_MODEL]);
    return catalogModels.filter((model) => allow.has(model.value));
  }, [
    llmPrimaryProvider,
    grokCatalogModels,
    openrouterCatalogModels,
    catalogModels,
    effectiveAllowedGemini,
    effectiveAllowedGrok,
    effectiveAllowedOpenrouter,
    googleModel,
  ]);
```

- [ ] **Step 8: Update `saveSettings` to include `allowedOpenrouterModels`**

Find:
```typescript
        ...(FEATURE_MULTI_PROVIDER_LLM
          ? {
              llm: {
                primary: { provider: llmPrimaryProvider, model: googleModel },
                fallback: llmFallback,
                allowedGrokModels,
              },
            }
          : {}),
```
Replace with:
```typescript
        ...(FEATURE_MULTI_PROVIDER_LLM
          ? {
              llm: {
                primary: { provider: llmPrimaryProvider, model: googleModel },
                fallback: llmFallback,
                allowedGrokModels,
                allowedOpenrouterModels,
              },
            }
          : {}),
```

- [ ] **Step 9: Update `hasUnsavedSettingsChanges` to track `allowedOpenrouterModels`**

Find:
```typescript
    if (FEATURE_MULTI_PROVIDER_LLM) {
      const ag = [...allowedGrokModels].sort();
      const bg = [...(c.llm?.allowedGrokModels || [])].sort();
      if (ag.length !== bg.length || ag.some((id, i) => id !== bg[i])) return true;
    }
```
Replace with:
```typescript
    if (FEATURE_MULTI_PROVIDER_LLM) {
      const ag = [...allowedGrokModels].sort();
      const bg = [...(c.llm?.allowedGrokModels || [])].sort();
      if (ag.length !== bg.length || ag.some((id, i) => id !== bg[i])) return true;
      const ao = [...allowedOpenrouterModels].sort();
      const bo = [...(c.llm?.allowedOpenrouterModels || [])].sort();
      if (ao.length !== bo.length || ao.some((id, i) => id !== bo[i])) return true;
    }
```

- [ ] **Step 10: Add OpenRouter values to the hook return object**

Find:
```typescript
    grokAdminCatalog: grokCatalogModels.length > 0 ? grokCatalogModels : normalizeGrokOptions([], googleModel),
```
After it, add (still in the return object):
```typescript
    openrouterAdminCatalog: openrouterCatalogModels.length > 0 ? openrouterCatalogModels : normalizeOpenrouterOptions([], googleModel),
    allowedOpenrouterModels,
    toggleAllowedOpenrouterModel,
    refreshOpenrouterModels,
```

- [ ] **Step 11: Run TypeScript dry-run**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0.

---

## Task 6: Update `DashboardSettingsDrawer.tsx` — props and UI

**Files:**
- Modify: `frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx`

- [ ] **Step 1: Add OpenRouter props to `DashboardSettingsDrawerProps`**

Find:
```typescript
  grokAdminCatalog?: GoogleModelOption[];
  allowedGrokModels?: string[];
  toggleAllowedGrokModel?: (modelId: string, enabled: boolean) => void;
  refreshGrokModels?: () => void;
  llmCatalog?: any[] | null;
```
Replace with:
```typescript
  grokAdminCatalog?: GoogleModelOption[];
  allowedGrokModels?: string[];
  toggleAllowedGrokModel?: (modelId: string, enabled: boolean) => void;
  refreshGrokModels?: () => void;
  openrouterAdminCatalog?: GoogleModelOption[];
  allowedOpenrouterModels?: string[];
  toggleAllowedOpenrouterModel?: (modelId: string, enabled: boolean) => void;
  refreshOpenrouterModels?: () => void;
  llmCatalog?: any[] | null;
```

- [ ] **Step 2: Destructure new props in the component function**

Find the destructured props list (the function signature with all the props). Add after `refreshGrokModels`:
```typescript
  openrouterAdminCatalog,
  allowedOpenrouterModels,
  toggleAllowedOpenrouterModel,
  refreshOpenrouterModels,
```

- [ ] **Step 3: Fix primary model catalog selection for OpenRouter**

Find (in the Primary model `<Select>` `itemToStringLabel`):
```typescript
                    itemToStringLabel={(v) => {
                      const cat = llmPrimaryProvider === 'grok' ? grokAdminCatalog! : adminModelCatalog;
                      return cat.find((m) => m.value === v)?.label ?? String(v ?? '');
                    }}
```
Replace with:
```typescript
                    itemToStringLabel={(v) => {
                      const cat = llmPrimaryProvider === 'grok' ? grokAdminCatalog! : llmPrimaryProvider === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog;
                      return cat.find((m) => m.value === v)?.label ?? String(v ?? '');
                    }}
```

Find (in the Primary model `<SelectContent>`):
```typescript
                      {(llmPrimaryProvider === 'grok' ? grokAdminCatalog! : adminModelCatalog).map((m) => (
```
Replace with:
```typescript
                      {(llmPrimaryProvider === 'grok' ? grokAdminCatalog! : llmPrimaryProvider === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog).map((m) => (
```

- [ ] **Step 4: Fix fallback catalog selection for OpenRouter**

Find (in the fallback provider `onValueChange`):
```typescript
                        const catalog = prov === 'grok' ? grokAdminCatalog! : adminModelCatalog;
```
Replace with:
```typescript
                        const catalog = prov === 'grok' ? grokAdminCatalog! : prov === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog;
```

Find (in the fallback model `itemToStringLabel`):
```typescript
                          const cat = llmFallback.provider === 'grok' ? grokAdminCatalog! : adminModelCatalog;
```
Replace with:
```typescript
                          const cat = llmFallback.provider === 'grok' ? grokAdminCatalog! : llmFallback.provider === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog;
```

Find (in the fallback model `<SelectContent>`):
```typescript
                          {(llmFallback.provider === 'grok' ? grokAdminCatalog! : adminModelCatalog).map((m) => (
```
Replace with:
```typescript
                          {(llmFallback.provider === 'grok' ? grokAdminCatalog! : llmFallback.provider === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog).map((m) => (
```

- [ ] **Step 5: Update the provider key status line to show OpenRouter**

Find:
```typescript
                  <span className="text-xs leading-snug text-muted">
                    Gemini: {session.config.llmProviderKeys?.gemini ? 'key present' : 'no key'} · Grok:{' '}
                    {session.config.llmProviderKeys?.grok ? 'key present' : 'no key'}
                  </span>
```
Replace with:
```typescript
                  <span className="text-xs leading-snug text-muted">
                    Gemini: {session.config.llmProviderKeys?.gemini ? 'key present' : 'no key'} · Grok:{' '}
                    {session.config.llmProviderKeys?.grok ? 'key present' : 'no key'} · OpenRouter:{' '}
                    {session.config.llmProviderKeys?.openrouter ? 'key present' : 'no key'}
                  </span>
```

- [ ] **Step 6: Add "Refresh OpenRouter models" button next to the Grok refresh button**

Find:
```typescript
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => refreshGrokModels!()}>
                    <RefreshCw className="mr-1.5 size-4" aria-hidden />
                    Refresh Grok models
                  </Button>
```
After it, add:
```typescript
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => refreshOpenrouterModels!()}>
                    <RefreshCw className="mr-1.5 size-4" aria-hidden />
                    Refresh OpenRouter models
                  </Button>
```

- [ ] **Step 7: Add "Allowed OpenRouter models" checkbox section**

Find the closing `</div>` and `{multiLlmReady ? (` that wraps the "Allowed Grok models" section:
```typescript
            {multiLlmReady ? (
              <div className="mt-6">
                <label className="mb-1 block text-sm font-semibold text-ink">Allowed Grok models</label>
```
After the entire Allowed Grok models `</div>` block (the one closing around `</div>\n            ) : null}`), add a new section:
```tsx
            {multiLlmReady ? (
              <div className="mt-6">
                <label className="mb-1 block text-sm font-semibold text-ink">Allowed OpenRouter models</label>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">Non-admins only see models you enable here when OpenRouter is primary.</p>
                <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-canvas px-3 py-2.5">
                  {(openrouterAdminCatalog ?? []).map((m) => {
                    const checked = (allowedOpenrouterModels ?? []).includes(m.value);
                    const soleChecked = checked && (allowedOpenrouterModels ?? []).length <= 1;
                    return (
                      <label
                        key={m.value}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink transition-colors hover:bg-violet-100/40',
                          soleChecked && 'cursor-default',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
                          checked={checked}
                          disabled={soleChecked}
                          onChange={(e) => toggleAllowedOpenrouterModel!(m.value, e.target.checked)}
                        />
                        <span className="min-w-0 leading-snug">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
```

- [ ] **Step 8: Run TypeScript dry-run**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0.

---

## Task 7: Pass OpenRouter props from Dashboard parent to Drawer

**Files:**
- Modify: `frontend/src/components/dashboard/index.tsx`

- [ ] **Step 1: Pass the new props to `DashboardSettingsDrawer`**

Find the section where `grokAdminCatalog` is passed (around line 698):
```typescript
            grokAdminCatalog: settingsHook.grokAdminCatalog,
```
After it, add:
```typescript
            openrouterAdminCatalog: settingsHook.openrouterAdminCatalog,
            allowedOpenrouterModels: settingsHook.allowedOpenrouterModels,
            toggleAllowedOpenrouterModel: settingsHook.toggleAllowedOpenrouterModel,
            refreshOpenrouterModels: settingsHook.refreshOpenrouterModels,
```

- [ ] **Step 2: Run TypeScript dry-run**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0.

---

## Task 8: Update `PostGenerateSettings.tsx` — tenant model picker

**Files:**
- Modify: `frontend/src/features/review/components/PostGenerateSettings.tsx`

- [ ] **Step 1: Add `openrouter` to `llmProviderKeys` type**

Find:
```typescript
  /** From session bootstrap; used to explain empty catalog vs. missing Worker secrets. */
  llmProviderKeys?: { gemini: boolean; grok: boolean };
```
Replace with:
```typescript
  /** From session bootstrap; used to explain empty catalog vs. missing Worker secrets. */
  llmProviderKeys?: { gemini: boolean; grok: boolean; openrouter: boolean };
```

- [ ] **Step 2: Fix the "no keys" hint to include OpenRouter**

Find:
```typescript
    const hasWorkerKeys = llmProviderKeys && (llmProviderKeys.gemini || llmProviderKeys.grok);
```
Replace with:
```typescript
    const hasWorkerKeys = llmProviderKeys && (llmProviderKeys.gemini || llmProviderKeys.grok || llmProviderKeys.openrouter);
```

- [ ] **Step 3: Run final TypeScript dry-run**

```bash
cd /Users/pratyushmishra/Documents/GitHub/LinkedInPost && python3 setup.py
```
Expected: exits 0, no tsc errors across worker/ and frontend/.
