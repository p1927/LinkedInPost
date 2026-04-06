# LLM Provider & Model Picker Components — Design Spec

**Date:** 2026-04-07

**Goal:** Replace every ad-hoc provider/model select in the UI with two reusable components — `LlmProviderSelect` (button-group) and `LlmModelCombobox` (searchable, alphabetically-sorted popover picker) — and use them in all four locations where provider/model selection exists.

---

## Problem

1. **Model list doesn't adapt when provider changes** — in several places the model dropdown keeps stale items after a provider switch.
2. **No search** — OpenRouter exposes 200+ models; a flat scrollable list is unusable.
3. **No alphabetical order** — models arrive in catalog order (arbitrary).
4. **Inconsistent UX** — four different locations use different markup (shadcn Select, native `<select>`, custom buttons), making behavior and styling diverge.

---

## Solution

Two focused components, used everywhere:

### `LlmProviderSelect`
A horizontal row of pill-toggle buttons. Only shows the providers passed in. Active state uses `bg-primary text-white`; inactive uses `border border-border text-ink`. No search needed — maximum 3 providers.

### `LlmModelCombobox`
A Popover-based combobox. Trigger looks like a `SelectTrigger`. On open: a search `Input` at the top filters the list in real-time; below it a scrollable list of models sorted A-Z by label. Filters match against both `label` and `value` (model ID). Shows "No models match" when the query has no results. Supports a `size` prop (`default` / `sm`) to fit compact rows (enrichment, content-review).

---

## Component API

### `LlmProviderSelect`

```typescript
// frontend/src/components/llm/LlmProviderSelect.tsx

interface LlmProviderSelectProps {
  /** Only the providers to show (filtered by what is configured in the workspace). */
  providers: Array<{ id: LlmProviderId; name: string }>;
  value: LlmProviderId;
  onChange: (provider: LlmProviderId) => void;
  disabled?: boolean;
  /** 'sm' renders smaller buttons for compact rows. Default: 'default'. */
  size?: 'sm' | 'default';
  className?: string;
}
```

### `LlmModelCombobox`

```typescript
// frontend/src/components/llm/LlmModelCombobox.tsx

interface LlmModelComboboxProps {
  /** Pass only models for the currently-selected provider. Component sorts A-Z internally. */
  models: LlmModelOption[];
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** 'sm' renders a compact trigger (h-8, text-xs). Default: 'default'. */
  size?: 'sm' | 'default';
  className?: string;
}
```

### `frontend/src/components/llm/index.ts`
Re-exports `LlmProviderSelect` and `LlmModelCombobox`.

---

## Behavior Details

### Model sorting
Inside `LlmModelCombobox`, models are sorted before rendering:
```typescript
const sorted = useMemo(
  () => [...models].sort((a, b) => a.label.localeCompare(b.label)),
  [models]
);
```

### Search filtering
```typescript
const filtered = sorted.filter(
  (m) =>
    m.label.toLowerCase().includes(query.toLowerCase()) ||
    m.value.toLowerCase().includes(query.toLowerCase())
);
```

### Model reset on provider change
Each call site is responsible: when provider changes, reset model to `newCatalog[0]?.value ?? ''`. This logic already exists in most handlers — this spec standardises it everywhere.

### `TopicsRightRail` special case
Keeps a synthetic "Workspace default" entry prepended before the sorted list:
```typescript
const allOptions = [
  { value: WORKSPACE_DEFAULT_MODEL, label: 'Workspace default' },
  ...sorted,
];
```

### Value not in list
If `value` is not found in `models`, the trigger shows the raw value string (existing fallback behaviour, unchanged).

---

## Usage Map

| File | Provider component | Model component | Notes |
|------|--------------------|-----------------|-------|
| `DashboardSettingsDrawer` — primary | `LlmProviderSelect` | `LlmModelCombobox` | Catalog switches per provider |
| `DashboardSettingsDrawer` — fallback | `LlmProviderSelect` (+ None option as sibling button or separate) | `LlmModelCombobox` | Only shown when fallback != null |
| `DashboardSettingsDrawer` → `LlmPerFeatureSettings` | `LlmProviderSelect` size=sm | `LlmModelCombobox` size=sm | Per-feature rows |
| `DashboardSettingsDrawer` → `EnrichmentLlmSettings` | `LlmProviderSelect` size=sm | `LlmModelCombobox` size=sm | Per-enrichment rows |
| `PostGenerateSettings` | `LlmProviderSelect` | `LlmModelCombobox` | Tenant generation picker |
| `ContentReviewSettings` | `LlmProviderSelect` size=sm | `LlmModelCombobox` size=sm | Text + vision pairs |
| `TopicsRightRail` | — (no provider select here) | `LlmModelCombobox` | Workspace-default prepended |

---

## Catalog passed to each component

Callers filter/select the correct catalog slice **before** passing to `LlmModelCombobox`. The component is catalog-agnostic — it only sorts and filters whatever it receives.

Example (primary model in drawer):
```typescript
const primaryCatalog =
  llmPrimaryProvider === 'grok' ? grokAdminCatalog :
  llmPrimaryProvider === 'openrouter' ? openrouterAdminCatalog :
  adminModelCatalog;

<LlmModelCombobox
  models={primaryCatalog}
  value={llmModelId}
  onChange={setLlmModelId}
/>
```

---

## Styling

Follows the existing glassmorphism violet theme throughout:

| Element | Classes |
|---------|---------|
| Provider button (inactive) | `rounded-xl border border-border bg-white/80 px-3 py-1.5 text-sm font-medium text-ink hover:bg-violet-100/40 transition-colors` |
| Provider button (active) | `rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white` |
| Combobox trigger | Matches existing `SelectTrigger` styling from `select.tsx` |
| Popover content | Matches existing `SelectContent` styling — `rounded-xl border border-violet-200/50 bg-white/95 backdrop-blur-xl shadow-lift` |
| Search input | `border-b border-border rounded-none rounded-t-xl focus-visible:ring-0` (flush top of popover) |
| Model list item | Matches existing `SelectItem` hover/highlight styling |
| sm trigger | `h-8 rounded-lg px-2.5 py-1.5 text-xs` |

---

## Files Created / Modified

**Create:**
- `frontend/src/components/llm/LlmProviderSelect.tsx`
- `frontend/src/components/llm/LlmModelCombobox.tsx`
- `frontend/src/components/llm/index.ts`

**Modify:**
- `frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx`
- `frontend/src/features/review/components/PostGenerateSettings.tsx`
- `frontend/src/features/content-review/ContentReviewSettings.tsx`
- `frontend/src/components/dashboard/components/TopicsRightRail.tsx`
