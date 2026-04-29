# 09. Settings & Connections

> **Stakeholders:** every user (during onboarding); admins (during ops). #1 churn signal in B2B SaaS.
> **Source files:** [`components/dashboard/components/DashboardSettingsDrawer.tsx`](../frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx) (~800 lines, 142 props), [`components/dashboard/components/DashboardSettingsDrawer.types.ts`](../frontend/src/components/dashboard/components/DashboardSettingsDrawer.types.ts), [`components/dashboard/hooks/useDashboardQueue.ts`](../frontend/src/components/dashboard/hooks/useDashboardQueue.ts), [`features/setup-wizard/SetupWizard.tsx`](../frontend/src/features/setup-wizard/SetupWizard.tsx), [`features/onboarding/ConnectAccountsGrid.tsx`](../frontend/src/features/onboarding/ConnectAccountsGrid.tsx), OAuth handlers under [`worker/src/integrations/`](../worker/src/integrations/).
> **Tests:** [`tests/e2e/journeys/07-connections-setup.spec.ts`](../frontend/tests/e2e/journeys/07-connections-setup.spec.ts).
> **Pairs with:** [`audits/06-settings.md`](audits/06-settings.md), [`audits/07-setup-wizard.md`](audits/07-setup-wizard.md), and [`phases/phase-4-settings-ia.md`](phases/phase-4-settings-ia.md).

## What this surface is

Admin-only drawer ([`DashboardSettingsDrawer.tsx`](../frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx)) with collapsible sections: Spreadsheet & Workflows, Channel delivery (LI/IG/TG/WA/Gmail), AI / LLM config (primary + per-skill), News Research, Image Gen, Enrichment Skills, Email defaults. Plus an 11-step [`SetupWizard.tsx`](../frontend/src/features/setup-wizard/SetupWizard.tsx) for initial config and [`ConnectAccountsGrid.tsx`](../frontend/src/features/onboarding/ConnectAccountsGrid.tsx) for OAuth.

## Cons — 4 perspectives

### 👤 User
- I open Settings and see 14+ groups with no descriptions; I close it.
- I enter a bot token and there's no "Test connection" — I have to publish a fake post to know if it worked.
- Enrichment toggles are 10 unlabeled switches; I have no idea what each does.
- LLM picker scattered across "primary" and per-skill overrides in different sections.
- After saving I have no diff of what changed.
- Setup wizard has 11 steps with no "Step N of 11" indicator. Step labels are jargon ("trending", "stt", "imagegen").
- Where is image generation? I'll scroll forever. I can't bookmark anything.

