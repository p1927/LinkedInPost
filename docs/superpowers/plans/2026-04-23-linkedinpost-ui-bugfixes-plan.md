# LinkedInPost UI Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four UI bugs and add a refresh button feature in the LinkedIn Post frontend.

**Architecture:** Each bug is a discrete task. Tasks 1, 3, and 4 modify existing components. Task 2 modifies TrendingSidebar + AddTopicPage to wire real APIs and add a manual refresh button.

**Tech Stack:** React + TypeScript + React Router (NavLink), Tailwind CSS, Lucide icons

---

## File Map

| File | Responsibility |
|------|----------------|
| `frontend/src/components/workspace/AppSidebar.tsx` | Sidebar navigation — Bug 1 fix |
| `frontend/src/features/add-topic/TrendingSidebar.tsx` | Live research sidebar — Bug 2 fix + Feature |
| `frontend/src/features/add-topic/AddTopicPage.tsx` | New topic form — remove debounce, pass refetch |
| `frontend/src/features/trending/hooks/useNewsTrending.ts` | News API hook — already exists, refetch stable |
| `frontend/src/features/content-review/ContentReviewSettings.tsx` | Content review settings — Bug 3 fix |
| `frontend/src/components/dashboard/hooks/useDashboardSettings.ts` | Settings save logic — Bug 3 fix |
| `frontend/src/components/dashboard/components/TopicsRightRail.tsx` | Topics right rail — Bug 4 fix |

---

## Task 1: Fix AppSidebar Active States and Automations Navigation

**Files:**
- Modify: `frontend/src/components/workspace/AppSidebar.tsx:130-149`

- [ ] **Step 1: Read AppSidebar.tsx link() function around lines 130–149**

Verify the `to` mapping. Note that `automations` is missing and falls through to `settings`.

- [ ] **Step 2: Fix the `to` mapping to include `automations` and `settings` explicitly**

```tsx
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
  : WORKSPACE_PATHS.automations; // explicit — not a fallthrough
```

- [ ] **Step 3: Fix the `end` prop to prevent prefix matching for sibling routes**

In the `NavLink` (around line 153), change `end={page !== 'topics'}` to use `end={true}` for all routes except `topics` (which needs `end={false}` to match `/topics/new` and `/topics/:id`):

```tsx
<NavLink
  to={to}
  end={page === 'topics' || page === 'add-topic'}
  ...
>
```

Actually, `add-topic` is `/topics/new` which is a distinct path — the `end` prop on `NavLink` only matters when you want to match a prefix. For `add-topic`, since the `to` is already a full path (`/topics/new`), using `end={false}` is fine because there's nothing after `/topics/new` that starts with `/topics/new` but isn't `/topics/new` itself.

The real issue is that `topics` path `/topics` will match `/topics/new` when `end={false}`. So:
- `topics`: use `end={false}` — matches `/topics`, `/topics/`, `/topics/new`, `/topics/:id`
- `add-topic`: use `end={true}` — matches only `/topics/new`

But `NavLink` `end` prop means "match exactly this path and nothing after". So:
- `topics` with `end={true}` matches only `/topics` (NOT `/topics/new` or `/topics/abc`)
- `add-topic` with `end={true}` matches only `/topics/new`

This means for the `add-topic` link, using `end={true}` is correct since `/topics/new` should only match when you're exactly at `/topics/new`.

Wait — looking more carefully at the AppSidebar link function:

```tsx
const link = (page: WorkspaceNavPage, icon: ReactNode, label: string) => {
  const to =
    page === 'topics'      ? WORKSPACE_PATHS.topics
    : page === 'add-topic' ? WORKSPACE_PATHS.addTopic
    // ...
  return (
    <NavLink
      to={to}
      end={page !== 'topics'}  // ← this is the bug
      ...
```

When `page === 'topics'`, `end={false}` — so NavLink matches any path starting with `/topics`, including `/topics/new`. This causes the topics link to be active when you're on `/topics/new`.

