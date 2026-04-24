# Acceptance Criteria

1. **Mode 1 (Author Voice)**: Create a topic with a manual author note. Generate. Enhanced draft preserves ≥80% of original words while scoring higher on selected dimensions.

2. **Mode 2 (Creative Synthesis)**: Create a topic from news research. Select "Industry Trend" post type, set Persuasion slider to Max. Generated post follows HOOK→EVIDENCE→SHIFT→WHY NOW→IMPLICATION→CTA structure.

3. **Dimension override**: Set workspace default Emotions=50, then set per-post Emotions=90. Per-post value wins.

4. **Variant diff**: Generate 4 variants. Each has a distinct `variant_rationale`. Metadata badges appear on each card.

5. **TypeScript**: `tsc --noEmit` passes in both `worker/` and `frontend/`. ✅ Verified on merge.
