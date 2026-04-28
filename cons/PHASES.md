# Phases at a glance

Six phases. Phase 1 is always first; the rest can be re-ordered based on what matters next (demo, retention, mobile launch). Each phase doc has its own stages with file paths and "Done when" criteria.

| # | Theme | Effort | Risk | Lead voice it pleases |
|---|---|---|---|---|
| 1 | [Quick Wins](phases/phase-1-quick-wins.md) | 1–2 d | Low | All four |
| 2 | [Feed Redesign](phases/phase-2-feed-redesign.md) | 3–4 d | Medium | UX + Stakeholder |
| 3 | [Publish Clarity](phases/phase-3-publish-clarity.md) | 3–5 d | Medium | User + PO |
| 4 | [Settings IA](phases/phase-4-settings-ia.md) | 3–4 d | Medium | UX + Stakeholder |
| 5 | [Editorial Polish (Newsletter + Bulk)](phases/phase-5-editorial-polish.md) | 4–6 d | Medium | Stakeholder + PO |
| 6 | [Cross-cutting Polish](phases/phase-6-cross-cutting.md) | 3–5 d | Low–Med | UX |

Total: ~17–26 working days.

## Dependency graph

```
Phase 1 ──┬─► Phase 3 (needs channel pill from Stage 1.2)
          ├─► Phase 2 (independent, but easier after status pills land)
          ├─► Phase 5 (independent)
          └─► Phase 4 ──► Phase 6 (a11y pass after IA is stable)
```

- **Phase 1 ships first** — independent of everything else.
- **Phase 3** depends on **Stage 1.2** (channel pill exists in the queue).
- **Phase 6** should run after **Phase 4** so a11y/labels aren't redone on the new settings page.
- **Phase 2** is the most user-visible — prioritize after Phase 1 if you have a demo coming up.
- **Phase 5** can be split: Newsletter polish first, Bulk later — they share no files.

## Stage numbering convention

`Stage <phase>.<index>` — e.g. `Stage 4.3` is Phase 4, Stage 3. Audit docs link directly to these IDs.

## Out of scope for this plan

- Backend / worker logic changes that aren't UX-driven.
- Design tokens / theme overhaul (assume current Tailwind setup).
- Internationalization.
- Data migrations.

If a stage requires worker changes (e.g. Stage 2.5 vote/clip-rate signal), it is flagged in the stage doc.
