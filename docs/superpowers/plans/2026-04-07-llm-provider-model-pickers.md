# LLM Provider & Model Picker Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `LlmProviderSelect` and `LlmModelCombobox` reusable components and replace all ad-hoc provider/model selects across the UI with them.

**Architecture:** Two focused components in `frontend/src/components/llm/`. `LlmProviderSelect` renders horizontal pill-toggle buttons. `LlmModelCombobox` is a Popover-based searchable combobox that sorts models A-Z internally and filters by typing. All four call sites (`DashboardSettingsDrawer`, `PostGenerateSettings`, `ContentReviewSettings`, `TopicsRightRail`) are migrated to use them.

**Tech Stack:** React + TypeScript, `@base-ui/react/popover`, Tailwind CSS, glassmorphism violet theme.

---

## File Map

**Create:**
- `frontend/src/components/llm/LlmProviderSelect.tsx` — pill-toggle provider buttons
- `frontend/src/components/llm/LlmModelCombobox.tsx` — searchable, sorted popover model picker
- `frontend/src/components/llm/index.ts` — re-exports

**Modify:**
- `frontend/src/features/review/components/PostGenerateSettings.tsx` — replace `<button>` group + `<select>` with new components
- `frontend/src/features/content-review/ContentReviewSettings.tsx` — replace 4 `<Select>` uses with new components
- `frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx` — replace `EnrichmentLlmSettings`, `LlmPerFeatureSettings`, primary, and fallback selects

**Modify (model picker only):**
- `frontend/src/components/dashboard/components/TopicsRightRail.tsx` — replace `<Select>` for AI model with `LlmModelCombobox`

---

## Task 1: Create `LlmProviderSelect`

**Files:**
- Create: `frontend/src/components/llm/LlmProviderSelect.tsx`

- [ ] **Step 1: Write the component**

```typescript
// frontend/src/components/llm/LlmProviderSelect.tsx
import { cn } from '@/lib/cn';
import type { LlmProviderId } from '@repo/llm-core';

interface LlmProviderSelectProps {
  /** Only the providers to show (filtered to configured ones by caller). */
  providers: Array<{ id: LlmProviderId; name: string }>;
  value: LlmProviderId;
  onChange: (provider: LlmProviderId) => void;
  disabled?: boolean;
  /** 'sm' renders smaller buttons for compact rows. Default: 'default'. */
  size?: 'sm' | 'default';
  className?: string;
}

export function LlmProviderSelect({
  providers,
  value,
  onChange,
  disabled,
  size = 'default',
  className,
}: LlmProviderSelectProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p.id)}
          className={cn(
            'rounded-xl font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === p.id
              ? 'bg-primary text-white'
              : 'border border-border bg-white/80 text-ink hover:bg-violet-100/40',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /path/to/repo/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: no errors in `LlmProviderSelect.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/llm/LlmProviderSelect.tsx
git commit -m "feat: add LlmProviderSelect pill-toggle component"
```

---

## Task 2: Create `LlmModelCombobox`

**Files:**
- Create: `frontend/src/components/llm/LlmModelCombobox.tsx`

- [ ] **Step 1: Write the component**

```typescript
// frontend/src/components/llm/LlmModelCombobox.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/lib/cn';

interface ModelOption {
  value: string;
  label: string;
}

interface LlmModelComboboxProps {
  /** Models for the currently-selected provider. Component sorts A-Z internally. */
  models: ModelOption[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** 'sm' renders a compact trigger (h-8, text-xs). Default: 'default'. */
  size?: 'sm' | 'default';
  className?: string;
  /**
   * Items always shown at the top of the list, before sorted models.
   * Not included in sort. Still matched by search query.
   */
  prependOptions?: ModelOption[];
}

export function LlmModelCombobox({
  models,
  value,
  onChange,
  disabled,
  placeholder = 'Select model',
  size = 'default',
  className,
  prependOptions = [],
}: LlmModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => [...models].sort((a, b) => a.label.localeCompare(b.label)),
    [models],
  );

  const filteredPrepend = useMemo(
    () =>
      query.trim()
        ? prependOptions.filter(
            (m) =>
              m.label.toLowerCase().includes(query.toLowerCase()) ||
              m.value.toLowerCase().includes(query.toLowerCase()),
          )
        : prependOptions,
    [prependOptions, query],
  );

  const filteredSorted = useMemo(
    () =>
      sorted.filter(
        (m) =>
          m.label.toLowerCase().includes(query.toLowerCase()) ||
          m.value.toLowerCase().includes(query.toLowerCase()),
      ),
    [sorted, query],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      // Focus search input after popover animation
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [open]);