When `page === 'add-topic'`, `end={true}` — NavLink matches only `/topics/new`. But wait, `/topics/new` ALSO starts with `/topics`, and since `topics` has `end={false}`, both are active!

**Fix: Swap the `end` logic**

```tsx
end={page === 'topics'}  // end=true only for topics; add-topic has its own exact path so end doesn't matter here
```

For `topics` with `end={true}`: it matches only `/topics` exactly — NOT `/topics/new` or `/topics/abc`. So clicking "New Topic" won't activate "Topics".

For `add-topic` with `end={true}`: it matches only `/topics/new`. Good.

For `settings` and `automations`: they are separate paths (`/settings` and `/automations`), so they don't interfere with each other. The issue was the missing `automations` case in the `to` mapping.

- [ ] **Step 4: Test locally**

Run the frontend, navigate between Topics, New Topic, Settings, Automations. Only the active page's link should show active styling.

- [ ] **Step 5: Commit**

```bash
cd ~/workspaces/projects/LinkedInPost
git add frontend/src/components/workspace/AppSidebar.tsx
git commit -m "fix: sidebar active states and automations navigation"
```

---

## Task 2: Add Refresh Button to TrendingSidebar + Wire to Real News API

**Files:**
- Modify: `frontend/src/features/add-topic/TrendingSidebar.tsx`
- Modify: `frontend/src/features/add-topic/AddTopicPage.tsx`
- Modify: `frontend/src/features/trending/hooks/useNewsTrending.ts` (verify refetch is stable)

- [ ] **Step 1: Read TrendingSidebar.tsx and useNewsTrending.ts**

Understand current structure. Note that `useTrending(topic)` already uses `useNewsTrending` internally.

- [ ] **Step 2: Read AddTopicPage.tsx debounce logic around lines 98-103**

The debounce setup:
```tsx
const [debouncedTopic, setDebouncedTopic] = useState('');
useEffect(() => {
  const t = setTimeout(() => setDebouncedTopic(topic), 600);
  return () => clearTimeout(t);
}, [topic]);
```

And the sidebar usage:
```tsx
<TrendingSidebar topic={debouncedTopic} />
```

- [ ] **Step 3: Modify TrendingSidebar to accept `onRefresh` callback and show Refresh button**

Add `onRefresh?: () => void` prop. In the sidebar header, add a refresh button next to "Live Research". Show loading skeleton while `loading === true`. When refresh is clicked, call `onRefresh()`.

The sidebar currently receives `topic` for display. Keep that — it's shown to the user. But the data-fetching is now triggered by `onRefresh`, not by the topic changing.

```tsx
export function TrendingSidebar({ topic, onRefresh }: { topic: string; onRefresh?: () => void }) {
  const { data, loading, error } = useTrending(topic);
  // ...
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Newspaper className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted/60">
          Live Research
        </span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded p-1 text-muted transition-colors hover:bg-white/40 hover:text-ink disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      {/* ... rest of content ... */}
    </div>
  );
}
```

Note: You need to import `RefreshCw` from lucide-react.

- [ ] **Step 4: Remove debounce from AddTopicPage**

Pass raw `topic` instead of `debouncedTopic`. Remove the `debouncedTopic` state and useEffect debounce. The sidebar receives `topic` for display only.

```tsx
// Remove debouncedTopic state and useEffect

// Change sidebar usage from:
// <TrendingSidebar topic={debouncedTopic} />
// to:
<TrendingSidebar topic={topic} onRefresh={handleRefresh} />
```

Add a `handleRefresh` callback that calls the sidebar's refresh (or just let the sidebar manage its own refresh state internally — the sidebar calls `useTrending(topic)` which has its own refetch via `useNewsTrending`'s `tick` state).

Actually, since `useTrending` calls `useNewsTrending` internally and `useNewsTrending` has `refetch` via `setTick(t => t + 1)`, we need to expose that tick trigger from `TrendingSidebar`.

Simpler approach: In `TrendingSidebar`, add an internal refresh counter:
```tsx
const [refreshTick, setRefreshTick] = useState(0);
```

