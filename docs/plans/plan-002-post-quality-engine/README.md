# Plan 002: Post Quality Engine — Post Types + Dimension Control

## Summary

Extends the existing 8-node DAG generation engine with three new controls:

1. **Post Types** — 8 structural templates from the content playbook, each with a `generationInstruction` embedding a named arc pattern (HOOK→CONTEXT→TAKE→CTA etc.)
2. **Dimension Weights** — 7 quality sliders (Emotions, Psychology, Persuasion, Copywriting, Storytelling, Typography, Vocabulary) that map to node importance overrides at generation time
3. **Generation Mode** — Author Voice (surgical edits, ≤10% word increase) vs. Creative Synthesis (full LLM freedom from research/news)

Plus a **Variant Comparison UI** showing metadata badges per variant (post type, hook type, arc type) and an LLM-generated `variant_rationale` explaining creative choices.

## Status

**Completed** — merged to `main` on 2026-04-24 via `feature/post-quality-engine`.

## Post Types Playbook

The engine exposes **8 structural post types** as workflows, each embedding a named arc pattern (e.g. HOOK→CONTEXT→TAKE→CTA) in its `generationInstruction`:

| Post Type | File | Arc Pattern |
|-----------|------|-------------|
| `informational-news` | `worker/src/engine/workflows/definitions/informational-news.ts` | News hook → facts → insight → CTA |
| `personal-story` | `worker/src/engine/workflows/definitions/personal-story.ts` | Story hook → journey → lesson → CTA |
| `week-in-review` | `worker/src/engine/workflows/definitions/week-in-review.ts` | Week context → highlights → reflection → CTA |
| `event-insight` | `worker/src/engine/workflows/definitions/event-insight.ts` | Event hook → context → takeaway → CTA |
| `trend-commentary` | `worker/src/engine/workflows/definitions/trend-commentary.ts` | Trend hook → data → opinion → CTA |
| `satirical` | `worker/src/engine/workflows/definitions/satirical.ts` | Hook → absurd comparison → ironic CTA |
| `appreciation` | `worker/src/engine/workflows/definitions/appreciation.ts` | Hook → specific detail → recognition → CTA |
| `newsletter-realtime-preview` | `worker/src/engine/workflows/definitions/newsletter-realtime-preview.ts` | Subject Line → Opening Hook → Issue Context → Article Previews → Voice Sample → Close → CTA |

These types are selectable in the frontend `GenerationPanel.tsx` and drive the `effectiveWorkflowId` in the workflow executor.

## Files

- [architecture.md](architecture.md) — Three-layer model, node→dimension mapping, pipeline diagrams
- [phases.md](phases.md) — Implementation breakdown (Parts 1–5)
- [acceptance-criteria.md](acceptance-criteria.md) — Verification tests