  const allOptions = [...prependOptions, ...models];
  const selectedLabel = allOptions.find((m) => m.value === value)?.label ?? value;

  const hasResults = filteredPrepend.length + filteredSorted.length > 0;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        disabled={disabled}
        className={cn(
          'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-violet-200/55 bg-white/90 px-3.5 text-left font-semibold text-ink shadow-sm outline-none backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-200 select-none',
          'hover:border-primary/40 hover:bg-white hover:shadow-md',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm'
            ? 'min-h-8 rounded-lg px-2.5 py-1.5 text-xs'
            : 'min-h-9 py-2 text-sm',
          !value && 'font-normal text-muted',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel || placeholder}</span>
        <ChevronDown className="pointer-events-none size-4 shrink-0 text-ink/45" />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={4}
          className="isolate z-50 w-[var(--anchor-width)] min-w-48 max-w-[min(100vw-1.5rem,36rem)]"
        >
          <PopoverPrimitive.Popup className="flex flex-col overflow-hidden rounded-xl border border-violet-200/50 bg-white/95 shadow-lift backdrop-blur-xl">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models…"
              className="border-b border-border bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:font-normal placeholder:text-muted"
            />
            <div className="max-h-64 overflow-y-auto p-1">
              {!hasResults ? (
                <p className="px-3 py-2 text-xs text-muted">No models match</p>
              ) : (
                <>
                  {filteredPrepend.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        onChange(m.value);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-violet-100/70',
                        m.value === value && 'bg-violet-100/50 font-semibold',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                  {filteredSorted.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        onChange(m.value);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-violet-100/70',
                        m.value === value && 'bg-violet-100/50 font-semibold',
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: no errors in `LlmModelCombobox.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/llm/LlmModelCombobox.tsx
git commit -m "feat: add LlmModelCombobox searchable popover component"
```

---

## Task 3: Create `frontend/src/components/llm/index.ts`

**Files:**
- Create: `frontend/src/components/llm/index.ts`

- [ ] **Step 1: Write the barrel export**

```typescript
// frontend/src/components/llm/index.ts
export { LlmProviderSelect } from './LlmProviderSelect';
export { LlmModelCombobox } from './LlmModelCombobox';
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/llm/index.ts
git commit -m "feat: add llm components barrel export"
```

---

## Task 4: Update `PostGenerateSettings.tsx`

**Files:**
- Modify: `frontend/src/features/review/components/PostGenerateSettings.tsx`

Current: plain `<button>` group (blue theme) + native `<select>`
Replace with: `LlmProviderSelect` + `LlmModelCombobox`

- [ ] **Step 1: Replace provider buttons and model select**

Replace the entire return JSX from line 136 onwards (the non-loading, non-empty branch). Change only the provider button group and model select sections; leave the debug info box and loading/empty branches unchanged.

Full updated file:
```typescript
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { LlmProviderId, LlmModelOption } from '@repo/llm-core';
import { LlmProviderSelect } from '@/components/llm/LlmProviderSelect';
import { LlmModelCombobox } from '@/components/llm/LlmModelCombobox';

interface CatalogProvider {
  id: LlmProviderId;
  name: string;
  models: LlmModelOption[];
}

interface GenerationSettings {
  provider: LlmProviderId;
  model: string;
}

interface PostGenerateSettingsProps {
  value?: GenerationSettings;
  onSettingsChange?: (settings: GenerationSettings) => void;
  disabled?: boolean;
  className?: string;
  llmCatalog?: any[] | null;
  llmProviderKeys?: { gemini: boolean; grok: boolean; openrouter: boolean };
}

export function PostGenerateSettings({
  value,
  onSettingsChange,
  disabled = false,
  className,
  llmCatalog,
  llmProviderKeys,
}: PostGenerateSettingsProps) {
  const [internalSettings, setInternalSettings] = useState<GenerationSettings>({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });

  const settings = value ?? internalSettings;
  const isControlledRef = useRef(value !== undefined);
  isControlledRef.current = value !== undefined;

  const providers: CatalogProvider[] = useMemo(() => {
    if (llmCatalog == null) return [];
    if (llmCatalog.length === 0) return [];
    return llmCatalog as CatalogProvider[];
  }, [llmCatalog]);

  useEffect(() => {
    if (
      !isControlledRef.current &&
      providers.length > 0 &&
      internalSettings.provider === 'gemini' &&
      internalSettings.model === 'gemini-2.5-flash'
    ) {
      const firstProvider = providers[0];
      if (firstProvider.models && firstProvider.models.length > 0) {
        setInternalSettings({
          provider: firstProvider.id,
          model: firstProvider.models[0].value,
        });
      }
    }
  }, [providers]);

  const currentProvider = providers.find((p) => p.id === settings.provider);
  const catalogModels = currentProvider?.models || [];
  const modelOptions = useMemo(() => {
    if (settings.model && !catalogModels.some((m) => m.value === settings.model)) {
      return [{ value: settings.model, label: settings.model }, ...catalogModels];
    }
    return catalogModels;
  }, [catalogModels, settings.model]);

  const handleProviderChange = (provider: LlmProviderId) => {
    if (disabled) return;
    const newProvider = providers.find((p) => p.id === provider);
    const firstModel = newProvider?.models?.[0]?.value || '';
    const newSettings: GenerationSettings = { provider, model: firstModel };
    if (value === undefined) setInternalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleModelChange = (model: string) => {
    if (disabled) return;
    const newSettings = { ...settings, model };
    if (value === undefined) setInternalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  if (llmCatalog === null) {
    return (
      <div className={clsx('p-4 bg-gray-50 rounded-lg', className)}>
        <p className="text-sm text-gray-600">Loading LLM providers…</p>
      </div>
    );
  }

  if (providers.length === 0) {
    const hasWorkerKeys =
      llmProviderKeys &&
      (llmProviderKeys.gemini || llmProviderKeys.grok || llmProviderKeys.openrouter);
    return (
      <div className={clsx('space-y-2 p-4 bg-gray-50 rounded-lg border border-gray-200', className)}>
        <p className="text-sm font-medium text-gray-800">No LLM providers available</p>
        {hasWorkerKeys ? (
          <p className="text-xs leading-relaxed text-gray-600">
            The Worker reports API keys, but the model catalog did not load. Try refreshing the
            page. If it keeps happening, check the browser network tab for{' '}
            <span className="font-mono">getLlmProviderCatalog</span> errors.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-gray-600">
            The Cloudflare Worker only lists providers that have credentials. Set{' '}
            <span className="font-mono">GEMINI_API_KEY</span> and/or{' '}
            <span className="font-mono">XAI_API_KEY</span> in the Worker environment (Wrangler
            secrets or the dashboard), redeploy, then refresh this app. The status line under
            Settings → AI / LLM shows whether each key is present.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200', className)}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">LLM Provider</label>
        <LlmProviderSelect
          providers={providers.map((p) => ({ id: p.id, name: p.name }))}
          value={settings.provider}
          onChange={handleProviderChange}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
        <LlmModelCombobox
          models={modelOptions}
          value={settings.model}
          onChange={handleModelChange}
          disabled={disabled}
          placeholder="Select model"
        />
      </div>

      <div className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200">
        <p className="font-medium mb-1">Selected Configuration:</p>
        <p>
          Provider: <span className="font-mono">{settings.provider}</span>
        </p>
        <p>
          Model: <span className="font-mono">{settings.model}</span>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep PostGenerateSettings`
Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/review/components/PostGenerateSettings.tsx
git commit -m "feat: use LlmProviderSelect + LlmModelCombobox in PostGenerateSettings"
```

---

## Task 5: Update `ContentReviewSettings.tsx`

**Files:**
- Modify: `frontend/src/features/content-review/ContentReviewSettings.tsx`

Current: 4 `<Select>` calls (text provider, text model, vision provider, vision model) from base-ui.
Replace: `LlmProviderSelect` (for providers) + `LlmModelCombobox` (for models).

- [ ] **Step 1: Rewrite the file**

```typescript
// frontend/src/features/content-review/ContentReviewSettings.tsx
import { useMemo } from 'react';
import { LLM_PROVIDER_IDS, getProviderLabel } from '@repo/llm-core';
import type { LlmProviderId, LlmModelOption } from '@repo/llm-core';
import type { ContentReviewNewsMode, ContentReviewStored } from '../../services/configService';
import { LlmProviderSelect } from '@/components/llm/LlmProviderSelect';
import { LlmModelCombobox } from '@/components/llm/LlmModelCombobox';

interface ContentReviewSettingsProps {
  value: ContentReviewStored;
  onChange: (next: ContentReviewStored) => void;
  newsResearchEnabled: boolean;
  llmCatalog?: any[] | null;
}

function modelsForProvider(provider: LlmProviderId, catalog?: any[] | null): LlmModelOption[] {
  if (!catalog || catalog.length === 0) return [];
  const providerData = catalog.find((p: any) => p.id === provider);
  return providerData?.models ?? [];
}

function ensureModelInList(
  models: LlmModelOption[],
  modelId: string,
  provider: LlmProviderId,
): LlmModelOption[] {
  if (modelId && !models.some((m) => m.value === modelId)) {
    return [{ value: modelId, label: modelId, provider }, ...models];
  }
  return models;
}

const ALL_PROVIDERS = LLM_PROVIDER_IDS.map((id) => ({
  id,
  name: getProviderLabel(id),
}));

export function ContentReviewSettings({
  value,
  onChange,
  newsResearchEnabled,
  llmCatalog,
}: ContentReviewSettingsProps) {
  const textProvider: LlmProviderId = value.textRef.provider;
  const textModel: string = value.textRef.model;
  const visionProvider: LlmProviderId = value.visionRef.provider;
  const visionModel: string = value.visionRef.model;

  const textModels = useMemo(
    () => ensureModelInList(modelsForProvider(textProvider, llmCatalog), textModel, textProvider),
    [textProvider, textModel, llmCatalog],
  );

  const visionModels = useMemo(
    () =>
      ensureModelInList(modelsForProvider(visionProvider, llmCatalog), visionModel, visionProvider),
    [visionProvider, visionModel, llmCatalog],
  );

  const handleTextProviderChange = (provider: LlmProviderId) => {
    const models = modelsForProvider(provider, llmCatalog);
    const firstModel = models[0]?.value ?? '';
    onChange({ ...value, textRef: { provider, model: firstModel } });
  };

  const handleVisionProviderChange = (provider: LlmProviderId) => {
    const models = modelsForProvider(provider, llmCatalog);
    const firstModel = models[0]?.value ?? '';
    onChange({ ...value, visionRef: { provider, model: firstModel } });
  };

  const setNewsMode = (newsMode: ContentReviewNewsMode) => {
    onChange({ ...value, newsMode });
  };

  return (
    <section className="mt-0 space-y-4 border-t border-violet-200/50 pt-6">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">Text Review</h3>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Provider
          <div className="mt-0.5">
            <LlmProviderSelect
              providers={ALL_PROVIDERS}
              value={textProvider}
              onChange={handleTextProviderChange}
              size="sm"
            />
          </div>
        </label>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Model
          <div className="mt-0.5">
            <LlmModelCombobox
              models={textModels}
              value={textModel}
              onChange={(model) => onChange({ ...value, textRef: { provider: textProvider, model } })}
              size="sm"
            />
          </div>
        </label>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">Vision Review</h3>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Provider
          <div className="mt-0.5">
            <LlmProviderSelect
              providers={ALL_PROVIDERS}
              value={visionProvider}
              onChange={handleVisionProviderChange}
              size="sm"
            />
          </div>
        </label>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Model
          <div className="mt-0.5">
            <LlmModelCombobox
              models={visionModels}
              value={visionModel}
              onChange={(model) =>
                onChange({ ...value, visionRef: { provider: visionProvider, model } })
              }
              size="sm"
            />
          </div>
        </label>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">News mode</h3>
        <p className="text-[0.65rem] text-muted">
          Choose how news context is sourced during content review.
        </p>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="radio"
              name="content-review-news-mode"
              value="existing"
              checked={value.newsMode === 'existing'}
              onChange={() => setNewsMode('existing')}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-ink">Existing</span>
              <span className="ml-1 text-muted">— use already-fetched news from the research panel</span>
            </span>
          </label>

          <label
            className={`flex items-start gap-2 text-xs ${newsResearchEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          >
            <input
              type="radio"
              name="content-review-news-mode"
              value="fresh"
              checked={value.newsMode === 'fresh'}
              onChange={() => {
                if (newsResearchEnabled) setNewsMode('fresh');
              }}
              disabled={!newsResearchEnabled}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-ink">Fresh</span>
              <span className="ml-1 text-muted">— fetch new articles at review time</span>
              {!newsResearchEnabled ? (
                <span className="ml-1 text-amber-700">
                  (enable News research in Settings → News)
                </span>
              ) : null}
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep ContentReview`
Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/content-review/ContentReviewSettings.tsx
git commit -m "feat: use LlmProviderSelect + LlmModelCombobox in ContentReviewSettings"
```

---

## Task 6: Update `EnrichmentLlmSettings` in `DashboardSettingsDrawer.tsx`

**Files:**
- Modify: `frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx`

Current: `EnrichmentLlmSettings` takes `adminModelCatalog` + `grokAdminCatalog` and uses `Select` components. Catalog switch only handles `grok` vs `gemini`, missing `openrouter`.
Replace: add `openrouterAdminCatalog` prop, use `LlmProviderSelect` + `LlmModelCombobox`.

- [ ] **Step 1: Add imports at the top of DashboardSettingsDrawer.tsx**

Find the existing import for `Select` components:
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

Add after it:
```typescript
import { LlmProviderSelect, LlmModelCombobox } from '@/components/llm';
```

- [ ] **Step 2: Update `EnrichmentLlmSettings` props and body**

Find and replace the entire `EnrichmentLlmSettings` function (lines 187–305):

```typescript
function EnrichmentLlmSettings({
  session,
  backendApi,
  idToken,
  adminModelCatalog,
  grokAdminCatalog,
  openrouterAdminCatalog,
}: {
  session: import('../../../services/backendApi').AppSession;
  backendApi: import('../../../services/backendApi').BackendApi;
  idToken: string;
  adminModelCatalog: GoogleModelOption[];
  grokAdminCatalog: GoogleModelOption[];
  openrouterAdminCatalog: GoogleModelOption[];
}) {
  const [drafts, setDrafts] = useState<Record<string, { provider: string; model: string }>>(() => {
    const base: Record<string, { provider: string; model: string }> = {};
    for (const key of ENRICHMENT_SETTING_KEYS) {
      const saved = session.config.llmSettings?.[key];
      base[key] = saved
        ? { provider: saved.provider, model: saved.model }
        : { provider: 'gemini', model: adminModelCatalog[0]?.value ?? '' };
    }
    return base;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string | null>>(() => {
    const base: Record<string, string | null> = {};
    for (const key of ENRICHMENT_SETTING_KEYS) base[key] = null;
    return base;
  });

  const handleSave = async (key: LlmSettingKey) => {
    setSaving(key);
    setFeedback((prev) => ({ ...prev, [key]: null }));
    try {
      await backendApi.saveLlmSetting(idToken, key, drafts[key]);
      setFeedback((prev) => ({ ...prev, [key]: 'Saved.' }));
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : 'Failed to save.',
      }));
    } finally {
      setSaving(null);
    }
  };

  const catalogFor = (provider: string): GoogleModelOption[] => {
    if (provider === 'grok') return grokAdminCatalog;
    if (provider === 'openrouter') return openrouterAdminCatalog;
    return adminModelCatalog;
  };

  return (
    <div className="space-y-3">
      {ENRICHMENT_SETTING_KEYS.map((key) => {
        const draft = drafts[key];
        const catalog = catalogFor(draft.provider);
        return (
          <div key={key} className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="mb-2 text-sm font-medium text-ink">{LLM_SETTING_KEY_LABELS[key]}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <LlmProviderSelect
                providers={LLM_PROVIDER_IDS.map((p) => ({ id: p, name: getProviderLabel(p) }))}
                value={draft.provider as LlmProviderId}
                onChange={(newProvider) => {
                  const newCatalog = catalogFor(newProvider);
                  setDrafts((prev) => ({
                    ...prev,
                    [key]: { provider: newProvider, model: newCatalog[0]?.value ?? prev[key].model },
                  }));
                }}
                size="sm"
                className="sm:max-w-[10rem]"
              />
              <LlmModelCombobox
                models={catalog}
                value={draft.model}
                onChange={(model) =>
                  setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], model } }))
                }
                size="sm"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl"
                disabled={saving === key}
                onClick={() => handleSave(key)}
              >
                {saving === key ? 'Saving...' : 'Save'}
              </Button>
            </div>
            {feedback[key] ? (
              <p className={cn('mt-1.5 text-xs', feedback[key] === 'Saved.' ? 'text-green-600' : 'text-red-500')}>
                {feedback[key]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Update the call site of `EnrichmentLlmSettings` to pass `openrouterAdminCatalog`**

Search for `<EnrichmentLlmSettings` in the file. Add the new prop:
```typescript
// Before:
<EnrichmentLlmSettings
  session={session}
  backendApi={backendApi}
  idToken={idToken}
  adminModelCatalog={adminModelCatalog}
  grokAdminCatalog={grokAdminCatalog!}
/>

// After:
<EnrichmentLlmSettings
  session={session}
  backendApi={backendApi}
  idToken={idToken}
  adminModelCatalog={adminModelCatalog}
  grokAdminCatalog={grokAdminCatalog!}
  openrouterAdminCatalog={openrouterAdminCatalog ?? []}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -i enrichment`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx
git commit -m "feat: use LlmProviderSelect + LlmModelCombobox in EnrichmentLlmSettings, add openrouter catalog"
```

---

## Task 7: Update `LlmPerFeatureSettings` in `DashboardSettingsDrawer.tsx`

**Files:**
- Modify: `frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx`

Current: `LlmPerFeatureSettings` same pattern as `EnrichmentLlmSettings` — missing `openrouter`.
Replace: add `openrouterAdminCatalog` prop, use `LlmProviderSelect` + `LlmModelCombobox`.

- [ ] **Step 1: Update `LlmPerFeatureSettings` function (lines 307–426)**

```typescript
function LlmPerFeatureSettings({
  session,
  backendApi,
  idToken,
  adminModelCatalog,
  grokAdminCatalog,
  openrouterAdminCatalog,
}: {
  session: import('../../../services/backendApi').AppSession;
  backendApi: import('../../../services/backendApi').BackendApi;
  idToken: string;
  adminModelCatalog: GoogleModelOption[];
  grokAdminCatalog: GoogleModelOption[];
  openrouterAdminCatalog: GoogleModelOption[];
}) {
  const [drafts, setDrafts] = useState<Record<LlmSettingKey, { provider: string; model: string }>>(() => {
    const base: Partial<Record<LlmSettingKey, { provider: string; model: string }>> = {};
    for (const key of LLM_SETTING_KEYS) {
      const saved = session.config.llmSettings?.[key];
      base[key] = saved
        ? { provider: saved.provider, model: saved.model }
        : { provider: 'gemini', model: adminModelCatalog[0]?.value ?? '' };
    }
    return base as Record<LlmSettingKey, { provider: string; model: string }>;
  });
  const [saving, setSaving] = useState<LlmSettingKey | null>(null);
  const [feedback, setFeedback] = useState<Record<LlmSettingKey, string | null>>(
    () =>
      Object.fromEntries(
        Object.keys(LLM_SETTING_KEY_LABELS).map((k) => [k, null]),
      ) as Record<LlmSettingKey, string | null>,
  );

  const handleSave = async (key: LlmSettingKey) => {
    setSaving(key);
    setFeedback((prev) => ({ ...prev, [key]: null }));
    try {
      await backendApi.saveLlmSetting(idToken, key, drafts[key]);
      setFeedback((prev) => ({ ...prev, [key]: 'Saved.' }));
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [key]: err instanceof Error ? err.message : 'Failed to save.',
      }));
    } finally {
      setSaving(null);
    }
  };

  const catalogFor = (provider: string): GoogleModelOption[] => {
    if (provider === 'grok') return grokAdminCatalog;
    if (provider === 'openrouter') return openrouterAdminCatalog;
    return adminModelCatalog;
  };

  return (
    <div className="mt-6 space-y-4">
      <div>
        <p className="mb-1 text-sm font-semibold text-ink">Model per feature</p>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Override the LLM used for each backend feature. Changes take effect on the next request
          for that feature.
        </p>
      </div>
      {LLM_SETTING_KEYS.map((key) => {
        const draft = drafts[key];
        const catalog = catalogFor(draft.provider);
        return (
          <div key={key} className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="mb-2 text-sm font-medium text-ink">{LLM_SETTING_KEY_LABELS[key]}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <LlmProviderSelect
                providers={LLM_PROVIDER_IDS.map((p) => ({ id: p, name: getProviderLabel(p) }))}
                value={draft.provider as LlmProviderId}
                onChange={(newProvider) => {
                  const newCatalog = catalogFor(newProvider);
                  setDrafts((prev) => ({
                    ...prev,
                    [key]: {
                      provider: newProvider,
                      model: newCatalog[0]?.value ?? prev[key].model,
                    },
                  }));
                }}
                size="sm"
                className="sm:max-w-[10rem]"
              />
              <LlmModelCombobox
                models={catalog}
                value={draft.model}
                onChange={(model) =>
                  setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], model } }))
                }
                size="sm"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl"
                disabled={saving === key}
                onClick={() => void handleSave(key)}
              >
                {saving === key ? 'Saving…' : 'Save'}
              </Button>
            </div>
            {feedback[key] ? (
              <p
                className={`mt-1.5 text-xs ${feedback[key] === 'Saved.' ? 'text-green-600' : 'text-rose-600'}`}
              >
                {feedback[key]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Update the call site of `LlmPerFeatureSettings`**

Search for `<LlmPerFeatureSettings` in the file. Add `openrouterAdminCatalog`:
```typescript
// Before:
<LlmPerFeatureSettings
  session={session}
  backendApi={backendApi}
  idToken={idToken}
  adminModelCatalog={adminModelCatalog}
  grokAdminCatalog={grokAdminCatalog!}
/>

// After:
<LlmPerFeatureSettings
  session={session}
  backendApi={backendApi}
  idToken={idToken}
  adminModelCatalog={adminModelCatalog}
  grokAdminCatalog={grokAdminCatalog!}
  openrouterAdminCatalog={openrouterAdminCatalog ?? []}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -i "PerFeature\|LlmPer"`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx
git commit -m "feat: use LlmProviderSelect + LlmModelCombobox in LlmPerFeatureSettings, add openrouter catalog"
```

---

## Task 8: Update primary/fallback model selects in `DashboardSettingsDrawer.tsx`

**Files:**
- Modify: `frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx`
  - Lines ~716–732: primary provider `Select` → `LlmProviderSelect`
  - Lines ~735–754: primary model `Select` → `LlmModelCombobox`
  - Lines ~762–790: fallback provider `Select` → keep as `Select` (has "None" option — not a pure provider list)
  - Lines ~791–811: fallback model `Select` → `LlmModelCombobox`

Note: The fallback *provider* selector keeps the existing `Select` because it has a special "None" sentinel option. Only the two model selects and the primary provider select are replaced.

- [ ] **Step 1: Replace primary provider `Select` (lines ~716–732)**

Find:
```typescript
<label className="mb-1 block text-sm font-semibold text-ink">Primary provider</label>
<Select
  value={llmPrimaryProvider!}
  onValueChange={(v) => setLlmPrimaryProvider!(v as LlmProviderId)}
  itemToStringLabel={(v) =>
    getProviderLabel(v as LlmProviderId) || String(v ?? '')
  }
>
  <SelectTrigger className="h-auto min-h-10 w-full max-w-xs rounded-xl py-2.5 font-medium">
    <SelectValue placeholder="Select provider" />
  </SelectTrigger>
  <SelectContent className="max-w-[min(100vw-1.5rem,24rem)]">
    {LLM_PROVIDER_IDS.map((p) => (
      <SelectItem key={p} value={p}>{getProviderLabel(p)}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Replace with:
```typescript
<label className="mb-1 block text-sm font-semibold text-ink">Primary provider</label>
<LlmProviderSelect
  providers={LLM_PROVIDER_IDS.map((p) => ({ id: p, name: getProviderLabel(p) }))}
  value={llmPrimaryProvider!}
  onChange={(v) => setLlmPrimaryProvider!(v)}
  className="max-w-xs"
/>
```

- [ ] **Step 2: Replace primary model `Select` (lines ~735–754)**

Find:
```typescript
<label className="mb-1 block text-sm font-semibold text-ink">Primary model</label>
<Select
  value={llmModelId!}
  onValueChange={(v) => setLlmModelId!(v as string)}
  itemToStringLabel={(v) => {
    const cat = llmPrimaryProvider === 'grok' ? grokAdminCatalog! : llmPrimaryProvider === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog;
    return cat.find((m) => m.value === v)?.label ?? String(v ?? '');
  }}
>
  <SelectTrigger className="h-auto min-h-10 w-full rounded-xl py-2.5 font-medium">
    <SelectValue placeholder="Select model" />
  </SelectTrigger>
  <SelectContent className="max-w-[min(100vw-1.5rem,36rem)]">
    {(llmPrimaryProvider === 'grok' ? grokAdminCatalog! : llmPrimaryProvider === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog).map((m) => (
      <SelectItem key={m.value} value={m.value} className="items-start py-2.5">
        <span className="whitespace-normal leading-snug">{m.label}</span>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Replace with:
```typescript
<label className="mb-1 block text-sm font-semibold text-ink">Primary model</label>
<LlmModelCombobox
  models={
    llmPrimaryProvider === 'grok'
      ? grokAdminCatalog!
      : llmPrimaryProvider === 'openrouter'
        ? openrouterAdminCatalog!
        : adminModelCatalog
  }
  value={llmModelId!}
  onChange={(v) => setLlmModelId!(v)}
/>
```

- [ ] **Step 3: Replace fallback model `Select` (lines ~791–811)**

Find:
```typescript
{llmFallback ? (
  <Select
    value={llmFallback.model}
    onValueChange={(v) => setLlmFallback!({ ...llmFallback, model: v ?? llmFallback.model })}
    itemToStringLabel={(v) => {
      const cat = llmFallback.provider === 'grok' ? grokAdminCatalog! : llmFallback.provider === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog;
      return cat.find((m) => m.value === v)?.label ?? String(v ?? '');
    }}
  >
    <SelectTrigger className="h-auto min-h-10 min-w-0 w-full flex-1 rounded-xl py-2.5 font-medium">
      <SelectValue placeholder="Model" />
    </SelectTrigger>
    <SelectContent className="max-w-[min(100vw-1.5rem,36rem)]">
      {(llmFallback.provider === 'grok' ? grokAdminCatalog! : llmFallback.provider === 'openrouter' ? openrouterAdminCatalog! : adminModelCatalog).map((m) => (
        <SelectItem key={m.value} value={m.value} className="items-start py-2.5">
          <span className="whitespace-normal leading-snug">{m.label}</span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
) : null}
```

Replace with:
```typescript
{llmFallback ? (
  <LlmModelCombobox
    models={
      llmFallback.provider === 'grok'
        ? grokAdminCatalog!
        : llmFallback.provider === 'openrouter'
          ? openrouterAdminCatalog!
          : adminModelCatalog
    }
    value={llmFallback.model}
    onChange={(v) => setLlmFallback!({ ...llmFallback, model: v })}
    className="flex-1"
  />
) : null}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx
git commit -m "feat: use LlmProviderSelect + LlmModelCombobox in DashboardSettingsDrawer primary/fallback"
```

---

## Task 9: Update `TopicsRightRail.tsx`

**Files:**
- Modify: `frontend/src/components/dashboard/components/TopicsRightRail.tsx`

Current: `Select` with workspace-default sentinel + JSON-wrapped model values.
Replace: `LlmModelCombobox` with `prependOptions` for workspace-default.

The value encoding changes slightly: instead of the `Select` receiving JSON-wrapped values, the combobox receives a plain model ID. The JSON-wrapping is done in the `onChange` handler.

- [ ] **Step 1: Add import and compute plain model ID value**

Add import at top of file (after existing imports):
```typescript
import { LlmModelCombobox } from '@/components/llm/LlmModelCombobox';
```

- [ ] **Step 2: Add `modelIdValue` memo (replaces the existing JSON-based `modelSelectValue` for the combobox)**

After the existing `modelSelectValue` memo (keep it for backward-compat or replace it), add:

```typescript
// Plain model-ID value for LlmModelCombobox (workspace-default uses sentinel string).
const modelIdValue = useMemo(() => {
  if (!selectedRow) return WORKSPACE_DEFAULT_MODEL;
  const raw = String(selectedRow.topicGenerationModel || '').trim();
  if (!raw) return WORKSPACE_DEFAULT_MODEL;
  if (FEATURE_MULTI_PROVIDER_LLM && raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw) as { model?: string };
      const m = String(o.model || '').trim();
      if (m) return m;
    } catch {
      /* fall through */
    }
  }
  return raw;
}, [selectedRow]);
```

- [ ] **Step 3: Replace the `Select` for AI model with `LlmModelCombobox`**

Find the `{/* AI model */}` block that wraps the `Select` (approximately lines 239–310). Replace:

```typescript
{!modelPickerLocked ? (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted">AI model</span>
      <button
        type="button"
        className="rounded p-0.5 text-muted transition-colors hover:bg-violet-100/60 hover:text-ink"
        aria-label={aiModelInfoTooltip}
        title={aiModelInfoTooltip}
      >
        <Info className="h-3 w-3" strokeWidth={2} aria-hidden />
      </button>
    </div>
    <LlmModelCombobox
      models={availableModels}
      value={modelIdValue}
      disabled={saving}
      size="sm"
      prependOptions={[
        { value: WORKSPACE_DEFAULT_MODEL, label: workspaceDefaultModelCaption },
      ]}
      onChange={(val) => {
        if (!selectedRow) return;
        if (val === WORKSPACE_DEFAULT_MODEL) {
          void persist(selectedRow, { topicGenerationModel: '' });
          return;
        }
        if (FEATURE_MULTI_PROVIDER_LLM) {
          const payload = JSON.stringify({ provider: workspaceLlm.provider, model: val });
          scheduleModelSave(selectedRow, payload);
          return;
        }
        scheduleModelSave(selectedRow, val);
      }}
    />
  </div>
) : (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] text-muted">AI model</span>
    <p className="text-[11px] text-muted">One model workspace.</p>
  </div>
)}
```

- [ ] **Step 4: Remove the unused `modelSelectValue` memo if nothing else references it**

Search the file for `modelSelectValue`. If it's only used in the Select block you just replaced, delete the entire `const modelSelectValue = useMemo(...)` block.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | grep -i "TopicsRight\|RightRail"`
Expected: no output

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/dashboard/components/TopicsRightRail.tsx
git commit -m "feat: use LlmModelCombobox in TopicsRightRail with workspace-default prepended"
```

---

## Final verification

- [ ] **Full TypeScript build passes**

Run: `cd frontend && npx tsc --noEmit 2>&1`
Expected: 0 errors

- [ ] **Vite build passes**

Run: `cd frontend && npx vite build 2>&1 | tail -20`
Expected: build succeeds, no errors

- [ ] **Commit if any cleanup needed**

```bash
git add -p
git commit -m "chore: cleanup after llm picker component rollout"
```