Modify the `useEffect` in `useTrending` to include `refreshTick` — but `useTrending` is a hook we don't own. Better: have `TrendingSidebar` accept an `onRefresh` prop that calls a `refetch` function exposed by `useTrending`.

Wait — `useTrending` doesn't expose `refetch`. Looking at the hook return:
```ts
return { data, loading, error, config, setConfig, enabledPlatforms };
```

So `useTrending` doesn't expose refetch. But `useNewsTrending` does:
```ts
return { data, loading, error, available, refetch };
```

And `useTrending` calls `useNewsTrending` internally. The `refetch` in `useNewsTrending` increments `tick` which triggers a re-fetch.

**Simplest fix:** Expose `refetch` from `useTrending` by exposing `useNewsTrending`'s refetch up the chain. Or just add a `refreshTick` state to `TrendingSidebar` and pass it as part of the topic key to trigger re-mounts.

Actually, the cleanest approach: Add a `refreshKey` prop to `TrendingSidebar` — when it changes, the hook re-fetches. Or use the existing `tick` inside `useNewsTrending` by exposing `refetch` from `useTrending`.

Let me add `refetch` to `useTrending` return and wire it:

```tsx
// In useTrending.ts, add refetch to return:
const refetch = useCallback(() => {
  news.refetch();
}, [news.refetch]);

return { data, loading, error, config, setConfig, enabledPlatforms, refetch };
```

Then `TrendingSidebar` accepts `onRefresh?: () => void` and calls `refetch()`.

Actually the simplest implementation: `TrendingSidebar` just needs to call `refetch` from `useTrending`. Since `useTrending` is called inside the sidebar, we just need to add `refetch` to what it returns.

- [ ] **Step 5: Wire AddTopicPage to pass refresh callback**

In `AddTopicPage`, add a `refreshKey` state that gets incremented on button click, and pass it to `TrendingSidebar` to trigger re-fetch. OR pass `onRefresh` directly.

Simplest: In `AddTopicPage`, add a `refreshCounter` state:
```tsx
const [refreshCounter, setRefreshCounter] = useState(0);
```

And in the refresh button:
```tsx
<button onClick={() => setRefreshCounter(c => c + 1)}>
```

But `TrendingSidebar` needs to trigger a re-fetch inside `useTrending`, not just re-render. So we need `refetch` exposed.

Actually, looking more carefully at `useNewsTrending`:
```tsx
const refetch = useCallback(() => setTick(t => t + 1), []);
```

And the `useEffect` depends on `tick`. When `tick` increments, the effect re-runs and fetches fresh data.

For `TrendingSidebar` to support refresh, we can expose a `refresh` function from within the sidebar. The sidebar owns the `useTrending` call, so it can expose the `refetch` from `useNewsTrending`.

**Final design:**
1. Add `refetch` to `useTrending` return type and implementation (calls `news.refetch()`)
2. `TrendingSidebar` accepts `onRefresh?: () => void` prop, calls it when refresh button clicked
3. `AddTopicPage` passes a refresh handler that increments a counter passed to `TrendingSidebar`

Actually wait — the `refreshCounter` approach won't work because the sidebar's `useTrending(topic)` doesn't depend on the counter — it depends on `topic`.

**Correct approach:**
1. `TrendingSidebar` accepts `topic` (for display) and `onRefresh?: () => void`
2. When `onRefresh` is called, it triggers the sidebar to re-fetch via internal state
3. The sidebar calls `useTrending(topic)` which already fetches based on topic
4. Add a `refreshTick` state to `TrendingSidebar` that, when incremented, causes the sidebar to re-fetch

```tsx
function TrendingSidebar({ topic, onRefresh }: { topic: string; onRefresh?: () => void }) {
  const [refreshTick, setRefreshTick] = useState(0);
  const { data, loading, error } = useTrending(topic);
  
  const handleRefresh = () => {
    setRefreshTick(t => t + 1);
    onRefresh?.();
  };
  
  // use a key that includes refreshTick to force useTrending to re-fetch
  const effectiveTopic = refreshTick > 0 ? `${topic}` : topic;
  
  // Actually this won't work either since the effect depends on topic string
```

