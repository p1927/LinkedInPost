# LinkedIn Post UI Bug Fixes — 2026-04-23

## Context

Four bugs in the LinkedIn Post frontend and one feature improvement are addressed:

1. **Sidebar active-state bug**: Clicking "New Topic" or "Topics" incorrectly activates both; same for "Settings" / "Automations". Clicking Automations also fails to navigate to the Automations page.
2. **New Topic sidebar**: Real-time debounced updates should be replaced with a manual refresh button wired to live News + RSS APIs.
3. **Settings Content Review**: Changing LLM provider+model and saving reverts the provider to Gemini while preserving the new model — mismatch between provider and model.
4. **Topics View right rail**: Selecting a pending topic shows a mismatched provider/model pair (Gemini provider with Minimax model or similar).
5. **TrendingSidebar refresh**: Add a refresh button to manually reload trending/news content.

---

## Bug 1 — Sidebar Active-State + Automations Navigation

### Problem

In `AppSidebar.tsx`, the `link()` helper uses `NavLink` with `end={page !== 'topics'}` to determine the active state. The logic:

```ts
const to =
  page === 'topics'   ? WORKSPACE_PATHS.topics
  : page === 'add-topic' ? WORKSPACE_PATHS.addTopic
  // ...
```

**Issues:**
- `add-topic` and `topics` are nested paths (`/topics/new` starts with `/topics`). With `end={false}` (default) for `add-topic`, the router matches `/topics` first, activating both.
- `settings` and `automations` are siblings — `/automations` does **not** start with `/settings`, so it should activate only on its own route. However, both show active because the `NavLink` `isActive` is evaluated against the full location, and something is causing over-matching.
- `automations` route is correctly mapped (`WORKSPACE_PATHS.automations`), but clicking it may not trigger navigation because the `link()` function for `automations` returns the wrong `to` path — it falls through to the default case (`WORKSPACE_PATHS.settings`).

### Diagnosis

Looking at `link()` in `AppSidebar.tsx` lines 130–189:

```ts
const to =
  page === 'topics'      ? WORKSPACE_PATHS.topics
  : page === 'add-topic' ? WORKSPACE_PATHS.addTopic
  : page === 'rules'     ? WORKSPACE_PATHS.rules
  : page === 'campaign'  ? WORKSPACE_PATHS.campaign
  : page === 'usage'     ? WORKSPACE_PATHS.usage
  : page === 'connections'  ? WORKSPACE_PATHS.connections
  : page === 'enrichment'   ? WORKSPACE_PATHS.enrichment
  : page === 'trending'     ? WORKSPACE_PATHS.trending
  : WORKSPACE_PATHS.settings; // <-- 'automations' falls through here!
```

The `automations` case is missing, so it falls through to `settings` — so clicking Automations actually navigates to `/settings`, explaining why both show active.

### Fix

Add `automations` to the `to` mapping and ensure each sibling path uses `end={true}` to prevent prefix matching:

```ts
const to =
  page === 'topics'      ? WORKSPACE_PATHS.topics
  : page === 'add-topic' ? WORKSPACE_PATHS.addTopic
  : page === 'rules'     ? WORKSPACE_PATHS.rules
  : page === 'campaign'  ? WORKSPACE_PATHS.campaign
  : page === 'usage'     ? WORKSPACE_PATHS.usage
  : page === 'connections'  ? WORKSPACE_PATHS.connections
  : page === 'enrichment'   ? WORKSPACE_PATHS.enrichment
  : page === 'trending'     ? WORKSPACE_PATHS.trending
  : page === 'settings'     ? WORKSPACE_PATHS.settings
  : WORKSPACE_PATHS.automations; // explicit automations
```

And pass `end={true}` for sibling pages to prevent prefix matching:

```ts
<NavLink to={to} end={page !== 'topics' && page !== 'add-topic'} ...>
```

---

## Bug 2 — New Topic Sidebar: Mock → Real News/RSS + Manual Refresh

### Problem

`TrendingSidebar.tsx` uses `useTrending(topic)` which returns mock data. The "Live Research" sidebar on the New Topic page debounces at 600ms and auto-fetches on every keystroke. This should instead:

1. Wire to real News and RSS APIs (via the existing `useNewsTrending` hook which already has a `refetch()` callback)
2. Replace real-time fetching with a manual **Refresh** button

