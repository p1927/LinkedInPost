# 01. Information Architecture

> **Stakeholders:** all users. Affects every other surface.
> **Source files:** [`frontend/src/App.tsx`](../frontend/src/App.tsx), [`frontend/src/components/workspace/AppSidebar.tsx`](../frontend/src/components/workspace/AppSidebar.tsx), [`frontend/src/components/workspace/WorkspaceHeader.tsx`](../frontend/src/components/workspace/WorkspaceHeader.tsx), [`frontend/src/components/workspace/WorkspaceShell.tsx`](../frontend/src/components/workspace/WorkspaceShell.tsx).
> **Pairs with:** [`audits/09-cross-cutting.md`](audits/09-cross-cutting.md) and [`phases/phase-6-cross-cutting.md`](phases/phase-6-cross-cutting.md).

## What this surface is

The app shell — sidebar, header, routing — that frames every page. Routes today: `/topics`, `/topics/new`, `/topics/:id`, `/topics/:id/editor/:slot`, `/feed`, `/settings`, `/rules`, `/campaign`, `/connections`, `/enrichment`, `/usage`, `/automations`, `/setup`, `/admin`.

## Cons — 4 perspectives

### 👤 User
- I land on `/topics` and don't know which item is "next to act on" — no priority/badging.
- After deep-linking into the editor I have no breadcrumb or "back to topics" affordance.
- The sidebar shows 14 items including admin-only ones I can't see explained.
- No global search; finding a topic by title means scrolling.
- Switching between Feed and a draft loses my scroll position both ways.

### 🎨 UX
- `[MED]` Sidebar collapse state persists in localStorage but the toggle target is small and unlabelled.
- `[MED]` Skip-to-content link exists but no other landmark roles for screen readers.
- `[MED]` Header right side mixes Setup + Admin + Usage with no visual grouping.
- `[MED]` Mobile: sidebar overlay has no scrim dismiss.
- `[MED]` No active-state indication when on `/topics/:id` vs `/topics`.

### 📦 Product Owner
- `[HIGH]` 14 routes, 0 grouping. Section headers ("Plan / Make / Ship / Configure") would reduce mis-clicks.
- `[HIGH]` No "recently viewed" — high-value retention signal missing.
- `[MED]` Connections + Settings + Setup overlap conceptually; users don't know which to open.
- `[MED]` No global help / what's new / changelog surface.
- `[MED]` Deep-link sharing untested (e.g., share a draft URL with a teammate).

### 💼 Stakeholder
- `[MED]` Discoverability of premium features (enrichment, automations) is buried in the rail.
- `[MED]` Support cost: inbound "where do I find X" requests likely high.
- `[MED]` Brand perception: feels like an admin tool rather than a creator product.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`AppSidebar.tsx`](../frontend/src/components/workspace/AppSidebar.tsx) — group routes under headers: **Plan** (Topics, Feed, Campaign), **Make** (Editor entry), **Ship** (Newsletter, Automations), **Configure** (Connections, Settings, Rules), **Admin** (Setup, Admin, Enrichment, Usage). Acceptance: visible labels above each group; collapsed view shows only icons but icons retain ARIA labels.
- [ ] **[HIGH]** [`WorkspaceHeader.tsx`](../frontend/src/components/workspace/WorkspaceHeader.tsx) — add a static breadcrumb derived from `useLocation()` (`Topics / <topic title> / Editor`). Acceptance: breadcrumb shows on `/topics/:id*`.
- [ ] **[MED]** [`WorkspaceHeader.tsx`](../frontend/src/components/workspace/WorkspaceHeader.tsx) — add a `?` help button opening a static modal with the 5 most common workflows.
- [ ] **[MED]** [`AppSidebar.tsx`](../frontend/src/components/workspace/AppSidebar.tsx) — add a 28px search input above the topics group filtering routes + topic titles.

### Phase 2 — Structural (3-6 wk)
- [ ] **[MED]** Introduce `useRouteContext()` hook returning `{section, primaryEntity, breadcrumbs}` and have `WorkspaceHeader` and page titles consume it.
- [ ] **[MED]** Add `RecentlyViewed` localStorage list (last 8 topics) shown in sidebar under Plan.
- [ ] **[MED]** Replace the mobile sidebar overlay with a `Drawer` component that supports scrim-tap dismiss.
- [ ] **[HIGH]** Audit deep links: every entity page (`/topics/:id`, `/topics/:id/editor/:slot`) must render correctly on hard refresh and survive auth bounce.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[MED]** Command palette (`cmd+k`) for jumping to any topic, route, or setting. Reuse the search index from Phase 1.
- [ ] **[MED]** Per-user route permissions via a `<RouteGuard role="admin">` wrapper instead of inline conditionals in `AppSidebar`.
- [ ] **[LOW]** Section landing pages (e.g., `/configure` summary page) instead of dropping users into Connections by default.

## Done when

- Every page has a breadcrumb back to its parent section.
- Sidebar groups exist; mis-click rate drops on next user-test round.
- Search-from-sidebar finds any topic in ≤2 keystrokes.
- Hard-refresh on `/topics/:id/editor/:slot` works for an authenticated user.
- WCAG AA passes on the app shell.