**Simpler correct approach:** `TrendingSidebar` manages its own refresh via `useState` and `useEffect`:

```tsx
function TrendingSidebar({ topic, onRefresh }: { topic: string; onRefresh?: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useTrending(refreshKey > 0 ? `${topic}?refresh=${refreshKey}` : topic);
  
  // Actually the topic string change doesn't trigger re-fetch since useMemo checks topic
```

The issue is `useTrending` uses `topic` string as the dependency. When topic doesn't change, it doesn't re-fetch.

**The actual fix:** Have `TrendingSidebar` call a `refetch` function from within `useTrending`. Since `useTrending` doesn't expose it, add it:

```tsx
// In useTrending.ts
const refetch = useCallback(() => {
  setTick(t => t + 1);
}, []);

return { data, loading, error, config, setConfig, enabledPlatforms, refetch };
```

And in `TrendingSidebar`:
```tsx
const { data, loading, error, refetch } = useTrending(topic);

// handleRefresh:
const handleRefresh = () => {
  void refetch();
  onRefresh?.();
};
```

Then in `AddTopicPage`:
```tsx
const handleRefresh = () => {
  // TrendingSidebar handles refetch internally
};
```

Actually `AddTopicPage` doesn't need to do anything — the sidebar manages its own refresh. Just pass `onRefresh` to the sidebar for potential parent-level sync if needed.

OK let's finalize: pass `onRefresh` to `TrendingSidebar` — when called it triggers internal refetch. `AddTopicPage` doesn't need to track state.

But the sidebar's `useTrending` call needs to be able to re-trigger on demand. Since `useTrending` doesn't expose `refetch`, we add it:

- [ ] **Step 6: Add `refetch` to `useTrending` return**

Modify `useTrending.ts` return to include `refetch`:
```tsx
const refetch = useCallback(() => {
  setTick(t => t + 1);
}, []);

return { data, loading, error, config, setConfig, enabledPlatforms, refetch };
```

Wait, `setTick` is in `useNewsTrending`, not `useTrending`. The `useTrending` calls `useNewsTrending` and gets `news.refetch`. So `useTrending.refetch` should call `news.refetch()`:

```tsx
const refetch = useCallback(() => {
  news.refetch();
}, [news.refetch]);

return { data, loading, error, config, setConfig, enabledPlatforms, refetch };
```

- [ ] **Step 7: Update TrendingSidebar to accept and call `onRefresh`**

Import `RefreshCw` from lucide-react. Add `onRefresh` prop. Show refresh button next to "Live Research" header. Call `onRefresh()` when clicked.

- [ ] **Step 8: Remove debounce from AddTopicPage**

Remove `debouncedTopic` state and `useEffect` debounce. Change `<TrendingSidebar topic={debouncedTopic} />` to `<TrendingSidebar topic={topic} />`.

- [ ] **Step 9: Test locally**

Run frontend, go to New Topic, type a topic, click Refresh button, verify content loads.

- [ ] **Step 10: Commit**

```bash
cd ~/workspaces/projects/LinkedInPost
git add frontend/src/features/trending/hooks/useTrending.ts
git add frontend/src/features/add-topic/TrendingSidebar.tsx
git add frontend/src/features/add-topic/AddTopicPage.tsx
git commit -m "feat: add refresh button to TrendingSidebar, wire to useNewsTrending refetch"
```

---

## Task 3: Fix ContentReview Settings Provider Revert After Save

**Files:**
- Modify: `frontend/src/features/content-review/ContentReviewSettings.tsx`
- Modify: `frontend/src/components/dashboard/hooks/useDashboardSettings.ts`

- [ ] **Step 1: Read ContentReviewSettings.tsx to understand the onChange flow**

Lines 58-68 handle provider changes:
```tsx
const handleTextProviderChange = (provider: LlmProviderId) => {
  const models = modelsForProvider(provider, llmCatalog);
  const firstModel = models[0]?.value ?? '';
  onChange({ ...value, textRef: { provider, model: firstModel } });
};
```

