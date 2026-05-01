---
title: Editor Generation Workflow — UX Contract
description: Stable behavior contract for all user actions in the editor generation workflow
author: Claude
ms.date: 2026-05-01
ms.topic: reference
keywords:
  - UX contract
  - action semantics
  - state separation
  - persistence
---

## Overview

This document defines the stable UX contract for the editor generation workflow.
It was created as Phase 1 of the editor-generation-workflow plan to lock behavior
before implementing new features.

---

## Action Semantics

### Generate 4 Variants

**Trigger:** User clicks "4 Variants" in the GenerationPanel.

**Behavior:**
1. Captures current `editorText` and `selection` (or whole post if no selection)
2. Shows `loadingAction: 'variants'` state (button shows "Generating…")
3. Calls `onGenerateVariants(GenerationRequest)` with instruction + scope
4. On success: sets `variantsPreview` with 4 `VariantPreviewResult` items
5. On failure: clears `variantsPreview`, shows error toast
6. **Never persists to Sheets automatically**

**State changes:**
- `generationLoading` → `'variants'`
- `variantsPreview` → response.variants (or null on failure)
- `editorDirty` unchanged

---

### Quick Change

**Trigger:** User clicks "Quick Change" in the GenerationPanel.

**Behavior:**
1. Captures current `editorText` and `selection` (or whole post if no selection)
2. Shows `loadingAction: 'quick-change'` state
3. Calls `onGenerateQuickChange(GenerationRequest)`
4. On success: sets `quickChangePreview` with `QuickChangePreviewResult`
5. On failure: clears `quickChangePreview`, shows error toast
6. **Never persists to Sheets automatically**

**State changes:**
- `generationLoading` → `'quick-change'`
- `quickChangePreview` → response (or null on failure)
- `editorDirty` unchanged

---

### Apply to Editor (Quick Change)

**Trigger:** User clicks "Review changes" on a quick change preview, then confirms.

**Behavior:**
1. Opens `CompareDialog` showing current vs proposed
2. On `onConfirm`: replaces editor content
3. **Never writes to Sheets**

**State changes:**
- `compareState` → `{ currentText, proposedText, resultingText, ... }`
- On confirm: `editorText` → `resultingText`, `editorDirty` → `true`
- `quickChangePreview` → null (preview consumed)

---

### Apply Variant

**Trigger:** User clicks "Review changes" on a variant, then confirms.

**Behavior:**
1. Opens `CompareDialog` for the variant
2. On `onConfirm`: replaces editor content with variant's fullText
3. **Never writes to Sheets**

**State changes:**
- `compareState` → configured for variant
- On confirm: `editorText` → variant.fullText, `editorDirty` → `true`
- `variantsPreview` unchanged (variant not consumed until explicit apply)

---

### Save Variants

**Trigger:** User clicks "Save" on a specific variant slot.

**Behavior:**
1. Shows `previewVariantSaveByIndex[index]` → `'saving'`
2. Calls `onSaveVariants(row, variants, previewSelection)`
3. On success: `previewVariantSaveByIndex[index]` → `'saved'` after 2s
4. On failure: `previewVariantSaveByIndex[index]` → `'error'`, `previewVariantSaveErrors[index]` → error message
5. **Does NOT affect editor content or approval eligibility**

**State changes:**
- `previewVariantSaveByIndex[index]` → `'saving'` | `'saved'` | `'error'`
- `previewVariantSaveErrors[index]` → error string (on failure)
- Sheets row updated with variant text

---

### Approve

**Trigger:** User clicks "Approve" in the review flow.

**Behavior:**
1. Saves the current `editorText` to Sheets as the approved version
2. Does NOT require `Save Variants` to have succeeded
3. Approval and variant persistence are independent

**State changes:**
- Sheets row's approved text → `editorText`
- Approval proceeds even if `variantsPreview` save failed

---

## State Separation

### Sheet Draft State (Persisted)

The last canonical draft content saved in Google Sheets.
Accessible via `row.*` fields in `ReviewWorkspace`.

**Who updates:** "Approve" action, explicit save operations.
**Who reads:** `reviewPhase = 'pick-variant'` shows variants derived from Sheets.

### Editor Working State (In-Memory)

The current content being edited locally in the review surface.
Tracked as `editorText` in `ReviewFlowEditorContextValue`.

**Who updates:** User typing, "Apply to Editor" actions, "Apply Variant" actions.
**Who reads:** GenerationPanel (for building generation requests).

**Dirty flag:** `editorDirty` is `true` when editor has unsaved changes vs Sheets.

### Generation Preview State (Transient)

AI output that has not been applied or persisted.
Tracked as `quickChangePreview` and `variantsPreview`.

**Who updates:** `handleGenerateQuickChange`, `handleGenerateVariants`.
**Who reads:** GenerationPanel (for displaying previews).

**Persistence:** NONE. Preview is cleared on apply, cancel, or navigation.

---

## Selection Scope Behavior

### `GenerationScope = 'selection'`

- `selection` is non-null with `start` and `end` indices
- Generation operates on `editorText.substring(selection.start, selection.end)`
- Compare/apply targets only the selected passage

### `GenerationScope = 'post'`

- `selection` is null
- Generation operates on full `editorText`
- Compare/apply targets the entire post

### Scope Indicator

`effectiveScope` is computed from `scope` prop and `selection` value.
The active target is always visible in the UI via the scope indicator.

---

## Failure Behavior

### Generation Failure

- `quickChangePreview` or `variantsPreview` set to `null`
- `generationLoading` → `null`
- Error toast shown to user
- Preview state is clean (no stale previews)

### Compare Cancelled

- `compareState` → `null`
- Editor content unchanged
- Preview consumed? NO — preview remains available

### Save Variants Failed

- `previewVariantSaveByIndex[index]` → `'error'`
- `previewVariantSaveErrors[index]` → error message
- Preview results remain visible
- `onSavePreviewVariant(index)` remains available for retry
- **Approval remains available** even if Save Variants failed

### Approval Save Failed

- Error shown to user
- No destructive state change
- User can retry approval

---

## Exit Criteria Verification

| Criterion | Status |
|-----------|--------|
| Every user action has one clear meaning | ✅ This document |
| No action both previews and persists in same step | ✅ Generation actions preview only |
| Unsaved preview state is explicitly represented | ✅ `quickChangePreview`/`variantsPreview` vs `editorDirty` |
| Current review and approval still work | ✅ Verified in existing code |
| New modules have stable boundaries | ✅ Phase 2: feature folder structure |
| Refinement no longer tightly coupled to approval | ✅ GenerationPanel and CompareDialog isolated |