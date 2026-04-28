# Phase 4 — Settings IA

## Goal

Replace the 800-line monolithic drawer with a real `/settings` page that has left-nav grouping, URL routing, search, and dirty-state safety.

## Stages

### Stage 4.1 — `/settings` page shell with left nav + URL routing
- **Files (new):** `frontend/src/features/settings/SettingsPage.tsx`, `frontend/src/features/settings/SettingsNav.tsx`
- **Files (touch):** [`frontend/src/App.tsx`](../../frontend/src/App.tsx) — add `/settings/*` routes
- **Change:** Page shell with left nav (groups: General • AI • Channels • Content • Integrations) and a nested router. Each section is a route (`/settings/llm`, `/settings/channels/:channel`, …).
- **Done when:** Visiting `/settings` shows the new page; nav links update the URL; deep-linking works.
- **Risk:** medium

### Stage 4.2 — Migrate sections out of the drawer
- **Files:** [`DashboardSettingsDrawer.tsx`](../../frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx) (delete sections incrementally) + per-route components under `frontend/src/features/settings/sections/*`
- **Change:** Move each of the 15 sections from the drawer into its own route component. Keep the drawer alive behind a feature flag during migration so nothing breaks.
- **Done when:** All 15 sections render at their `/settings/...` route; drawer is reduced to a stub or deleted.
- **Risk:** medium (touches many sections; do incrementally)

### Stage 4.3 — Extract `<ChannelSettingsCard />`
- **Files (new):** `frontend/src/features/settings/sections/channels/ChannelSettingsCard.tsx`
- **Files (replace usage):** the 6 channel sections (linkedin, instagram, telegram, whatsapp, gmail, youtube)
- **Change:** One component for the repeating OAuth + token + recipient + connection-status pattern. Each channel route becomes a 5-line wrapper.
- **Done when:** Channel-specific code shrinks to per-channel config (icons, OAuth URL, recipient kind); core flow is one component.
- **Risk:** low–medium

### Stage 4.4 — `Cmd-K` settings search
- **Files (new):** `frontend/src/features/settings/SettingsCommandPalette.tsx`
- **Files (touch):** `SettingsPage.tsx`
- **Change:** Press `Cmd-K` (or `/`) to open a fuzzy-searchable palette over section titles + field labels. Selecting jumps to the section route + scrolls to the field.
- **Done when:** Cmd-K finds any field by name within ~50ms; jump highlights the field.
- **Risk:** low

### Stage 4.5 — Dirty-state guard + autosave toast
- **Files:** `SettingsPage.tsx` + per-section forms
- **Change:** Track per-section dirty state. On route change with unsaved edits, prompt "Discard changes?". On save, show toast "Saved" with section name. Optionally autosave on blur for non-secret fields.
- **Done when:** User cannot lose changes silently; saved state is visible.
- **Risk:** low

### Stage 4.6 — Connection health dots
- **Files:** `SettingsNav.tsx`, channel section components
- **Change:** Each channel item in the left nav shows a green/yellow/red dot based on its OAuth/token health. Click to jump to that channel.
- **Done when:** A broken channel is visible at a glance from the left nav; click opens it.
- **Risk:** low (assumes worker exposes a health endpoint; if not, add a small one)
