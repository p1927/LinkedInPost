# Cross-cutting

Issues that touch multiple surfaces. These are usually the cheapest to fix and the most visible (because they appear everywhere).

## Role Cons

- **UX:** Empty/loading/error states are inconsistent in tone, length, and styling; mobile parity broken in Feed (right rail), Settings (drawer), Bulk (table); no a11y labels on icon-only buttons; no keyboard shortcuts.
- **PO:** Without onboarding nudges, new users don't know about Feed, Newsletter, or Bulk — they sit on Topics and bounce.
- **Stakeholder:** Inconsistency = looks unfinished. A single set of primitives (`<ErrorBanner />`, `<EmptyState />`, `<LoadingSkeleton />`) lifts perceived quality cheaply.
- **User:** Toasts disappear before I can read them; on phone, half the app is missing; there's no shortcut to jump between sections.

## Files of Record

Cross-cutting — touches every feature. Notable hot spots:
- [`frontend/src/App.tsx`](../../frontend/src/App.tsx) — top-level routes & nav
- All `Empty*`, `Loading*`, `Error*` components scattered through `frontend/src/features/`
- [`frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx`](../../frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx) — mobile drawer height
- [`frontend/src/features/feed/FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx) — mobile right-rail visibility
- [`frontend/src/features/campaign/CampaignPage.tsx`](../../frontend/src/features/campaign/CampaignPage.tsx) — table overflow

## Concrete Issues

1. **[HIGH]** Empty states wordy and inconsistent — adopt one tone (concise + 1 primary CTA + optional learn-more).
2. **[HIGH]** Loading skeletons exist on initial load only — add for paginated/append cases everywhere.
3. **[HIGH]** Error toasts disappear too fast / no retry CTA — standardise to `<ErrorBanner retry />`.
4. **[HIGH]** Mobile parity broken: Feed right rail hidden, Settings drawer overflows, Bulk table doesn't scroll horizontally.
5. **[MED]** No global keyboard shortcuts — add `g+t` Topics, `g+f` Feed, `?` for help overlay.
6. **[MED]** Accessibility — labels on all icon-only buttons (clip, vote, edit, close), focus rings on interactive elements, color-contrast pass.
7. **[MED]** Top-nav doesn't reflect what new users need — collapse less-used routes (Automations, Admin) into a "More" menu.
8. **[MED]** No first-visit tour overlays — add one-time guides for Topics, Feed, Newsletter.

## Linked Phase

- **Stages 6.1, 6.2, 6.3, 6.4, 6.5, 6.6** (Phase 6 — Cross-cutting Polish)
- **Stage 1.5** (Phase 1 — empty-state cleanup pass)
