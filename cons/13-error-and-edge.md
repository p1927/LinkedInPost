# 13. Error & Edge States

> **Stakeholders:** every user. Cross-cutting — appears everywhere.
> **Source files:** [`components/ErrorBoundary.tsx`](../frontend/src/components/ErrorBoundary.tsx), [`components/useAlert.ts`](../frontend/src/components/useAlert.ts), [`components/AlertProvider.tsx`](../frontend/src/components/AlertProvider.tsx), [`services/backendApi.ts`](../frontend/src/services/backendApi.ts), OAuth handlers (popup parsing), worker SSE error events. All `Empty*`, `Loading*`, `Error*` components scattered through `frontend/src/features/`.
> **Tests:** [`tests/e2e/integration/error-states.spec.ts`](../frontend/tests/e2e/integration/error-states.spec.ts).
> **Pairs with:** [`audits/09-cross-cutting.md`](audits/09-cross-cutting.md) and [`phases/phase-6-cross-cutting.md`](phases/phase-6-cross-cutting.md).

## What this surface is

The cross-cutting error surface: bootstrap failures, auth expiry, generation SSE errors, OAuth popup failures, settings save errors. Today error UX is inconsistent — some flows toast, some show inline alerts, some surface backend URLs in user-visible copy.

Existing e2e covers: bootstrap 500/401, getRows failure/empty, generation SSE error, generation HTTP 500.

## Cons — 4 perspectives

### 👤 User
- Bootstrap-fail message includes a backend URL — confusing and looks like a bug.
- I don't get a single retry button anywhere.
- If I'm offline I don't know — the app appears stuck.
- A 429 rate limit looks like a generic failure; I don't know to wait.
- "LLM provider unavailable" doesn't tell me which step failed or whether to retry.
- Toasts disappear before I can read them.
- On phone, half the app is missing (Feed right rail, Settings drawer, Bulk table).

### 🎨 UX
- `[HIGH]` Empty / loading / error states inconsistent in tone, length, styling — adopt one tone (concise + 1 primary CTA + optional learn-more).
- `[HIGH]` Loading skeletons exist on initial load only — add for paginated/append cases everywhere.
- `[HIGH]` Error toasts disappear too fast / no retry CTA — standardise to `<ErrorBanner retry />`.
- `[HIGH]` Mobile parity broken: Feed right rail hidden, Settings drawer overflows, Bulk table doesn't scroll horizontally.
- `[MED]` Some errors render as red-bg alerts, some as toasts, some as inline form text — no global pattern.
- `[MED]` Error copy mixes technical and user-facing language.
- `[MED]` No focus-management on error display (screen reader users lose context).

### 📦 Product Owner
- `[HIGH]` No offline detection.
- `[HIGH]` No client-side rate-limit backoff.
- `[MED]` No "report this error" affordance with copy-to-clipboard payload.
- `[MED]` No error analytics → blind to top issues.
- `[MED]` Without onboarding nudges, new users don't know about Feed, Newsletter, or Bulk — they sit on Topics and bounce.

### 💼 Stakeholder
- `[HIGH]` Technical-leak in error copy hurts brand polish.
- `[HIGH]` High support load from "the app is broken" with no diagnostic info.
- `[MED]` Inconsistency = looks unfinished. A single set of primitives lifts perceived quality cheaply.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** Strip backend URL from any user-visible error message; replace with a generic copy + a "Show details" toggle for advanced users.
- [ ] **[HIGH]** Add a global `<OfflineBanner>` listening to `window.online/offline` events.
- [ ] **[HIGH]** Standardise on a single toast component for transient errors and inline alert for form errors. Build `<ErrorBanner retry />`, `<EmptyState />`, `<LoadingSkeleton />` primitives.
- [ ] **[HIGH]** Add "Retry" buttons to every async failure surface ([`useAlert.ts`](../frontend/src/components/useAlert.ts) extension to support actions).
- [ ] **[HIGH]** Map common backend codes to user copy: 401 → "Session expired, sign in again"; 429 → "Too many requests, try again in <s>"; 5xx → "Service hiccup, retrying…".
- [ ] **[MED]** Add empty-state cleanup pass: every Empty* component uses one tone (concise + 1 primary CTA + optional learn-more).

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Generation SSE errors carry `nodeId` and `nodeLabel`; UI shows "Audience analysis failed — retry" with one-click partial replay (joins [`10-enrichment-generation.md`](10-enrichment-generation.md) re-run controls).
- [ ] **[HIGH]** Form-level validation framework (zod schemas on settings + topic forms) replacing ad-hoc string checks.
- [ ] **[HIGH]** Rate-limit backoff middleware in [`services/backendApi.ts`](../frontend/src/services/backendApi.ts) with exponential backoff + Retry-After honouring.
- [ ] **[HIGH]** Mobile parity fixes: Feed right rail → top Trending carousel, Settings drawer → full page (per [`09-settings-connections.md`](09-settings-connections.md)), Bulk table horizontal scroll.
- [ ] **[MED]** Centralise OAuth popup error parsing into a `useOAuthFlow()` hook so every channel inherits the same UX.
- [ ] **[MED]** Append-skeleton pattern across paginated lists (Feed, Topics, Newsletter issues).
- [ ] **[MED]** Accessibility — labels on all icon-only buttons (clip, vote, edit, close), focus rings on interactive elements, color-contrast pass.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[MED]** Sentry-style telemetry in [`ErrorBoundary.tsx`](../frontend/src/components/ErrorBoundary.tsx) and global fetch wrapper; surface top errors in admin dashboard.
- [ ] **[MED]** Self-healing flows: when a known-bad LLM is configured, auto-fall-back to a working one with a banner.
- [ ] **[MED]** In-app "report this issue" modal capturing console + last 50 events.
- [ ] **[MED]** Global keyboard shortcuts (`g+t` Topics, `g+f` Feed, `?` for help overlay).
- [ ] **[LOW]** First-visit tour overlays for Topics, Feed, Newsletter.

## Done when

- Zero user-visible URLs / stack traces.
- Every async failure offers a retry.
- Offline banner shows within 1s of network drop.
- Rate-limit responses backoff and recover automatically.
- Mobile parity restored on Feed, Settings, Bulk.
- A single set of primitives (`<ErrorBanner />`, `<EmptyState />`, `<LoadingSkeleton />`) used everywhere.
