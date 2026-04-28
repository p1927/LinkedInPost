# Phase 6 — Cross-cutting Polish

## Goal

Consistency, mobile parity, accessibility, and onboarding nudges. Cheap-per-stage, high cumulative impact.

**Order:** Run after Phase 4 so the a11y pass covers the new settings page in one go.

## Stages

### Stage 6.1 — Standardise UI primitives
- **Files (new):** `frontend/src/components/ui/EmptyState.tsx`, `frontend/src/components/ui/ErrorBanner.tsx`, `frontend/src/components/ui/LoadingSkeleton.tsx`
- **Files (replace usage):** all ad-hoc empty/loading/error implementations across `frontend/src/features/*`
- **Change:** Adopt three primitives. `<EmptyState title actionLabel onAction helper />`, `<ErrorBanner message onRetry />`, `<LoadingSkeleton variant=card|list|line count />`. Replace ad-hoc usage repo-wide via grep + edit.
- **Done when:** Grep for `text-gray-500.*No.*yet` or similar ad-hoc patterns returns no UX strings.
- **Risk:** medium (broad touch)

### Stage 6.2 — Mobile parity sweep
- **Files:** [`FeedPage.tsx`](../../frontend/src/features/feed/FeedPage.tsx) (right rail), [`SettingsPage.tsx`](../../frontend/src/features/settings/SettingsPage.tsx) (left nav collapses to drawer on mobile), [`CampaignPage.tsx`](../../frontend/src/features/campaign/CampaignPage.tsx) (bulk table horizontal scroll)
- **Change:** For each surface, verify behavior at iPhone-13 viewport (390×844) and tablet (768×1024). Fix overflows, hidden panels, unreachable actions.
- **Done when:** Manual pass on three viewports (phone, tablet, desktop) shows all primary actions reachable.
- **Risk:** low

### Stage 6.3 — Accessibility pass
- **Files:** All icon-only buttons across the app (clip, vote, edit, close, …)
- **Change:** Add `aria-label` to every icon button; ensure focus rings visible on all interactive elements; run a contrast audit (target WCAG AA) and fix offenders. Add skip-to-content link in app shell.
- **Done when:** Lighthouse accessibility score ≥95 on Topics, Feed, Settings, Newsletter pages.
- **Risk:** low

### Stage 6.4 — Global keyboard shortcuts
- **Files (new):** `frontend/src/hooks/useGlobalShortcuts.ts`, `frontend/src/components/HelpOverlay.tsx`
- **Files (touch):** `App.tsx` to mount the hook
- **Change:** `g+t` → /topics, `g+f` → /feed, `g+n` → /campaign?tab=newsletter, `g+s` → /settings, `?` → help overlay listing shortcuts. Disable inside text inputs.
- **Done when:** Pressing the listed combos navigates; `?` shows the overlay.
- **Risk:** low

### Stage 6.5 — First-visit tour overlays
- **Files (new):** `frontend/src/components/Tour.tsx`, per-surface tour configs
- **Files (touch):** Topics, Feed, Newsletter entry components
- **Change:** Lightweight popover-based tour (3–5 steps each) shown once per user (persist dismissal in localStorage + user prefs). Trigger from Stage 3.6's empty-state CTA as well.
- **Done when:** First visit to each surface shows the tour; second visit doesn't.
- **Risk:** low–medium

### Stage 6.6 — Top-nav simplification
- **Files:** `frontend/src/App.tsx` and the workspace shell / sidebar component
- **Change:** Collapse Automations + Admin into a "More" menu so the primary nav highlights the user-facing surfaces (Topics, Feed, Campaign, Settings).
- **Done when:** Primary nav has ≤5 items; secondary lives under "More".
- **Risk:** low
