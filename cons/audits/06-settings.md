# Settings

A monolithic 800-line drawer with 15 sections in one scrollable column. There is no dedicated settings page — settings open as a drawer over the dashboard.

## Role Cons

- **UX:** Single 1000-px scroll; no IA grouping; no search; no URL deep-link to a section; no dirty-state guard; six channel sections repeat the same OAuth + token + recipient pattern.
- **PO:** Hard for users to onboard themselves. Support load. No way to share a URL like "go to /settings/llm and pick a model."
- **Stakeholder:** Doesn't match category-leader expectations (Slack / Notion / Linear all have left-nav settings pages).
- **User:** Where is image generation? I'll scroll forever. I can't bookmark anything. If I close the drawer accidentally, I lose my place.

## Files of Record

- [`frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx`](../../frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx) — main drawer (~800 lines)
- [`frontend/src/components/dashboard/components/DashboardSettingsDrawer.types.ts`](../../frontend/src/components/dashboard/components/DashboardSettingsDrawer.types.ts) — section IDs

## Concrete Issues

1. **[HIGH]** Convert from drawer to a dedicated `/settings` page with left sidebar nav, grouped: General • AI • Channels • Content • Integrations.
2. **[HIGH]** URL-addressable subpaths (`/settings/llm`, `/settings/channels/linkedin`, …) so sections are bookmarkable and shareable.
3. **[HIGH]** No `Cmd-K` settings search — add fuzzy search across section titles + field labels.
4. **[HIGH]** No "unsaved changes" guard — add dirty-state warning + autosave toast.
5. **[MED]** Six channel sections repeat the same OAuth/token/recipient pattern — extract `<ChannelSettingsCard />`.
6. **[MED]** No connection health indicator — show green/yellow/red dot per channel in nav.
7. **[LOW]** No "reset to default" per section.
8. **[LOW]** No validation indicator (e.g. "API key invalid" in red).

## Linked Phase

- **Stages 4.1, 4.2, 4.3, 4.4, 4.5, 4.6** (Phase 4 — Settings IA)
