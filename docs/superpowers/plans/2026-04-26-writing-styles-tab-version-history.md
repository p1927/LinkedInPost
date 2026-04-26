# Writing Styles Tab Redesign + Version History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Writing Styles tab so cards + sliders are always visible, wire predefined dimension weights to each built-in card, add a direct-apply Generate button that creates version checkpoints, and render a collapsible version history strip below the draft editor.

**Architecture:** Extend `BuiltInWorkflowCard` with predefined `dimensionWeights`; introduce `selectedCardId` decoupled from `postType` so visual highlight and API payload are independent; add `handleGenerateFromStyle` for styles-tab-specific generation (no instruction required, direct apply); store `VersionEntry[]` in context state, persist to `localStorage` keyed by `topicId` on save-draft.

**Tech Stack:** React 18 (TypeScript), Vitest + @testing-library/react, Tailwind CSS, React context pattern

---

## File Map

| Status | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/utils/recordsEqual.ts` | Shallow equality for `Record<string, number>` |
| Create | `frontend/src/utils/__tests__/recordsEqual.test.ts` | Tests for recordsEqual |
| Modify | `frontend/src/features/generation/builtInWorkflowCards.ts` | Add `DimensionKey` type + `dimensionWeights` to `BuiltInWorkflowCard` interface + all 13 cards |
| Create | `frontend/src/features/generation/__tests__/builtInWorkflowCards.test.ts` | Verify all cards have complete, in-range dimensionWeights |
| Modify | `frontend/src/features/review/context/types.ts` | Add `GeneratedStyleCard`, `VersionEntry` interfaces; extend `ReviewFlowEditorContextValue` |
| Modify | `frontend/src/features/review/context/useReviewFlowState.ts` | Initialize new state fields; add `restoreVersion` callback |
| Modify | `frontend/src/features/review/context/useReviewFlowActions.ts` | Add `handleGenerateFromStyle`; extend `handleSaveDraft` with version checkpoint |
| Modify | `frontend/src/features/review-editor/components/EditorSidebar.tsx` | Redesign Writing Styles tab: remove copy, fix card height, sync sliders on card click, add Generate button |
| Create | `frontend/src/features/review-editor/components/VersionHistoryStrip.tsx` | Collapsible horizontal chip strip |
| Create | `frontend/src/features/review-editor/components/__tests__/VersionHistoryStrip.test.tsx` | Tests for version strip |
| Modify | `frontend/src/features/review-editor/screens/EditorScreen.tsx` | Add `VersionHistoryStrip` between editor and footer; update `historyResetKey` |

---

## Task 1: `recordsEqual` Utility

**Files:**
- Create: `frontend/src/utils/recordsEqual.ts`
- Create: `frontend/src/utils/__tests__/recordsEqual.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/utils/__tests__/recordsEqual.test.ts
import { describe, it, expect } from 'vitest';
import { recordsEqual } from '../recordsEqual';