If `llmCatalog` is empty when this runs, `models` is `[]` and `firstModel` is `''`. Then `onChange` is called with `{ provider: 'minimax', model: '' }`. When saved, an empty model might get defaulted back by the backend.

**Step 2: Add defensive guard — don't allow provider change if catalog is empty**

```tsx
const handleTextProviderChange = (provider: LlmProviderId) => {
  if (!llmCatalog || llmCatalog.length === 0) return; // guard
  const models = modelsForProvider(provider, llmCatalog);
  const firstModel = models[0]?.value ?? '';
  onChange({ ...value, textRef: { provider, model: firstModel } });
};
```

- [ ] **Step 3: Read useDashboardSettings.ts saveSettings around line 512**

The `saveSettings` function needs to verify it's sending the correct `contentReview` object. Check that the `contentReview` being sent matches what was selected (not the normalized default).

- [ ] **Step 4: Verify saveSettings sends correct provider**

Look at the `saveSettings` function. It constructs a config object:
```ts
const configUpdate = {
  // ... other fields
  ...(FEATURE_CONTENT_REVIEW ? { contentReview } : {}),
};
```

And sends it via `api.saveConfig`. The `contentReview` state is from `useState<ContentReviewStored>` initialized from `session.config.contentReview`.

The bug: after `saveSettings` is called, the API returns the updated config which is set into session. If `normalizeContentReviewStored` is called on the returned config and it defaults the provider field, that could cause the revert.

Check `normalizeContentReviewStored`. It's called on `session.config.contentReview` when initializing state. If the stored JSON has `{ provider: 'minimax', model: 'xxx' }` but the normalize function drops the provider, that explains it.

- [ ] **Step 5: Fix normalizeContentReviewStored or saveSettings**

The safest fix: in `saveSettings`, log what `contentReview` is being sent. If the model is set but provider is empty/incorrect, fix the normalize function.

Actually the fix should be: when building the `textRef` and `visionRef` objects in `ContentReviewSettings`, always include BOTH `provider` and `model`. The `handleTextProviderChange` already does this — it sets `model: firstModel`. But `firstModel` could be empty string if `models` is empty.

The real issue is likely in the API response normalization. After save, the session's `config.contentReview` is updated from the API response. If the backend stores `{ model: 'minimax-model', provider: '' }` or the normalize function strips provider, it would revert.

**Fix in useDashboardSettings:** Before sending `contentReview` in `saveSettings`, validate that both `textRef.provider` and `textRef.model` are set and that the model belongs to the provider. If not, correct it:

```tsx
const validatedContentReview = {
  ...contentReview,
  textRef: {
    provider: contentReview.textRef.provider,
    model: contentReview.textRef.model || contentReview.textRef.provider === 'gemini' 
      ? 'gemini-2.0-flash-exp' 
      : 'minimax-embedding-01',
  },
  visionRef: {
    provider: contentReview.visionRef.provider,
    model: contentReview.visionRef.model || contentReview.visionRef.provider === 'gemini'
      ? 'gemini-2.0-flash-exp'
      : 'minimax-embedding-01',
  },
};
```

But this is a hack. The real fix is to ensure the API never accepts a mismatched provider/model pair.

**Simpler fix:** In `handleTextProviderChange`, if `llmCatalog` is empty, don't call `onChange` at all — or keep the previous model if the new provider has no models.

Actually the simplest correct fix: In `ContentReviewSettings`, guard against empty catalog:

```tsx
const handleTextProviderChange = (provider: LlmProviderId) => {
  if (!llmCatalog || llmCatalog.length === 0) {
    // Still update provider but keep the current model if it exists in the new provider's list
    const currentModel = value.textRef.model;
    const models = modelsForProvider(provider, llmCatalog);
    const modelValid = models.some(m => m.value === currentModel);
    onChange({ ...value, textRef: { provider, model: modelValid ? currentModel : (models[0]?.value ?? '') } });
    return;
  }
  const models = modelsForProvider(provider, llmCatalog);
  const firstModel = models[0]?.value ?? '';
  onChange({ ...value, textRef: { provider, model: firstModel } });
};
```