### Fix

Modify `TrendingSidebar` to:

1. Accept an explicit `onRefresh` callback prop (or add internal `refetch` state)
2. Show a **Refresh** button in the sidebar header
3. When refresh is clicked, call `refetch()` from `useNewsTrending` and show loading state
4. Remove the auto-debounce behavior — sidebar content only loads on mount and on refresh click
5. In `AddTopicPage.tsx`, remove the `debouncedTopic` state and `useEffect` debounce logic; instead pass the raw `topic` to `TrendingSidebar` (or remove it entirely since refresh is manual)

The sidebar should still receive the `topic` for display purposes, but the actual data-fetch trigger is the refresh button, not typing.

**API wiring:** The `useNewsTrending` hook already exists and returns `{ data, loading, error, refetch }`. Wire `TrendingSidebar` to call `refetch()` on button click.

---

## Bug 3 — Settings Content Review: Provider Reverts to Gemini After Save

### Problem

In `ContentReviewSettings.tsx`, when the user selects a new provider and model and clicks Save Settings, the provider reverts to Gemini but the model is retained.

### Diagnosis

`ContentReviewSettings` manages local state via `value` (a `ContentReviewStored` object) and `onChange`. When the provider changes, it sets the first model from the new provider's catalog:

```ts
const handleTextProviderChange = (provider: LlmProviderId) => {
  const models = modelsForProvider(provider, llmCatalog);
  const firstModel = models[0]?.value ?? '';
  onChange({ ...value, textRef: { provider, model: firstModel } });
};
```

This is correct — it resets the model to the first available model for the new provider. However, if the `llmCatalog` is empty or hasn't loaded yet when the provider changes, `firstModel` could be empty or stale, and then `onChange` is called with the wrong model.

But the real issue is likely in `useDashboardSettings.ts` around line 475 where `contentReview` is compared to detect changes, and in the `saveSettings` function which does:

```ts
...(FEATURE_CONTENT_REVIEW ? { contentReview } : {}),
```

The `contentReview` object is passed directly to the API. If the `normalizeContentReviewStored` function doesn't handle all fields correctly, or if the API response resets the provider field, that could cause the revert.

Looking at `normalizeContentReviewStored` (line 138), it reads `session.config.contentReview`. The issue may be that after calling `saveSettings`, the `session.config` returned from the API has normalized the stored values differently.

The bug: **user selects MiniMax provider + a MiniMax model → clicks Save → provider reverts to Gemini but model stays the new MiniMax model**.

This means `saveSettings` is persisting the new model but not the new provider. The provider field is being overwritten by the default. Likely the `textRef` or `visionRef` field is being constructed incorrectly when only some fields are set.

### Fix

In `useDashboardSettings.ts`, the `saveSettings` function (around line 512) should merge the new `contentReview` with the existing config rather than replacing it wholesale. Check that the provider field is actually being sent. Also add a defensive check in `ContentReviewSettings` to verify `llmCatalog` is loaded before allowing provider changes.

---

## Bug 4 — Topics View Right Rail: Provider/Model Mismatch

### Problem

When a pending topic is selected in Topics View, the right rail's AI model dropdown shows a mismatch: Gemini as provider but a Minimax model (or vice versa).

### Diagnosis

The right rail (`TopicsRightRail.tsx`) uses `LlmModelCombobox` with `availableModels` prop. The `availableModels` come from `workspaceLlm` (passed from `Dashboard` → `topicsRail` → `TopicsRightRail`):

```ts
const workspaceDefaultModelCaption = useMemo(() => {
  const modelLabel =
    availableModels.find((m) => m.value === workspaceLlm.model)?.label ??
    (workspaceLlm.model?.trim() || 'workspace model');
  if (FEATURE_MULTI_PROVIDER_LLM && providerLabel?.trim()) {
    return `Default - ${providerLabel.trim()}: ${modelLabel}`;
  }
  return `Default - ${modelLabel}`;
}, [availableModels, workspaceLlm.model, providerLabel]);
```

The `availableModels` are the list of models for the current `workspaceLlm.provider`. But if `topicGenerationModel` is set to a model from a different provider (e.g., a Minimax model stored on the row while `workspaceLlm.provider` is Gemini), the `modelIdValue` computation:

```ts
const modelIdValue = useMemo(() => {
  if (!selectedRow) return WORKSPACE_DEFAULT_MODEL;
  const raw = String(selectedRow.topicGenerationModel || '').trim();
  if (!raw) return WORKSPACE_DEFAULT_MODEL;
  if (FEATURE_MULTI_PROVIDER_LLM && raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw) as { model?: string };
      const m = String(o.model || '').trim();
      if (m) return m;
    } catch { /* fall through */ }
    return WORKSPACE_DEFAULT_MODEL;
  }
  return raw;
}, [selectedRow]);
```

This parses the stored JSON `{ provider, model }` but **does not validate that the model belongs to `workspaceLlm.provider`**. So it shows the wrong model without checking provider compatibility.

The fix: When showing a topic's model in the dropdown, validate that the stored model belongs to the current workspace provider. If not, clear it and show the workspace default.

### Fix

In `TopicsRightRail.tsx`, modify the `modelIdValue` computation to validate provider compatibility:

```ts
const modelIdValue = useMemo(() => {
  if (!selectedRow) return WORKSPACE_DEFAULT_MODEL;
  const raw = String(selectedRow.topicGenerationModel || '').trim();
  if (!raw) return WORKSPACE_DEFAULT_MODEL;
  if (FEATURE_MULTI_PROVIDER_LLM && raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw) as { provider?: string; model?: string };
      const m = String(o.model || '').trim();
      // Validate: only accept model if provider matches workspace provider
      if (m && o.provider === workspaceLlm.provider) return m;
    } catch { /* fall through */ }
    return WORKSPACE_DEFAULT_MODEL;
  }
  return raw;
}, [selectedRow, workspaceLlm.provider]);
```

And when the user saves a new model, always include the current `workspaceLlm.provider` in the stored JSON:

```ts
const payload = JSON.stringify({ provider: workspaceLlm.provider, model: val });
scheduleModelSave(selectedRow, payload);
```

This ensures provider and model are always consistent.

---

## Feature: TrendingSidebar Refresh Button

### Summary

Add a refresh button to the `TrendingSidebar` that manually triggers a reload of the trending data (news + topics), replacing the current real-time debounced behavior.

### Changes

**`TrendingSidebar.tsx`:**
- Accept `onRefresh?: () => void` prop (optional; if not provided, no button shown)
- Add a refresh button in the sidebar header next to "Live Research" title
- Show loading skeleton while `loading === true`
- Clicking refresh calls `onRefresh()` and shows loading state

**`AddTopicPage.tsx`:**
- Import `useNewsTrending` (or expose `refetch` via `useTrending`)
- Pass `onRefresh={refetch}` to `TrendingSidebar`
- Remove the `debouncedTopic` state and debounce `useEffect` — sidebar receives raw topic but doesn't auto-fetch

**No changes to the routing or page layout — only the data-fetching behavior of the sidebar.**

---

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/components/workspace/AppSidebar.tsx` | Fix `link()` `to` mapping; add `end` prop for NavLink |
| `frontend/src/features/add-topic/TrendingSidebar.tsx` | Add refresh button; wire to live API via `refetch` |
| `frontend/src/features/add-topic/AddTopicPage.tsx` | Remove debounce; pass topic + refresh callback |
| `frontend/src/features/trending/hooks/useNewsTrending.ts` | Ensure `refetch` is stable and exported |
| `frontend/src/features/content-review/ContentReviewSettings.tsx` | Defensive guard on empty catalog |
| `frontend/src/components/dashboard/hooks/useDashboardSettings.ts` | Fix `saveSettings` to preserve provider; add logging |
| `frontend/src/components/dashboard/components/TopicsRightRail.tsx` | Validate model-provider compatibility in `modelIdValue` |

---

## Verification

1. **Sidebar**: Navigate to each sidebar item — only the clicked item shows active state; "New Topic" and "Topics" do not both activate; clicking Automations navigates to `/automations`
2. **New Topic sidebar**: Type a topic, click Refresh button, content loads from real API; no live fetching while typing
3. **Settings**: Select MiniMax + MiniMax model, save, reload page — settings persist correctly
4. **Topics View right rail**: Select a pending topic with a mismatched model/provider — rail shows workspace default; no mismatch shown
5. **Refresh button**: Click refresh, loading skeleton appears, new content loads after click
