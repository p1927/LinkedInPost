# Setup Wizard

Eleven steps, animated transitions, runs install commands with live logs. Functionally solid, but step labels are jargon, there's no progress indicator, and the env-vars step is a wall of key/value inputs.

## Role Cons

- **UX:** No "Step N of 11" indicator; step labels too terse ("trending", "stt", "imagegen"); no Back button between most steps; env-vars step lacks per-row docs/examples.
- **PO:** Time-to-first-value is the entire onboarding bet. 11 steps with no progress feels like a quit-point.
- **Stakeholder:** Demos badly because the labels look like internal env keys.
- **User:** Where am I in the process? What does "stt" mean? Why are there so many steps?

## Files of Record

- [`frontend/src/features/setup-wizard/SetupWizard.tsx`](../../frontend/src/features/setup-wizard/SetupWizard.tsx)
- [`frontend/src/features/onboarding/ConnectAccountsGrid.tsx`](../../frontend/src/features/onboarding/ConnectAccountsGrid.tsx)

## Concrete Issues

1. **[HIGH]** No "Step N of 11" indicator — add a sticky progress bar + step list at the top.
2. **[HIGH]** Step labels too terse — rename: "trending" → "Trending sources", "stt" → "Voice transcription", "imagegen" → "Image generation".
3. **[HIGH]** EnvVarsStep dumps a flat key-value form — group by purpose, show example value per row, link to docs.
4. **[HIGH]** No Back button between most steps — add Back/Next nav with safe state preservation.
5. **[MED]** Consolidate "trending" + "imagegen" + "stt" into one "AI Providers" step with collapsible groups (reduces 11 → 9 steps).
6. **[MED]** First step "deploymentMode" — explain consequences with side-by-side card comparison (SaaS vs Self-Hosted).
7. **[LOW]** Live install logs — add a "copy logs" button for support.

## Linked Phase

- **Stage 1.6** (Phase 1 — progress bar + Back button)
- Phase 6 picks up label clarity in the wider a11y/copy pass.