### 🎨 UX
- `[HIGH]` 800-line single scroll; no IA grouping; no search; no URL deep-link to a section.
- `[HIGH]` 142 props on one component — implementation bleeding into UX as low cohesion.
- `[HIGH]` No dirty-state guard — closing the drawer accidentally loses your place.
- `[HIGH]` Six channel sections repeat the same OAuth + token + recipient pattern — extract `<ChannelSettingsCard />`.
- `[MED]` Free-form text fields with zero validation (Telegram chat ID, email).
- `[MED]` Connection status indicators inconsistent (some sections show, some don't).
- `[MED]` Email defaults disconnected from the Gmail connection card.
- `[MED]` Setup wizard env-vars step dumps a flat key-value form — group by purpose, show example value per row.
- `[MED]` No Back button between most setup-wizard steps.

### 📦 Product Owner
- `[HIGH]` Hard for users to onboard themselves. Support load.
- `[HIGH]` No way to share a URL like "go to /settings/llm and pick a model."
- `[HIGH]` No `Cmd-K` settings search.
- `[MED]` Time-to-first-value is the entire onboarding bet. 11 steps with no progress feels like a quit-point.
- `[MED]` No settings import/export (onboarding new workspaces is painful).
- `[MED]` No "restore defaults" affordance.
- `[MED]` No connection health indicator — green/yellow/red dot per channel in nav.

### 💼 Stakeholder
- `[HIGH]` Doesn't match category-leader expectations (Slack / Notion / Linear all have left-nav settings pages).
- `[HIGH]` Configuration friction is the #1 churn signal in B2B SaaS — Settings UX is a strategic priority.
- `[HIGH]` Wrong LLM key burned tokens silently → cost incident risk.
- `[MED]` Demos badly because the labels look like internal env keys.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`DashboardSettingsDrawer.tsx`](../frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx) — add a one-line description under every section header explaining what it does and who needs it.
- [ ] **[HIGH]** Every text input that's a credential gets an inline `Test connection` button calling a dedicated endpoint (extend backend per integration).
- [ ] **[HIGH]** Enrichment skill toggles — add `?` tooltips pulled from [`features/generation/nodeProgressLabels.ts`](../frontend/src/features/generation/nodeProgressLabels.ts) descriptions or a new `enrichmentSkillDescriptions.ts`.
- [ ] **[HIGH]** Add a sticky table-of-contents on the left side of the drawer linking to each section.
- [ ] **[HIGH]** Setup wizard — add sticky "Step N of 11" progress bar + step list at the top.
- [ ] **[HIGH]** Setup wizard step labels rename: "trending" → "Trending sources", "stt" → "Voice transcription", "imagegen" → "Image generation".
- [ ] **[HIGH]** Setup wizard — add Back button between every step with safe state preservation.
- [ ] **[MED]** On save, show a diff toast: "Updated: Telegram bot token, Primary LLM (gpt-4 → claude-sonnet-4-6)".
- [ ] **[MED]** Inline validation: Telegram chat ID `^-?\d+$`, email `^.+@.+\..+$`, model id presence in the integrated catalog list.
- [ ] **[MED]** Add unsaved-changes guard + autosave toast.
- [ ] **[MED]** EnvVarsStep — group by purpose, show example value per row, link to docs.
- [ ] **[MED]** First step "deploymentMode" — explain consequences with side-by-side card comparison (SaaS vs Self-Hosted).

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Convert from drawer to a dedicated `/settings` page with left sidebar nav, grouped: General • AI • Channels • Content • Integrations.
- [ ] **[HIGH]** URL-addressable subpaths (`/settings/llm`, `/settings/channels/linkedin`, …) so sections are bookmarkable and shareable.
- [ ] **[HIGH]** `Cmd-K` settings search — fuzzy search across section titles + field labels.
- [ ] **[HIGH]** Refactor [`DashboardSettingsDrawer.tsx`](../frontend/src/components/dashboard/components/DashboardSettingsDrawer.tsx) into one component per section under `frontend/src/features/settings/` (e.g., `ChannelsSection.tsx`, `LLMSection.tsx`, `EnrichmentSection.tsx`). Acceptance: top-level component <40 props, each section component fetches its own data via dedicated hook.
- [ ] **[MED]** Extract `<ChannelSettingsCard />` shared by all 6 channel sections.
- [ ] **[MED]** Move email defaults into the Gmail channel card, not a separate group.
- [ ] **[MED]** Add Connection Health page summarising status of every integration with last error and retry. Link from sidebar.
- [ ] **[MED]** Consolidate "trending" + "imagegen" + "stt" into one "AI Providers" step with collapsible groups (reduces 11 → 9 steps).

### Phase 3 — Strategic (6-12 wk)
- [ ] **[MED]** Settings import/export as JSON (with secret redaction).
- [ ] **[MED]** Per-environment overrides (dev / staging / prod) toggle.
- [ ] **[MED]** Audit log of setting changes with who/when/what.
- [ ] **[LOW]** Workspace templates: "New workspace from template X" preconfigures sensible defaults.
- [ ] **[LOW]** Setup wizard — "copy logs" button on live install logs.

## Done when

- Drawer's top component drops below 40 props.
- Every credential input has Test connection.
- Every enrichment toggle has a description.
- Save shows a human-readable diff.
- Connection Health page exists and is the first stop for "is X working?".
- `/settings/<subpath>` URLs work and are shareable.
- Setup wizard shows a progress indicator and Back button on every step.