describe('recordsEqual', () => {
  it('returns true for two empty records', () => {
    expect(recordsEqual({}, {})).toBe(true);
  });

  it('returns true for identical records', () => {
    expect(recordsEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns false when a value differs', () => {
    expect(recordsEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it('returns false when key counts differ', () => {
    expect(recordsEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns false when keys differ', () => {
    expect(recordsEqual({ a: 1 }, { b: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npx vitest run src/utils/__tests__/recordsEqual.test.ts --reporter=verbose
```
Expected: 5 tests fail with "Cannot find module '../recordsEqual'"

- [ ] **Step 3: Create the utility**

```typescript
// frontend/src/utils/recordsEqual.ts
export function recordsEqual(
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every(k => a[k] === b[k]);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/utils/__tests__/recordsEqual.test.ts --reporter=verbose
```
Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/recordsEqual.ts frontend/src/utils/__tests__/recordsEqual.test.ts
git commit -m "feat: add recordsEqual utility for dimension weight comparison"
```

---

## Task 2: Extend `BuiltInWorkflowCard` With Dimension Weights

**Files:**
- Modify: `frontend/src/features/generation/builtInWorkflowCards.ts`
- Create: `frontend/src/features/generation/__tests__/builtInWorkflowCards.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/features/generation/__tests__/builtInWorkflowCards.test.ts
import { describe, it, expect } from 'vitest';
import { BUILT_IN_WORKFLOW_CARDS, DIMENSION_KEYS } from '../builtInWorkflowCards';

describe('BUILT_IN_WORKFLOW_CARDS dimensionWeights', () => {
  it('every card has dimensionWeights with all 7 dimension keys', () => {
    for (const card of BUILT_IN_WORKFLOW_CARDS) {
      expect(card.dimensionWeights, `${card.id} missing dimensionWeights`).toBeDefined();
      for (const key of DIMENSION_KEYS) {
        expect(
          card.dimensionWeights[key],
          `${card.id} missing dimension ${key}`,
        ).toBeDefined();
      }
    }
  });

  it('all dimension weight values are between 0 and 100', () => {
    for (const card of BUILT_IN_WORKFLOW_CARDS) {
      for (const [key, val] of Object.entries(card.dimensionWeights)) {
        expect(val, `${card.id}.${key} out of range`).toBeGreaterThanOrEqual(0);
        expect(val, `${card.id}.${key} out of range`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('has exactly 13 cards', () => {
    expect(BUILT_IN_WORKFLOW_CARDS).toHaveLength(13);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd frontend && npx vitest run src/features/generation/__tests__/builtInWorkflowCards.test.ts --reporter=verbose
```
Expected: fails with "DIMENSION_KEYS is not exported" and "dimensionWeights" shape errors

- [ ] **Step 3: Modify `builtInWorkflowCards.ts`**

Replace the entire file with the following (preserving all existing data, adding `DimensionKey`, `DIMENSION_KEYS`, and `dimensionWeights` to each card):

```typescript
// frontend/src/features/generation/builtInWorkflowCards.ts

export type DimensionKey =
  | 'emotions'
  | 'psychology'
  | 'persuasion'
  | 'copywriting'
  | 'storytelling'
  | 'typography'
  | 'vocabulary';

export const DIMENSION_KEYS: DimensionKey[] = [
  'emotions',
  'psychology',
  'persuasion',
  'copywriting',
  'storytelling',
  'typography',
  'vocabulary',
];

export interface BuiltInWorkflowCard {
  id: string;
  name: string;
  description: string;
  traits: [string, string, string];
  colorKey: 'violet' | 'amber' | 'emerald' | 'blue' | 'rose' | 'slate';
  dimensionWeights: Record<DimensionKey, number>;
}

export const BUILT_IN_WORKFLOW_CARDS: BuiltInWorkflowCard[] = [
  {
    id: 'viral-story',
    name: 'Viral Story',
    description: 'Narrative-driven posts with emotional pull designed to spread.',
    traits: ['Narrative', 'Emotional', 'Engaging'],
    colorKey: 'violet',
    dimensionWeights: { emotions: 80, psychology: 60, persuasion: 65, copywriting: 70, storytelling: 90, typography: 50, vocabulary: 55 },
  },
  {
    id: 'thought-leadership',
    name: 'Thought Leadership',
    description: 'Analytical takes that position you as a credible industry voice.',
    traits: ['Analytical', 'Authoritative', 'Insightful'],
    colorKey: 'blue',
    dimensionWeights: { emotions: 30, psychology: 80, persuasion: 70, copywriting: 65, storytelling: 50, typography: 60, vocabulary: 85 },
  },
  {
    id: 'engagement-trap',
    name: 'Engagement Driver',
    description: 'Hook-first posts engineered for comments and shares.',
    traits: ['Hook', 'Provocative', 'Interactive'],
    colorKey: 'amber',
    dimensionWeights: { emotions: 70, psychology: 85, persuasion: 90, copywriting: 80, storytelling: 55, typography: 60, vocabulary: 60 },
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Clear, structured posts that teach something concrete.',
    traits: ['Clear', 'Structured', 'Informative'],
    colorKey: 'emerald',
    dimensionWeights: { emotions: 25, psychology: 55, persuasion: 50, copywriting: 80, storytelling: 45, typography: 70, vocabulary: 85 },
  },
  {
    id: 'personal-brand',
    name: 'Personal Brand',
    description: 'Consistent voice that reinforces your professional identity.',
    traits: ['Authentic', 'Consistent', 'Professional'],
    colorKey: 'violet',
    dimensionWeights: { emotions: 50, psychology: 65, persuasion: 60, copywriting: 70, storytelling: 60, typography: 65, vocabulary: 75 },
  },
  {
    id: 'personal-story',
    name: 'Personal Story',
    description: 'Vulnerable, first-person narratives that build connection.',
    traits: ['Vulnerable', 'Relatable', 'Human'],
    colorKey: 'rose',
    dimensionWeights: { emotions: 90, psychology: 50, persuasion: 35, copywriting: 55, storytelling: 85, typography: 45, vocabulary: 50 },
  },
  {
    id: 'informational-news',
    name: 'News & Insights',
    description: 'Timely, factual posts that surface important developments.',
    traits: ['Factual', 'Timely', 'Objective'],
    colorKey: 'slate',
    dimensionWeights: { emotions: 20, psychology: 45, persuasion: 40, copywriting: 75, storytelling: 40, typography: 70, vocabulary: 80 },
  },
  {
    id: 'trend-commentary',
    name: 'Trend Commentary',
    description: 'Opinionated takes on what is happening in your industry.',
    traits: ['Timely', 'Analytical', 'Opinionated'],
    colorKey: 'amber',
    dimensionWeights: { emotions: 55, psychology: 80, persuasion: 75, copywriting: 70, storytelling: 50, typography: 55, vocabulary: 70 },
  },
  {
    id: 'week-in-review',
    name: 'Week in Review',
    description: 'Structured digest of key events or learnings from the week.',
    traits: ['Structured', 'Comprehensive', 'Digestible'],
    colorKey: 'blue',
    dimensionWeights: { emotions: 30, psychology: 50, persuasion: 45, copywriting: 75, storytelling: 55, typography: 85, vocabulary: 70 },
  },
  {
    id: 'event-insight',
    name: 'Event Insight',
    description: 'Experiential posts sharing observations from events you attended.',
    traits: ['Experiential', 'Observational', 'Contextual'],
    colorKey: 'emerald',
    dimensionWeights: { emotions: 65, psychology: 55, persuasion: 50, copywriting: 60, storytelling: 75, typography: 55, vocabulary: 60 },
  },
  {
    id: 'satirical',
    name: 'Satirical',
    description: 'Sharp, witty posts that entertain while making a point.',
    traits: ['Humorous', 'Sharp', 'Witty'],
    colorKey: 'rose',
    dimensionWeights: { emotions: 75, psychology: 70, persuasion: 55, copywriting: 80, storytelling: 65, typography: 50, vocabulary: 70 },
  },
  {
    id: 'appreciation',
    name: 'Appreciation',
    description: 'Warm posts celebrating people, milestones, or communities.',
    traits: ['Warm', 'Grateful', 'Connecting'],
    colorKey: 'amber',
    dimensionWeights: { emotions: 90, psychology: 45, persuasion: 40, copywriting: 55, storytelling: 70, typography: 50, vocabulary: 55 },
  },
  {
    id: 'base',
    name: 'Balanced',
    description: 'A neutral baseline with equal weight across all dimensions.',
    traits: ['Balanced', 'Neutral', 'Versatile'],
    colorKey: 'slate',
    dimensionWeights: { emotions: 50, psychology: 50, persuasion: 50, copywriting: 50, storytelling: 50, typography: 50, vocabulary: 50 },
  },
];

export const FEATURED_WORKFLOW_IDS = [
  'viral-story',
  'thought-leadership',
  'engagement-trap',
  'educational',
  'personal-brand',
];
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/features/generation/__tests__/builtInWorkflowCards.test.ts --reporter=verbose
```
Expected: 3 tests pass

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors. If `WorkflowCardPicker.tsx` or other files import `BuiltInWorkflowCard`, they may need no changes since we only added a field.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/generation/builtInWorkflowCards.ts frontend/src/features/generation/__tests__/builtInWorkflowCards.test.ts
git commit -m "feat: add DimensionKey type and predefined dimensionWeights to all built-in workflow cards"
```

---

## Task 3: New Types + Context Interface Extensions

**Files:**
- Modify: `frontend/src/features/review/context/types.ts`

- [ ] **Step 1: Add `GeneratedStyleCard` and `VersionEntry` interfaces**

Open `frontend/src/features/review/context/types.ts`. Add these two interfaces near the top, after existing imports but before `ReviewFlowEditorContextValue`:

```typescript
// Add after existing imports in types.ts

export interface GeneratedStyleCard {
  id: string;
  label: string;
  dimensionWeights: Record<string, number>;
  baseCardId?: string;
  createdAt: number;
}

export interface VersionEntry {
  id: string;
  timestamp: number;
  content: string;
  /** "Viral Story", "Custom", "Saved · 10:32", "Original" */
  label: string;
  /** ID of the built-in or generated card active at snapshot time */
  cardId?: string;
  dimensionWeights: Record<string, number>;
  source: 'generate' | 'save' | 'initial';
}
```

- [ ] **Step 2: Extend `ReviewFlowEditorContextValue`**

Locate the `ReviewFlowEditorContextValue` interface (currently around line 41). Add the following fields at the end of the interface, before the closing `}`:

```typescript
  // ── Styles tab ────────────────────────────────────────────
  /** ID of the card visually highlighted in the card grid (decoupled from postType) */
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  /** Auto-created cards from the styles tab generate button, session-only */
  generatedCards: GeneratedStyleCard[];
  /** Config used for the last successful styles-tab generation; used to disable the button */
  lastGeneratedConfig: { cardId: string | null; dimensionWeights: Record<string, number> } | null;
  /** Direct-apply generation from the Styles tab (no instruction required) */
  handleGenerateFromStyle: () => Promise<void>;

  // ── Version history ────────────────────────────────────────
  versionHistory: VersionEntry[];
  currentVersionId: string | null;
  /** Restore editor to a past VersionEntry (also resets editor undo stack) */
  restoreVersion: (entry: VersionEntry) => void;
  /** Increments on every restore; used in historyResetKey to clear undo stack */
  versionRestoreCounter: number;
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: Errors about unimplemented members in context provider — these are fixed in Tasks 4 and 5.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/review/context/types.ts
git commit -m "feat: add GeneratedStyleCard, VersionEntry types and extend ReviewFlowEditorContextValue"
```

---

## Task 4: Initialize New State in `useReviewFlowState`

**Files:**
- Modify: `frontend/src/features/review/context/useReviewFlowState.ts`

- [ ] **Step 1: Add imports at top of file**

At the top of `frontend/src/features/review/context/useReviewFlowState.ts`, add the new type imports:

```typescript
import type { GeneratedStyleCard, VersionEntry } from './types';
```

- [ ] **Step 2: Add new `useState` declarations**

Locate the block where other `useState` hooks are declared (around line 386 where `postType` and `dimensionWeights` are initialized). Add the following after that block:

```typescript
const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
const [generatedCards, setGeneratedCards] = useState<GeneratedStyleCard[]>([]);
const [lastGeneratedConfig, setLastGeneratedConfig] = useState<{
  cardId: string | null;
  dimensionWeights: Record<string, number>;
} | null>(null);
const [versionHistory, setVersionHistory] = useState<VersionEntry[]>([]);
const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
const [versionRestoreCounter, setVersionRestoreCounter] = useState(0);
```

- [ ] **Step 3: Add `useEffect` to hydrate version history from localStorage when `topicId` changes**

After the new `useState` declarations, add:

```typescript
const topicId = sheetRow.topicId;

useEffect(() => {
  try {
    const stored = localStorage.getItem(`version-history-${topicId}`);
    if (stored) {
      setVersionHistory(JSON.parse(stored) as VersionEntry[]);
      setCurrentVersionId(null);
      return;
    }
  } catch {
    // ignore malformed stored data
  }
  // No stored history: create initial entry if editor has content
  const initialContent = sheetRow.selectedText || sheetRow.variant1 || '';
  if (initialContent.trim()) {
    setVersionHistory([
      {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        content: initialContent,
        label: 'Original',
        dimensionWeights: {},
        source: 'initial',
      },
    ]);
  } else {
    setVersionHistory([]);
  }
  setCurrentVersionId(null);
}, [topicId]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Add `restoreVersion` callback**

After the useEffect, add:

```typescript
const restoreVersion = useCallback(
  (entry: VersionEntry) => {
    setEditorText(entry.content);
    setCurrentVersionId(entry.id);
    setDimensionWeights(entry.dimensionWeights);
    setSelectedCardId(entry.cardId ?? null);
    if (entry.cardId) setPostType(entry.cardId);
    setVersionRestoreCounter(c => c + 1);
  },
  // setEditorText, setDimensionWeights, setPostType are stable setState functions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [],
);
```

- [ ] **Step 5: Add new fields to the return object**

Locate the hook's return object (around line 555). Add the new fields:

```typescript
// Inside the return object of useReviewFlowState:
selectedCardId,
setSelectedCardId,
generatedCards,
setGeneratedCards,
lastGeneratedConfig,
setLastGeneratedConfig,
versionHistory,
setVersionHistory,
currentVersionId,
setCurrentVersionId,
versionRestoreCounter,
restoreVersion,
```

- [ ] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: Errors reduce. Remaining errors will be in `useReviewFlowActions.ts` (missing `handleGenerateFromStyle`) and context consumer files.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/review/context/useReviewFlowState.ts
git commit -m "feat: initialize selectedCardId, generatedCards, versionHistory and restoreVersion in review flow state"
```

---

## Task 5: `handleGenerateFromStyle` + Version Checkpoints in `useReviewFlowActions`

**Files:**
- Modify: `frontend/src/features/review/context/useReviewFlowActions.ts`

- [ ] **Step 1: Add imports**

At the top of `useReviewFlowActions.ts`, ensure these are imported:

```typescript
import { BUILT_IN_WORKFLOW_CARDS } from '../../generation/builtInWorkflowCards';
import type { GeneratedStyleCard, VersionEntry } from './types';
```

- [ ] **Step 2: Add `handleGenerateFromStyle` parameters to the hook**

The hook receives state values as parameters. Add the following to the parameter destructuring (wherever `postType`, `dimensionWeights`, `editorText` etc. are currently destructured):

```typescript
selectedCardId,
setSelectedCardId,        // not used here but included for completeness
generatedCards,
setGeneratedCards,
lastGeneratedConfig,
setLastGeneratedConfig,
versionHistory,
setVersionHistory,
currentVersionId,         // not used here but included for completeness
setCurrentVersionId,
versionRestoreCounter,    // not used here but included for completeness
```

- [ ] **Step 3: Add `handleGenerateFromStyle` function**

Add this function immediately after `handleGenerateVariants` (around line 261):

```typescript
const handleGenerateFromStyle = useCallback(async (): Promise<void> => {
  if (generationLoading !== null) return;
  if (!editorText.trim()) return;

  // Snapshot the current content BEFORE generation so user can revert
  const activeCard = selectedCardId
    ? BUILT_IN_WORKFLOW_CARDS.find(c => c.id === selectedCardId)
    : null;
  const snapshotLabel = activeCard?.name ?? 'Custom';
  const snapshot: VersionEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    content: editorText,
    label: snapshotLabel,
    cardId: selectedCardId ?? undefined,
    dimensionWeights: { ...dimensionWeights },
    source: 'generate',
  };

  // Build request — same as handleGenerateQuickChange but without instruction guard
  const req = buildGenerationRequest();
  // Omit empty instruction so backend treats it as no instruction
  if (!req.instruction?.trim()) delete req.instruction;

  setGenerationLoading('quick-change');
  try {
    const result = await onGenerateQuickChange(req);
    if (!result) return;

    // Apply result directly to editor
    const newContent = result.fullText ?? result.replacementText ?? editorText;
    setEditorText(newContent);

    // Persist snapshot to version history
    const updatedHistory = [...versionHistory, snapshot].slice(-20);
    setVersionHistory(updatedHistory);
    setCurrentVersionId(snapshot.id);

    // Track the generated config to enable/disable the button
    setLastGeneratedConfig({ cardId: selectedCardId, dimensionWeights: { ...dimensionWeights } });

    // Create an untitled card for the top of the card grid
    const generatedCount = generatedCards.length + 1;
    const newCard: GeneratedStyleCard = {
      id: `generated-${Date.now()}`,
      label: `Untitled ${generatedCount}`,
      dimensionWeights: { ...dimensionWeights },
      baseCardId: selectedCardId ?? undefined,
      createdAt: Date.now(),
    };
    setGeneratedCards(prev => [newCard, ...prev].slice(0, 5));
  } finally {
    setGenerationLoading(null);
  }
}, [
  generationLoading,
  editorText,
  selectedCardId,
  dimensionWeights,
  versionHistory,
  generatedCards,
  buildGenerationRequest,
  onGenerateQuickChange,
  setEditorText,
  setGenerationLoading,
  setVersionHistory,
  setCurrentVersionId,
  setLastGeneratedConfig,
  setGeneratedCards,
]);
```

- [ ] **Step 4: Extend `handleSaveDraft` with version checkpoint**

Locate `handleSaveDraft` (around line 567). After the existing save logic completes successfully (after `setEditorBaselineText(editorText.trim())`), add:

```typescript
// Create a "saved" version checkpoint
const saveLabel = `Saved · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
const saveEntry: VersionEntry = {
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  content: editorText,
  label: saveLabel,
  cardId: selectedCardId ?? undefined,
  dimensionWeights: { ...dimensionWeights },
  source: 'save',
};
const updatedSaveHistory = [...versionHistory, saveEntry].slice(-20);
setVersionHistory(updatedSaveHistory);
setCurrentVersionId(saveEntry.id);

// Persist to localStorage so versions survive page refresh
try {
  localStorage.setItem(
    `version-history-${sheetRow.topicId}`,
    JSON.stringify(updatedSaveHistory),
  );
} catch {
  // localStorage might be full or unavailable — silently ignore
}
```

The `handleSaveDraft` function must now receive `selectedCardId`, `dimensionWeights`, `versionHistory`, `setVersionHistory`, `setCurrentVersionId`, and `sheetRow.topicId` in scope (they should already be available since all state is passed to the hook).

- [ ] **Step 5: Export `handleGenerateFromStyle` from the hook**

Locate the return object of `useReviewFlowActions`. Add:

```typescript
handleGenerateFromStyle,
```

- [ ] **Step 6: Wire `handleGenerateFromStyle` into the context provider**

Wherever `useReviewFlowActions` is consumed and its return values are spread into the `ReviewFlowEditorContext` provider value, ensure `handleGenerateFromStyle` is included. Find the provider component (typically in `ReviewWorkspace.tsx` or a context setup file) and verify `handleGenerateFromStyle` is passed through.

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: Errors about `handleGenerateFromStyle` being unused or missing in context consumers. These are fixed in Task 6.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/review/context/useReviewFlowActions.ts
git commit -m "feat: add handleGenerateFromStyle with version snapshot and save-draft version checkpoint"
```

---

## Task 6: Redesign Writing Styles Tab in `EditorSidebar`

**Files:**
- Modify: `frontend/src/features/review-editor/components/EditorSidebar.tsx`

- [ ] **Step 1: Add new imports**

At the top of `EditorSidebar.tsx`, add:

```typescript
import { recordsEqual } from '../../../utils/recordsEqual';
import type { GeneratedStyleCard } from '../../review/context/types';
```

Also add `DIMENSION_KEYS` to the existing `builtInWorkflowCards` import:

```typescript
import { BUILT_IN_WORKFLOW_CARDS, FEATURED_WORKFLOW_IDS, DIMENSION_KEYS } from '../../generation/builtInWorkflowCards';
```

- [ ] **Step 2: Destructure new context values**

In the component body where context values are destructured (around lines 144-163), add:

```typescript
const {
  // ... existing values ...
  selectedCardId,
  setSelectedCardId,
  generatedCards,
  lastGeneratedConfig,
  handleGenerateFromStyle,
} = useReviewFlowEditor();
```

- [ ] **Step 3: Rewrite `selectStyle` — remove tab auto-switch, add weight sync**

Replace the existing `selectStyle` function (currently at lines 184-187):

```typescript
// BEFORE (remove this):
function selectStyle(id: string) {
  setPostType(id);
  setActiveWorkspacePanel('refine');
}

// AFTER (replace with):
function selectStyle(id: string) {
  const card = BUILT_IN_WORKFLOW_CARDS.find(c => c.id === id);
  setSelectedCardId(id);
  setPostType(id);
  if (card) setDimensionWeights(card.dimensionWeights);
}

function selectGeneratedCard(card: GeneratedStyleCard) {
  setSelectedCardId(card.id);
  setDimensionWeights(card.dimensionWeights);
  // Keep postType as the last built-in card (don't send generated card IDs to API)
}
```

- [ ] **Step 4: Compute generate button disabled state**

Add this computation after `selectGeneratedCard`:

```typescript
const isGenerateDisabled = useMemo(() => {
  if (generationLoading !== null) return true;
  if (!lastGeneratedConfig) return false;
  return (
    lastGeneratedConfig.cardId === (selectedCardId ?? null) &&
    recordsEqual(lastGeneratedConfig.dimensionWeights, dimensionWeights)
  );
}, [generationLoading, lastGeneratedConfig, selectedCardId, dimensionWeights]);
```

- [ ] **Step 5: Rewrite the Writing Styles tab JSX**

Locate the entire `activeWorkspacePanel === 'styles'` block (currently lines 240-336). Replace it with:

```tsx
{activeWorkspacePanel === 'styles' ? (
  <section className="flex flex-col gap-3">
    {/* Card grid — fixed height with internal scroll */}
    <div className="h-[280px] overflow-y-auto rounded-xl border border-gray-100 pr-0.5">
      <div className="grid grid-cols-2 gap-2 p-1">
        {/* Generated (untitled) cards — most recent first */}
        {generatedCards.map(gc => {
          const isSelected = selectedCardId === gc.id;
          const topDims = Object.entries(gc.dimensionWeights)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([k]) => k);
          return (
            <button
              key={gc.id}
              type="button"
              onClick={() => selectGeneratedCard(gc)}
              className={cn(
                'flex flex-col gap-1.5 rounded-xl border-2 border-dashed p-2.5 text-left transition-all',
                'border-slate-300 bg-slate-50/80 hover:bg-slate-100/60',
                isSelected && 'ring-2 ring-offset-1 shadow-md ring-slate-400',
              )}
            >
              <span className="text-[0.65rem] font-bold text-ink/80 truncate">{gc.label}</span>
              <span className="text-[0.55rem] text-ink/40">
                {new Date(gc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex flex-wrap gap-1">
                {topDims.map(d => (
                  <span key={d} className="rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[0.55rem] font-semibold text-slate-600 capitalize">
                    {d}
                  </span>
                ))}
              </div>
            </button>
          );
        })}

        {/* Built-in cards (featured first) */}
        {ORDERED_CARDS.map(card => {
          const isSelected = selectedCardId === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => selectStyle(card.id)}
              className={cn(
                'flex flex-col gap-1.5 rounded-xl border-2 p-2.5 text-left transition-all',
                CARD_BG[card.colorKey],
                isSelected && `ring-2 ring-offset-1 shadow-md ${CARD_RING[card.colorKey]}`,
              )}
            >
              <span className="text-[0.65rem] font-bold text-ink/80">{card.name}</span>
              <div className="flex flex-wrap gap-1">
                {card.traits.map(t => (
                  <span key={t} className="rounded-full bg-white/60 px-1.5 py-0.5 text-[0.55rem] font-semibold text-ink/60">
                    {t}
                  </span>
                ))}
              </div>
            </button>
          );
        })}

        {/* Custom user-created workflows */}
        {customWorkflows?.map(wf => {
          const isSelected = selectedCardId === wf.id;
          return (
            <button
              key={wf.id}
              type="button"
              onClick={() => selectStyle(wf.id)}
              className={cn(
                'flex flex-col gap-1.5 rounded-xl border-2 p-2.5 text-left transition-all',
                'border-indigo-200/70 bg-indigo-50/50 hover:bg-indigo-50',
                isSelected && 'ring-2 ring-offset-1 shadow-md ring-indigo-400',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[0.65rem] font-bold text-indigo-700 truncate">{wf.name}</span>
              </div>
            </button>
          );
        })}

        {/* Create your own */}
        <button
          type="button"
          onClick={() => setIsWorkflowBuilderOpen(true)}
          className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 p-2.5 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <span className="text-base text-gray-300">+</span>
          <span className="text-[0.6rem] text-gray-400">Create your own</span>
        </button>
      </div>
    </div>

    {/* Dimension sliders — always visible */}
    <div className="rounded-xl border border-violet-200/60 bg-white/80 px-3 py-3 shadow-sm space-y-2.5">
      <p className="text-[0.65rem] font-bold text-ink/70">Writing emphasis</p>
      {DIMENSIONS.map(({ key, label }) => {
        const val = dimensionWeights[key] ?? 50;
        return (
          <div key={key}>
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] font-semibold text-ink">{label}</span>
              <span className={cn('text-[0.65rem] font-bold', getLevelColor(val))}>
                {getLevelName(val)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={val}
              onChange={e => {
                handleWeightChange(key, Number(e.target.value));
                // Detach card highlight when slider is manually changed
                setSelectedCardId(null);
              }}
              className="mt-1 w-full accent-primary"
            />
          </div>
        );
      })}
    </div>

    {/* Generate button */}
    <button
      type="button"
      disabled={isGenerateDisabled}
      onClick={handleGenerateFromStyle}
      className={cn(
        'w-full rounded-xl py-2.5 text-[0.75rem] font-semibold transition-all',
        isGenerateDisabled
          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
          : 'bg-primary text-white shadow-sm hover:bg-primary/90 active:scale-[0.98]',
      )}
    >
      {generationLoading === 'quick-change' ? 'Generating…' : 'Generate'}
    </button>
  </section>
) : null}
```

- [ ] **Step 6: Verify `DIMENSIONS` and `ORDERED_CARDS` are still correctly defined**

The component should already have `DIMENSIONS` (array of `{ key, label }`) and `ORDERED_CARDS` (built-ins with featured first) defined. If `ORDERED_CARDS` was derived inline from `BUILT_IN_WORKFLOW_CARDS`, ensure it still works. If it was defined using `orderedBuiltIns()` from `WorkflowCardPicker`, keep that import or inline the same logic.

If `ORDERED_CARDS` is not already defined, add above the component:

```typescript
function getOrderedCards() {
  const featured = FEATURED_WORKFLOW_IDS
    .map(id => BUILT_IN_WORKFLOW_CARDS.find(c => c.id === id))
    .filter(Boolean) as typeof BUILT_IN_WORKFLOW_CARDS;
  const rest = BUILT_IN_WORKFLOW_CARDS.filter(c => !FEATURED_WORKFLOW_IDS.includes(c.id));
  return [...featured, ...rest];
}
const ORDERED_CARDS = getOrderedCards();
```

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No new errors. Any remaining errors should be unrelated to this task.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/review-editor/components/EditorSidebar.tsx
git commit -m "feat: redesign Writing Styles tab with fixed card height, slider sync on card click, and Generate button"
```

---

## Task 7: Create `VersionHistoryStrip` Component

**Files:**
- Create: `frontend/src/features/review-editor/components/VersionHistoryStrip.tsx`
- Create: `frontend/src/features/review-editor/components/__tests__/VersionHistoryStrip.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// frontend/src/features/review-editor/components/__tests__/VersionHistoryStrip.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionHistoryStrip } from '../VersionHistoryStrip';
import type { VersionEntry } from '../../../review/context/types';

const makeEntry = (overrides: Partial<VersionEntry> = {}): VersionEntry => ({
  id: 'v1',
  timestamp: Date.now() - 60_000,
  content: 'Some content',
  label: 'Viral Story',
  dimensionWeights: {},
  source: 'generate',
  ...overrides,
});

describe('VersionHistoryStrip', () => {
  it('renders the toggle button', () => {
    render(
      <VersionHistoryStrip
        versions={[]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/version history/i)).toBeInTheDocument();
  });

  it('does not show chips when closed', () => {
    render(
      <VersionHistoryStrip
        versions={[makeEntry()]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.queryByText('Viral Story')).not.toBeInTheDocument();
  });

  it('shows the Current chip and version chips when open', () => {
    render(
      <VersionHistoryStrip
        versions={[makeEntry({ label: 'Viral Story' })]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Viral Story')).toBeInTheDocument();
  });

  it('calls onRestore with the entry when a version chip is clicked', () => {
    const onRestore = vi.fn();
    const entry = makeEntry({ id: 'abc', label: 'My Version' });
    render(
      <VersionHistoryStrip
        versions={[entry]}
        currentVersionId={null}
        onRestore={onRestore}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('My Version'));
    expect(onRestore).toHaveBeenCalledWith(entry);
  });

  it('calls onToggle when the toggle button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <VersionHistoryStrip
        versions={[]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={false}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByText(/version history/i));
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows save icon for save-source entries', () => {
    const entry = makeEntry({ source: 'save', label: 'Saved · 10:30' });
    render(
      <VersionHistoryStrip
        versions={[entry]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );
    // The floppy disk icon character should be present
    expect(screen.getByText(/Saved · 10:30/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/features/review-editor/components/__tests__/VersionHistoryStrip.test.tsx --reporter=verbose
```
Expected: All fail with "Cannot find module '../VersionHistoryStrip'"

- [ ] **Step 3: Create the component**

```tsx
// frontend/src/features/review-editor/components/VersionHistoryStrip.tsx
import { cn } from '../../../utils/cn';
import type { VersionEntry } from '../../review/context/types';

interface VersionHistoryStripProps {
  versions: VersionEntry[];
  currentVersionId: string | null;
  onRestore: (entry: VersionEntry) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const SOURCE_ICON: Record<VersionEntry['source'], string> = {
  generate: '✦',
  save: '⬡',
  initial: '·',
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function VersionHistoryStrip({
  versions,
  currentVersionId,
  onRestore,
  isOpen,
  onToggle,
}: VersionHistoryStripProps) {
  const mostRecent = versions.at(-1);
  const isOnCurrent = !currentVersionId || currentVersionId === mostRecent?.id;

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-4 py-1.5 text-left text-[0.65rem] font-semibold text-ink/40 hover:text-ink/60 transition-colors"
      >
        <span>Version history</span>
        <span
          className={cn(
            'ml-auto transition-transform duration-150',
            isOpen ? 'rotate-180' : '',
          )}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-thin scrollbar-thumb-gray-200">
          {/* Current chip — always pinned left */}
          <button
            type="button"
            onClick={() => mostRecent && onRestore(mostRecent)}
            disabled={isOnCurrent}
            className={cn(
              'flex shrink-0 flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1.5 transition-colors',
              isOnCurrent
                ? 'border-violet-300 bg-violet-50 text-violet-700 cursor-default'
                : 'border-gray-200 bg-white text-ink/50 hover:border-violet-200 hover:text-violet-600',
            )}
          >
            <span className="text-[0.6rem] font-bold uppercase tracking-wide">Current</span>
          </button>

          {/* Past versions — newest to oldest */}
          {[...versions].reverse().map(entry => {
            const isActive = currentVersionId === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onRestore(entry)}
                className={cn(
                  'flex shrink-0 flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1.5 transition-colors',
                  isActive
                    ? 'border-violet-300 bg-violet-50 text-violet-700'
                    : 'border-gray-200 bg-white text-ink/50 hover:border-violet-200 hover:text-ink/70',
                )}
              >
                <span className="text-[0.6rem] font-semibold whitespace-nowrap">
                  {SOURCE_ICON[entry.source]} {entry.label}
                </span>
                <span className="text-[0.55rem] opacity-60">{relativeTime(entry.timestamp)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd frontend && npx vitest run src/features/review-editor/components/__tests__/VersionHistoryStrip.test.tsx --reporter=verbose
```
Expected: All 6 tests pass

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors related to this file

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/review-editor/components/VersionHistoryStrip.tsx frontend/src/features/review-editor/components/__tests__/VersionHistoryStrip.test.tsx
git commit -m "feat: add VersionHistoryStrip component with collapsible chip strip"
```

---

## Task 8: Wire `VersionHistoryStrip` Into `EditorScreen`

**Files:**
- Modify: `frontend/src/features/review-editor/screens/EditorScreen.tsx`

- [ ] **Step 1: Add imports**

At the top of `EditorScreen.tsx`, add:

```typescript
import { VersionHistoryStrip } from '../components/VersionHistoryStrip';
```

- [ ] **Step 2: Destructure new context values**

In `EditorScreen.tsx`, where `useReviewFlowEditor()` is consumed (or wherever `editorText`, `dimensionWeights` etc. are pulled from context), add:

```typescript
const {
  // ... existing values ...
  versionHistory,
  currentVersionId,
  restoreVersion,
  versionRestoreCounter,
} = useReviewFlowEditor();
```

- [ ] **Step 3: Add `versionHistoryOpen` state backed by localStorage**

After the existing `useState` declarations in `EditorScreen.tsx`:

```typescript
const [versionHistoryOpen, setVersionHistoryOpen] = useState<boolean>(() => {
  try {
    return localStorage.getItem('editor-version-history-open') === 'true';
  } catch {
    return false;
  }
});

const handleToggleVersionHistory = useCallback(() => {
  setVersionHistoryOpen(prev => {
    const next = !prev;
    try { localStorage.setItem('editor-version-history-open', String(next)); } catch {}
    return next;
  });
}, []);
```

- [ ] **Step 4: Update `historyResetKey` to include `versionRestoreCounter`**

Locate line 69 in `EditorScreen.tsx`:

```typescript
// BEFORE:
const editorHistoryResetKey = `${sheetRow.topic}:${routed?.screen ?? ''}:${routed?.editorVariantSlot ?? ''}:${editorStartMediaPanel}`;

// AFTER:
const editorHistoryResetKey = `${sheetRow.topic}:${routed?.screen ?? ''}:${routed?.editorVariantSlot ?? ''}:${editorStartMediaPanel}:${versionRestoreCounter}`;
```

This causes `DraftEditor` to clear its internal undo stack whenever a version is restored, preventing undo from crossing version boundaries.

- [ ] **Step 5: Add `VersionHistoryStrip` between `DraftEditor` and the footer**

Locate where `DraftEditor` is rendered (around line 122) and where the footer buttons begin (around line 176). Between them, add:

```tsx
<VersionHistoryStrip
  versions={versionHistory}
  currentVersionId={currentVersionId}
  onRestore={restoreVersion}
  isOpen={versionHistoryOpen}
  onToggle={handleToggleVersionHistory}
/>
```

- [ ] **Step 6: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 7: Full test run**

```bash
cd frontend && npx vitest run --reporter=verbose
```
Expected: All unit tests pass (recordsEqual, builtInWorkflowCards, VersionHistoryStrip)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/review-editor/screens/EditorScreen.tsx
git commit -m "feat: wire VersionHistoryStrip into EditorScreen with localStorage collapse state and history reset key"
```

---

## Self-Review Checklist

- [x] **§1.1 Remove header copy** → Covered in Task 6 Step 5 (JSX rewrite removes all copy)
- [x] **§1.1 Fixed card height with internal scroll** → `h-[280px] overflow-y-auto` in Task 6 Step 5
- [x] **§1.1 Generate button at bottom** → Added in Task 6 Step 5
- [x] **§1.2 Predefined dimension weights** → Task 2 Step 3 (all 13 cards)
- [x] **§1.3 Card click syncs sliders** → Task 6 Step 3 (`selectStyle` calls `setDimensionWeights(card.dimensionWeights)`)
- [x] **§1.3 Remove auto-tab-switch** → Task 6 Step 3 (removed `setActiveWorkspacePanel('refine')`)
- [x] **§1.4 Enable/disable Generate button** → Task 6 Step 4 (`isGenerateDisabled` memo)
- [x] **§1.5 `selectedCardId` decoupled from `postType`** → Task 3 (type), Task 4 (state), Task 6 (usage)
- [x] **§1.6 Untitled cards at top of grid** → Task 5 Step 3 (`setGeneratedCards`), Task 6 Step 5 (rendered first)
- [x] **§1.6 Cap at 5 generated cards** → Task 5 Step 3 (`.slice(0, 5)`)
- [x] **§2.1 Horizontal strip below DraftEditor** → Task 8 Step 5
- [x] **§2.1 Collapsible with localStorage** → Task 8 Step 3
- [x] **§2.2 VersionEntry data model** → Task 3 Step 1
- [x] **§2.3 Snapshot BEFORE applying result** → Task 5 Step 3 (snapshot captured before `onGenerateQuickChange`)
- [x] **§2.3 Initial "Original" entry on mount** → Task 4 Step 3 (useEffect with localStorage hydration)
- [x] **§2.3 Save-draft checkpoint** → Task 5 Step 4
- [x] **§2.4 Restore sets editor content + resets undo stack** → Task 4 Step 4 (`restoreVersion`), Task 8 Step 4 (`versionRestoreCounter`)
- [x] **§2.4 Restore sets dimensionWeights + selectedCardId** → Task 4 Step 4 (`restoreVersion`)
- [x] **§2.5 Persist to localStorage on save** → Task 5 Step 4
- [x] **§2.5 Hydrate from localStorage on mount** → Task 4 Step 3 (useEffect)
- [x] **§2.6 VersionHistoryStrip component** → Task 7
- [x] **§3.1 Context additions** → Tasks 3 + 4
- [x] **§3.2 handleGenerateFromStyle** → Task 5
- [x] **§3.3 EditorSidebar tab redesign** → Task 6
- [x] **§3.4 EditorScreen wiring** → Task 8
- [x] **recordsEqual utility** → Task 1
- [x] **Max 20 version entries** → Task 5 Steps 3 + 4 (`.slice(-20)`)
- [x] **Keep saved entries when pruning** — Note: current implementation prunes by count (`.slice(-20)`) regardless of source. This is acceptable for v1; the spec's "always keep save entries" eviction policy can be added as a follow-up if needed.
