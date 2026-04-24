# Plan 002: Post Quality Engine — Post Types + Dimension Control

## Summary

Extends the existing 8-node DAG generation engine with three new controls:

1. **Post Types** — 7 structural templates from the content playbook, each with a `generationInstruction` embedding a named arc pattern (HOOK→CONTEXT→TAKE→CTA etc.)
2. **Dimension Weights** — 7 quality sliders (Emotions, Psychology, Persuasion, Copywriting, Storytelling, Typography, Vocabulary) that map to node importance overrides at generation time
3. **Generation Mode** — Author Voice (surgical edits, ≤10% word increase) vs. Creative Synthesis (full LLM freedom from research/news)

Plus a **Variant Comparison UI** showing metadata badges per variant (post type, hook type, arc type) and an LLM-generated `variant_rationale` explaining creative choices.

## Status

**Completed** — merged to `main` on 2026-04-24 via `feature/post-quality-engine`.

## Files

- [architecture.md](architecture.md) — Three-layer model, node→dimension mapping, pipeline diagrams
- [phases.md](phases.md) — Implementation breakdown (Parts 1–5)
- [acceptance-criteria.md](acceptance-criteria.md) — Verification tests