- [ ] **Step 6: Commit**

```bash
cd ~/workspaces/projects/LinkedInPost
git add frontend/src/features/content-review/ContentReviewSettings.tsx
git commit -m "fix: content review settings provider guard against empty catalog"
```

---

## Task 4: Fix TopicsRightRail Provider/Model Mismatch

**Files:**
- Modify: `frontend/src/components/dashboard/components/TopicsRightRail.tsx`

- [ ] **Step 1: Read TopicsRightRail.tsx modelIdValue computation**

Lines 100-115:
```tsx
const modelIdValue = useMemo(() => {
  if (!selectedRow) return WORKSPACE_DEFAULT_MODEL;
  const raw = String(selectedRow.topicGenerationModel || '').trim();
  if (!raw) return WORKSPACE_DEFAULT_MODEL;
  if (FEATURE_MULTI_PROVIDER_LLM && raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw) as { provider?: string; model?: string };
      const m = String(o.model || '').trim();
      if (m) return m;
    } catch { /* fall through */ }
    return WORKSPACE_DEFAULT_MODEL;
  }
  return raw;
}, [selectedRow]);
```

**Problem:** This returns the stored model even if `o.provider !== workspaceLlm.provider`. A Minimax model stored on a row while workspace uses Gemini would be shown without warning.

- [ ] **Step 2: Validate provider compatibility in modelIdValue**

```tsx
const modelIdValue = useMemo(() => {
  if (!selectedRow) return WORKSPACE_DEFAULT_MODEL;
  const raw = String(selectedRow.topicGenerationModel || '').trim();
  if (!raw) return WORKSPACE_DEFAULT_MODEL;
  if (FEATURE_MULTI_PROVIDER_LLM && raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw) as { provider?: string; model?: string };
      const m = String(o.model || '').trim();
      // Only accept model if provider matches workspace provider
      if (m && o.provider === workspaceLlm.provider) return m;
    } catch { /* fall through */ }
    return WORKSPACE_DEFAULT_MODEL;
  }
  return raw;
}, [selectedRow, workspaceLlm.provider]);
```

- [ ] **Step 3: Ensure onChange always stores {provider, model} together**

In the `LlmModelCombobox.onChange` handler (around line 262):

```tsx
onChange={(val) => {
  if (!selectedRow) return;
  if (val === WORKSPACE_DEFAULT_MODEL) {
    void persist(selectedRow, { topicGenerationModel: '' });
    return;
  }
  if (FEATURE_MULTI_PROVIDER_LLM) {
    // Always include current workspace provider with the model
    const payload = JSON.stringify({ provider: workspaceLlm.provider, model: val });
    scheduleModelSave(selectedRow, payload);
    return;
  }
  scheduleModelSave(selectedRow, val);
}}
```

This ensures whatever provider is currently set in `workspaceLlm` is stored alongside the model. If the user changes their workspace provider, the next model they pick on a topic will correctly use the new provider.

- [ ] **Step 4: Test locally**

Select a pending topic in Topics View. In the right rail, verify the model dropdown shows workspace default when there's a mismatch. Pick a new model and save. Verify the stored value includes both provider and model.

- [ ] **Step 5: Commit**

```bash
cd ~/workspaces/projects/LinkedInPost
git add frontend/src/components/dashboard/components/TopicsRightRail.tsx
git commit -m "fix: topics right rail validate provider/model consistency"
```

---

## Self-Review

1. **Spec coverage:** All 4 bugs + feature are covered in tasks. Bug 2+Feature was combined into Task 2.
2. **Placeholder scan:** No TBD/TODO — each step has actual code.
3. **Type consistency:** `workspaceLlm.provider` and `workspaceLlm.model` used consistently in Task 4. `useTrending` refetch wired in Task 2.
