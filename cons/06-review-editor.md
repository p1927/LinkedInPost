# 06. Review & Edit Workspace

> **Stakeholders:** every user. Highest-leverage page in the app.
> **Source files:** [`features/review/ReviewWorkspace.tsx`](../frontend/src/features/review/ReviewWorkspace.tsx), [`features/review/context/ReviewFlowContext.tsx`](../frontend/src/features/review/context/ReviewFlowContext.tsx), [`features/review/context/useReviewFlowActions.ts`](../frontend/src/features/review/context/useReviewFlowActions.ts), [`features/review/context/types.ts`](../frontend/src/features/review/context/types.ts), [`features/review-editor/screens/EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx), [`features/review-editor/components/EditorSidebar.tsx`](../frontend/src/features/review-editor/components/EditorSidebar.tsx), [`features/review-editor/components/LivePreviewSidebar.tsx`](../frontend/src/features/review-editor/components/LivePreviewSidebar.tsx), [`features/editor/DraftEditor.tsx`](../frontend/src/features/editor/DraftEditor.tsx), inline `ResizeHandle` in [`EditorScreen.tsx:24-29`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) (uses `react-resizable-panels`), [`features/variant/screens/VariantSelectionScreen.tsx`](../frontend/src/features/variant/screens/VariantSelectionScreen.tsx), [`features/variant/components/VariantCarousel.tsx`](../frontend/src/features/variant/components/VariantCarousel.tsx), [`features/review/components/ReviewDialogs.tsx`](../frontend/src/features/review/components/ReviewDialogs.tsx).
> **Pairs with:** [`audits/01-topics-and-publishing.md`](audits/01-topics-and-publishing.md) and [`phases/phase-3-publish-clarity.md`](phases/phase-3-publish-clarity.md), [`phase-6-cross-cutting.md`](phases/phase-6-cross-cutting.md).

## What this surface is

A two-step flow: **(1)** [`VariantSelectionScreen.tsx`](../frontend/src/features/variant/screens/VariantSelectionScreen.tsx) — carousel of 4 generated variants with metadata badges → **(2)** [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) — 60/40 split (left sidebar with 8 panels, right editor + version control). The user picks a variant, edits text, picks media, schedules, approves, publishes.

## Cons — 4 perspectives

### 👤 User
- Eight tabs on the sidebar (Generate / Images / Research / Rules / Templates / Context / Styling / Justification) — I don't know which to use first.
- The splitter is a thin vertical bar; I never realised I could drag it.
- Sliders for Emotions / Psychology / Persuasion have no tooltips — what does 0…100 mean?
- I'm shown three identical "Discard current editor changes?" dialogs for slightly different actions.
- I edit text, navigate away, lose changes — no autosave.
- "Save draft" / "Save edits" / "Approve" — three buttons that look similar but mean different things.
- The variant rationale text is muted italic — I never read it.

### 🎨 UX
- `[HIGH]` 60/40 sidebar/editor split inverts the user's actual focus (the draft).
- `[HIGH]` Tab overload + scrolling tab bar at narrow widths.
- `[HIGH]` Three identical "discard changes?" dialogs — no distinction between load-variant / go-back / switch-to-variant-selection in [`ReviewDialogs.tsx`](../frontend/src/features/review/components/ReviewDialogs.tsx).
- `[MED]` Variant metadata badges are 8px font, illegible.
- `[MED]` Inline `ResizeHandle` in [`EditorScreen.tsx:24-29`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) has no hover/focus state.
- `[MED]` No keyboard navigation on the carousel.
- `[MED]` Live preview hidden behind tabs in some channel modes (Gmail).

### 📦 Product Owner
- `[HIGH]` Version history exists but is buried in a tab — undo/redo missing.
- `[HIGH]` No autosave; navigating away loses draft.
- `[MED]` No A/B test setup ("publish variant 1 to 50%").
- `[MED]` No comparison mode for variants side-by-side.
- `[MED]` No "Apply changes from variant N to current draft" — destructive overwrite only.
- `[MED]` No content-review UI gating publish (pending vs ok vs flagged).

### 💼 Stakeholder
- `[HIGH]` Editor is the highest-leverage page; weak UX dilutes the AI advantage.
- `[MED]` Tab overload signals "complex enterprise tool"; brand wants "fast creator co-pilot".

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`EditorSidebar.tsx`](../frontend/src/features/review-editor/components/EditorSidebar.tsx) — collapse 8 tabs into 3 logical groups: **Compose** (Generate + Templates + Rules), **Visuals** (Images), **Research** (Research + Context + Styling + Justification). Use accordion within each group.
- [ ] **[HIGH]** [`EditorSidebar.tsx`](../frontend/src/features/review-editor/components/EditorSidebar.tsx) — every dimension slider gets a small `?` icon → tooltip ("Emotion: 0 = factual, 100 = visceral").
- [ ] **[HIGH]** [`ReviewDialogs.tsx`](../frontend/src/features/review/components/ReviewDialogs.tsx) — differentiate the three discard dialogs with explicit titles ("Switch variant?", "Go back?", "Pick a different variant?") and a checkbox "Don't show again".
- [ ] **[HIGH]** [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) — passive autosave (debounce 2s) writing to `localStorage` keyed by sheet row id; restore on mount.
- [ ] **[HIGH]** [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) — `beforeunload` warning when there are unsaved changes.
- [ ] **[MED]** [`VariantCarousel.tsx`](../frontend/src/features/variant/components/VariantCarousel.tsx) — bump metadata badge font to 11px and explain (Hook = opening line, Arc = structure) with a tooltip.
- [ ] **[MED]** Inline `ResizeHandle` in [`EditorScreen.tsx:24-29`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) — hover + focus styles; ARIA `role="separator"` with arrow-key support. (Wraps `react-resizable-panels`'s `Separator`.)

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Flip the desktop split: editor 60-65% (left), live preview 35-40% (right). Sidebar groups become a collapsible 280px secondary rail. File: [`EditorScreen.tsx`](../frontend/src/features/review-editor/screens/EditorScreen.tsx) layout block.
- [ ] **[MED]** Promote Version Control out of a tab — make it a "↶ Versions" button on the editor toolbar that opens a side drawer.
- [ ] **[MED]** Variant compare view: open [`VariantCarousel.tsx`](../frontend/src/features/variant/components/VariantCarousel.tsx) in 2-up grid with diff highlighting.
- [ ] **[MED]** Replace [`DraftEditor.tsx`](../frontend/src/features/editor/DraftEditor.tsx) selection-scoped edits UX with explicit "Edit selection" / "Edit whole post" toggle in the toolbar.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[MED]** Inline AI suggestions (Grammarly-style) for hook strength, length, readability.
- [ ] **[MED]** A/B publish variants natively (split LinkedIn audience or post over time).
- [ ] **[MED]** Content review gating: block publish on flagged content, surface flag reason inline.
- [ ] **[LOW]** Editor-level real-time collaboration (later phase, gated by demand).

## Done when

- Sidebar has ≤3 collapsible groups.
- Every slider has a tooltip; metadata badges are legible.
- Discard dialogs are uniquely worded.
- Autosave never loses an edit > 2s old.
- Editor area is the largest pane on desktop.
- Versions are reachable from the editor toolbar without switching tabs.
