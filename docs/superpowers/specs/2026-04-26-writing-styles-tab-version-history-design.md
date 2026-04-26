# Writing Styles Tab Redesign + Version History

**Date:** 2026-04-26  
**Status:** Approved  
**Scope:** `frontend/` only — no backend API changes required

---

## Overview

Two related improvements to the editor experience:

1. **Writing Styles Tab Redesign** — remove wasted header copy, give the card grid a fixed height with internal scroll so sliders are always in view, wire predefined dimension weights to each built-in card, auto-create untitled cards on generate, and add a generate button directly in the tab.

2. **Version History Strip** — a compact strip below the draft editor that checkpoints content on every generate action and every save-draft, allowing instant restore to any prior version.

---

## Part 1: Writing Styles Tab Redesign

### 1.1 Layout Changes

**Remove entirely:**
- All explanatory heading/body text in the styles tab ("Choose a writing style", style guide copy, tone description copy).
- Any padding/margin that was there to support that text.

**Card section — fixed height + internal scroll:**
- The card grid container gets a fixed height of `~280px` (adjustable via a Tailwind class constant so it's easy to tune).
- `overflow-y: auto` on the card container only. The rest of the tab (sliders, generate button) never scrolls out of view.
- Keep the existing 2-column grid layout and color-coded cards.

**Sliders — always visible:**
- The 7 dimension sliders (emotions, psychology, persuasion, copywriting, storytelling, typography, vocabulary) appear immediately below the card section, always in view.
- No changes to slider rendering logic — just ensure they're outside the scrollable card container.

**Generate button — bottom of tab:**
- A single "Generate" button at the bottom of the Writing Styles tab.
- Calls the existing `handleGenerateQuickChange()` action (no instruction required; passes empty/omitted instruction).
- Enable/disable logic described in §1.4.

### 1.2 Predefined Dimension Weights Per Card

Extend `BuiltInWorkflowCard` in `builtInWorkflowCards.ts` to include:

```typescript
dimensionWeights: Record<DimensionKey, number>
```

where `DimensionKey = 'emotions' | 'psychology' | 'persuasion' | 'copywriting' | 'storytelling' | 'typography' | 'vocabulary'`.

**Preset values for each card (0–100 scale):**

| Card ID | emotions | psychology | persuasion | copywriting | storytelling | typography | vocabulary |
|---|---|---|---|---|---|---|---|
| `viral-story` | 80 | 60 | 65 | 70 | 90 | 50 | 55 |
| `thought-leadership` | 30 | 80 | 70 | 65 | 50 | 60 | 85 |
| `engagement-trap` | 70 | 85 | 90 | 80 | 55 | 60 | 60 |
| `educational` | 25 | 55 | 50 | 80 | 45 | 70 | 85 |
| `personal-brand` | 50 | 65 | 60 | 70 | 60 | 65 | 75 |
| `personal-story` | 90 | 50 | 35 | 55 | 85 | 45 | 50 |
| `informational-news` | 20 | 45 | 40 | 75 | 40 | 70 | 80 |
| `trend-commentary` | 55 | 80 | 75 | 70 | 50 | 55 | 70 |
| `week-in-review` | 30 | 50 | 45 | 75 | 55 | 85 | 70 |
| `event-insight` | 65 | 55 | 50 | 60 | 75 | 55 | 60 |
| `satirical` | 75 | 70 | 55 | 80 | 65 | 50 | 70 |
| `appreciation` | 90 | 45 | 40 | 55 | 70 | 50 | 55 |
| `base` (Balanced) | 50 | 50 | 50 | 50 | 50 | 50 | 50 |

### 1.3 Card Selection → Slider Sync

**When a built-in card is clicked:**
1. Set `postType` to card ID (existing behaviour).
2. Set `selectedCardId` to card ID.
3. Call `setDimensionWeights(card.dimensionWeights)` — syncs all 7 sliders to that card's preset values.
4. Do NOT update `lastGeneratedConfig` here — that only changes on a successful generate.
5. Do NOT auto-switch to the Refine tab. The existing `setActiveWorkspacePanel('refine')` call in `EditorSidebar.tsx` on card click must be removed; generate now lives in the Styles tab.

**When sliders are manually changed after card selection:**
- Sliders update `dimensionWeights` as today.
- The card that was previously selected becomes "detached" — no card visually highlighted (clear `postType` or introduce a separate `selectedCardId` state that doesn't equal any card, see §1.5 on state separation).
- Generate button becomes enabled (config differs from last generated).

**Custom/untitled cards** inherit their dimensionWeights from the slider state at generation time (see §1.6).

### 1.4 Generate Button Enable/Disable Logic

Track in context:

```typescript
lastGeneratedConfig: {
  cardId: string | null;
  dimensionWeights: Record<string, number>;
} | null
```

**Disabled when:**
- `generationLoading !== null` (generation in flight), OR
- `lastGeneratedConfig !== null` AND current `postType === lastGeneratedConfig.cardId` AND `dimensionWeights` deeply equals `lastGeneratedConfig.dimensionWeights`.

**Enabled when:**
- `lastGeneratedConfig === null` (nothing has been generated yet), OR
- Any dimension weight differs from `lastGeneratedConfig.dimensionWeights`, OR
- `postType` differs from `lastGeneratedConfig.cardId`.

Use a shallow equality helper on the `dimensionWeights` record (compare all 7 keys). Do not use `JSON.stringify` for equality — use a `recordsEqual` utility.

**On successful generation:**
- Update `lastGeneratedConfig` to current `{ postType, dimensionWeights }`.
- Disable the button until something changes again.

### 1.5 State Separation: `selectedCardId` vs `postType`

Currently `postType` serves two purposes: (a) which card is visually highlighted, (b) which workflow ID is sent in the generation request. These need to be decoupled:

- Introduce `selectedCardId: string | null` for visual highlighting in the card grid.
- `postType` continues to be sent to the generation API unchanged.
- Clicking a card sets both `selectedCardId = card.id` AND `postType = card.id`.
- Manually changing sliders sets `selectedCardId = null` (nothing highlighted) but leaves `postType` as the last card ID (still used for generation style).
- This avoids accidentally clearing the generation workflow ID while preserving correct card highlight state.

### 1.6 Untitled Generated Cards

**On every successful Generate click:**
1. Create a `GeneratedStyleCard`:
   ```typescript
   interface GeneratedStyleCard {
     id: string;           // `generated-${Date.now()}`
     label: string;        // "Untitled 1", "Untitled 2", etc. (auto-increment per session)
     dimensionWeights: Record<string, number>;
     baseCardId?: string;  // which built-in card was active, if any
     createdAt: number;    // Unix ms
   }
   ```
2. Prepend to `generatedCards: GeneratedStyleCard[]` in `ReviewFlowEditorContext`.
3. Display at the **top of the card grid**, before featured built-in cards, most recent first.
4. Cap display at **5 most recent** generated cards (drop older ones from the array).
5. Clicking a generated card: sets `selectedCardId = card.id`, `setDimensionWeights(card.dimensionWeights)`.
6. Generated cards are session-only (not persisted to the sheet or localStorage).

**Visual treatment for generated cards:**
- Same card size/shape as built-in cards.
- Use a `slate` color key (neutral) with a subtle dashed border to distinguish them from built-in cards.
- Show label ("Untitled 1"), creation timestamp (relative, e.g. "2m ago"), and a compact weight indicator (e.g. 3 highest-weighted dimension names as trait pills).

---

## Part 2: Version History Strip

### 2.1 Placement

- Rendered as a **horizontal scrollable strip** between `DraftEditor` and the footer action buttons in the right panel.
- Collapsible: a small toggle chevron ("Version history ▾") above the strip; collapsed by default, expanded state stored in `localStorage` keyed to `'editor-version-history-open'`.
- Height when expanded: ~72px (one row of chips).

### 2.2 Data Model

```typescript
interface VersionEntry {
  id: string;                              // UUID
  timestamp: number;                       // Unix ms
  content: string;                         // Full editor text snapshot
  label: string;                           // "Viral Story", "Custom", "Saved · HH:MM", "Original"
  cardId?: string;                         // Active card ID at time of creation
  dimensionWeights: Record<string, number>;
  source: 'generate' | 'save' | 'initial'; // What triggered this version
  // Note: use source === 'save' to show the lock/saved indicator — no separate isSaved field needed
}
```

State lives in `ReviewFlowEditorContext`:
```typescript
versionHistory: VersionEntry[]   // oldest → newest; max 20 entries
currentVersionId: string | null  // which version is "active"
```

### 2.3 Version Creation Triggers

| Trigger | Label | Source |
|---|---|---|
| Editor mounts with existing content | "Original" | `'initial'` |
| Generate button clicked (after success) | Card name or "Custom" | `'generate'` |
| "Save draft" clicked | "Saved · HH:MM" | `'save'` |

**On Generate success:**
1. Snapshot the editor text **before** applying the result as a new `VersionEntry` (source `'generate'`, label = active card name or "Custom"). This lets the user revert to their pre-generate state.
2. Apply the quick-change result to the editor (existing behaviour).
3. Set `currentVersionId` to the new entry's ID.

**On Save draft:**
1. Snapshot current editor text as a `VersionEntry` with source `'save'` and label `"Saved · HH:MM"`.
2. The `source === 'save'` field is the indicator for showing the lock icon on the chip — no separate field needed.

**Max history:** 20 entries. When the limit is reached, drop the oldest non-saved entry (always keep `source === 'save'` entries).

### 2.4 Restore Behaviour

**When a version chip is clicked:**
1. The current live editor content is NOT automatically saved as a new entry (to avoid polluting history with every click).
2. Set editor content to `entry.content` via the existing `onChange` / controlled editor pattern.
3. Increment `historyResetKey` on `DraftEditor` to clear its internal undo stack — restoring to a version is a checkpoint boundary, not an undoable action.
4. Set `currentVersionId = entry.id`.
5. Set `dimensionWeights` to `entry.dimensionWeights` and `selectedCardId` to `entry.cardId ?? null` — sliders and card highlight reflect that version's config.
6. The "Current" chip is a live pointer to whatever is in the editor right now, not a stored snapshot. If the user edits after restoring, "Current" reflects those edits but no new `VersionEntry` is created until the next Generate or Save draft.

**"Current" chip:**
- Always the first chip on the left, pinned.
- Label: "Current".
- Highlighted (ring) when `currentVersionId` matches the latest entry OR when the user has typed new content not yet in any version.
- Clicking "Current" when already on current: no-op.
- Clicking "Current" when on an older version: restores to the most recent version entry content.

### 2.5 Persistence (Save Draft)

- When "Save draft" is clicked, serialize `versionHistory` to `localStorage` under the key `version-history-${topicId}`.
- On editor mount, check localStorage for `version-history-${topicId}`. If found, hydrate `versionHistory` from it.
- Max serialized entries: 20. Prune oldest non-saved entries before writing.
- No backend API changes needed.

### 2.6 Version Strip Component

New component: `VersionHistoryStrip`

**Props:**
```typescript
interface VersionHistoryStripProps {
  versions: VersionEntry[];
  currentVersionId: string | null;
  onRestore: (entry: VersionEntry) => void;
  isOpen: boolean;
  onToggle: () => void;
}
```

**Chip rendering:**
- Each chip: timestamp (relative), label, source icon (sparkle for generate, floppy for save, dot for initial).
- Active chip (matching `currentVersionId`): filled background.
- Chips ordered newest → oldest, left to right.
- "Current" chip is always leftmost, pinned.
- Strip scrolls horizontally if chips overflow.

---

## Part 3: Integration & Wiring

### 3.1 Context Changes (`ReviewFlowEditorContext`)

Add to `ReviewFlowEditorContextValue`:
```typescript
// Styles tab
selectedCardId: string | null;
setSelectedCardId: (id: string | null) => void;
generatedCards: GeneratedStyleCard[];
lastGeneratedConfig: { cardId: string | null; dimensionWeights: Record<string, number> } | null;

// Version history
versionHistory: VersionEntry[];
currentVersionId: string | null;
restoreVersion: (entry: VersionEntry) => void;
```

### 3.2 `useReviewFlowActions` Changes

**`handleGenerateQuickChange` (styles tab variant):**
- Accept optional `instruction?: string` (default `''`).
- Remove (or relax) the existing "instruction required" guard: when called from the Styles tab with no instruction, proceed normally without blocking.
- Before calling the API: snapshot current editor text into a new `VersionEntry` (source `'generate'`).
- On success:
  1. Apply result to editor (existing).
  2. Increment `historyResetKey` (or equivalent) on `DraftEditor` to clear its internal undo stack — prevents undo from crossing version boundaries.
  3. Create and prepend `GeneratedStyleCard`.
  4. Set `currentVersionId` to the new `VersionEntry`'s ID.
  5. Update `lastGeneratedConfig` to current `{ postType, dimensionWeights }`.

**`handleSaveDraft` additions:**
- After existing save logic:
  1. Create `VersionEntry` with source `'save'`.
  2. Persist `versionHistory` to localStorage.

### 3.3 `EditorSidebar.tsx` — Writing Styles Tab

- Remove all header/description text nodes.
- Wrap card grid in a `div` with `h-[280px] overflow-y-auto`.
- Move sliders and generate button outside the scrollable container.
- Wire generate button to `handleGenerateQuickChange()` with disabled state computed from `lastGeneratedConfig`.
- On card click: call `setSelectedCardId(card.id)`, `setPostType(card.id)`, `setDimensionWeights(card.dimensionWeights)`.
- Render `generatedCards` as the first section in the card grid (before featured built-in cards), capped at 5.
- Replace `postType`-based highlight logic with `selectedCardId`-based highlight.

### 3.4 `EditorScreen.tsx` / Right Panel

- Add `VersionHistoryStrip` below `DraftEditor`, above the footer.
- Pass `versionHistory`, `currentVersionId`, `restoreVersion`, `isOpen`, `onToggle` from context.
- Persist `isOpen` to localStorage.

---

## Part 4: File Change Map

| File | Change |
|---|---|
| `builtInWorkflowCards.ts` | Add `dimensionWeights` to `BuiltInWorkflowCard` interface and all 13 card definitions |
| `review/context/types.ts` | Add `GeneratedStyleCard`, `VersionEntry` types; extend `ReviewFlowEditorContextValue` |
| `review/context/useReviewFlowState.ts` | Initialize new state fields |
| `review/context/useReviewFlowActions.ts` | Extend `handleGenerateQuickChange` and `handleSaveDraft` |
| `review-editor/components/EditorSidebar.tsx` | Redesign Writing Styles tab (remove copy, fixed card height, generate button, card→slider sync) |
| `review-editor/components/VersionHistoryStrip.tsx` | **New file** — horizontal chip strip with collapse toggle |
| `review-editor/screens/EditorScreen.tsx` | Add `VersionHistoryStrip` below `DraftEditor` |
| `frontend/src/utils/recordsEqual.ts` | **New file** — shallow equality for `Record<string, number>` |

---

## Part 5: Non-Goals

- No backend API changes or new columns on `SheetRow`.
- No changes to the Refine tab's generation flow (Quick Change with instruction textarea remains unchanged there).
- No changes to the "Create your own" WorkflowBuilderModal flow.
- No version history for the Refine tab's quick change (versions only from the Styles tab generate button and save-draft checkpoints).
- Version history is not synced across devices or browser tabs.
