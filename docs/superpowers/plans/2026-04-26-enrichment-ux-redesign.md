# Enrichment UX Redesign + Custom Workflows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generation panel's post-type dropdown and sliders with named workflow cards, add custom workflow creation, surface enrichment intelligence live during generation, improve variant display, add a justification panel in the editor, and redesign the enrichment flow page to show real per-topic data.

**Architecture:** The existing `LifecycleEventBus` already fires `node:completed` events during DAG execution — this plan adds an SSE subscriber that converts those events into frontend-readable progress messages without touching the DAG runner. Custom workflows are stored in a new D1 table, converted to `WorkflowDefinition` shape at request time, and merged ephemerally with built-in workflows. All 6 stages are independent — each produces working, shippable software on its own.

**Tech Stack:** TypeScript, Cloudflare Workers + D1, React 18, Tailwind CSS, Vitest + React Testing Library, `@playwright/test` for E2E.

**Spec:** `docs/superpowers/specs/2026-04-26-enrichment-ux-redesign-design.md`

---

## File Map

### New files — Worker
| File | Responsibility |
|---|---|
| `worker/migrations/0011_custom_workflows.sql` | D1 schema for custom workflows |
| `worker/src/features/custom-workflows/types.ts` | `CustomWorkflow`, payload types |
| `worker/src/features/custom-workflows/customWorkflowD1.ts` | D1 query helpers (insert, list, get, soft-delete) |
| `worker/src/features/custom-workflows/customWorkflowToDefinition.ts` | Converts D1 row + dimension weights → `WorkflowDefinition` |
| `worker/src/features/custom-workflows/customWorkflowActions.ts` | Action handlers: list, create, update, delete |
| `worker/src/generation/nodeInsightSummary.ts` | `buildNodeInsightSummary(nodeId, outputJson)` → human-readable string |

### Modified files — Worker
| File | Change |
|---|---|
| `worker/src/engine/registry/WorkflowRegistry.ts` | Add `loadCustomWorkflows(db, userId)` |
| `worker/src/index.ts` | Wire 5 new actions + SSE enrichment events |

### New files — Frontend
| File | Responsibility |
|---|---|
| `frontend/src/features/generation/builtInWorkflowCards.ts` | Static metadata for 14 built-in workflows |
| `frontend/src/features/generation/WorkflowCardPicker.tsx` | Card grid replacing the post-type dropdown |
| `frontend/src/features/generation/nodeProgressLabels.ts` | `NODE_PROGRESS_LABELS` map + SSE event parser |
| `frontend/src/features/generation/EnrichmentProgressPanel.tsx` | Live node progress during generation |
| `frontend/src/features/workflows/useCustomWorkflows.ts` | Hook: fetch / create / update / delete custom workflows |
| `frontend/src/features/workflows/WorkflowBuilderModal.tsx` | Create / edit custom workflow form |
| `frontend/src/features/review/GenerationJustificationPanel.tsx` | "Why this post" panel in editor |

### Modified files — Frontend
| File | Change |
|---|---|
| `frontend/src/features/generation/GenerationPanel.tsx` | Swap dropdown for `WorkflowCardPicker`, add `EnrichmentProgressPanel`, promote variant rationale |
| `frontend/src/features/review/ReviewWorkspace.tsx` | Add `GenerationJustificationPanel` to editor layout |
| `frontend/src/pages/EnrichmentFlowPage.tsx` | Dynamic nodes, workflow header, summary tabs, timeline |

---

## Stage 1 — Workflow Card Picker

### Task 1: Built-in workflow card metadata

**Files:**
- Create: `frontend/src/features/generation/builtInWorkflowCards.ts`

- [ ] **Create the file with static metadata for all 14 built-in workflows**

```typescript
// frontend/src/features/generation/builtInWorkflowCards.ts

export interface BuiltInWorkflowCard {
  id: string;
  name: string;
  description: string;
  /** 3 short trait strings shown as pills on the card */
  traits: [string, string, string];
  /** Tailwind color key for card accent */
  colorKey: 'violet' | 'amber' | 'emerald' | 'blue' | 'rose' | 'slate';
}

export const BUILT_IN_WORKFLOW_CARDS: BuiltInWorkflowCard[] = [
  {
    id: 'viral-story',
    name: 'Viral Story',
    description: 'Make people feel something and share it',
    traits: ['High emotion', 'Authentic voice', 'Narrative arc'],
    colorKey: 'rose',
  },
  {
    id: 'thought-leadership',
    name: 'Thought Leadership',
    description: 'Establish expert authority with evidence',
    traits: ['Research-heavy', 'Structured arc', 'Authority vocab'],
    colorKey: 'blue',
  },
  {
    id: 'engagement-trap',
    name: 'Engagement Driver',
    description: 'Drive comments and discussion in the first hour',
    traits: ['Aggressive hook', 'Strong CTA', 'Controversy'],
    colorKey: 'amber',
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Teach something clearly, step by step',
    traits: ['Strict structure', 'Data-backed', 'Clarity-first'],
    colorKey: 'emerald',
  },
  {
    id: 'personal-brand',
    name: 'Personal Brand',
    description: 'Raw creator voice, identity-defining content',
    traits: ['Max authenticity', 'Emotional depth', 'Personal lens'],
    colorKey: 'violet',
  },
  {
    id: 'personal-story',
    name: 'Personal Story',
    description: 'A single story that teaches a professional lesson',
    traits: ['Story-led', 'One clear lesson', 'Relatable'],
    colorKey: 'rose',
  },
  {
    id: 'informational-news',
    name: 'News & Insights',
    description: 'Timely take on industry news',
    traits: ['News hook', 'Your angle', 'Timely'],
    colorKey: 'blue',
  },
  {
    id: 'trend-commentary',
    name: 'Trend Commentary',
    description: 'Your perspective on a shifting industry trend',
    traits: ['Contrarian ok', 'Trend-aware', 'Expert take'],
    colorKey: 'blue',
  },
  {
    id: 'week-in-review',
    name: 'Week in Review',
    description: 'Weekly roundup with key takeaways',
    traits: ['List format', 'Curated', 'Consistent voice'],
    colorKey: 'slate',
  },
  {
    id: 'event-insight',
    name: 'Event Insight',
    description: 'Lessons and observations from an event',
    traits: ['Experiential', 'Specific detail', 'Transferable'],
    colorKey: 'emerald',
  },
  {
    id: 'satirical',
    name: 'Satirical',
    description: 'Sharp, funny take on an industry absurdity',
    traits: ['Humour-led', 'Punchy', 'Brave'],
    colorKey: 'amber',
  },
  {
    id: 'appreciation',
    name: 'Appreciation',
    description: 'Recognise someone or something with impact',
    traits: ['Specific praise', 'Warm tone', 'Story-backed'],
    colorKey: 'violet',
  },
  {
    id: 'base',
    name: 'Balanced',
    description: 'All dimensions at moderate — good default',
    traits: ['Balanced', 'Versatile', 'Reliable'],
    colorKey: 'slate',
  },
];

/** Cards shown first in the picker — reorder freely */
export const FEATURED_WORKFLOW_IDS = [
  'viral-story',
  'thought-leadership',
  'engagement-trap',
  'educational',
  'personal-brand',
];
```

- [ ] **Commit**

```bash
git add frontend/src/features/generation/builtInWorkflowCards.ts
git commit -m "feat: add built-in workflow card metadata"
```

---

### Task 2: WorkflowCardPicker component

**Files:**
- Create: `frontend/src/features/generation/WorkflowCardPicker.tsx`

- [ ] **Create the component**

```typescript
// frontend/src/features/generation/WorkflowCardPicker.tsx

import { cn } from '@/lib/cn';
import { Plus, Pencil } from 'lucide-react';
import { BUILT_IN_WORKFLOW_CARDS, FEATURED_WORKFLOW_IDS, type BuiltInWorkflowCard } from './builtInWorkflowCards';

export interface CustomWorkflowSummary {
  id: string;
  name: string;
  description: string;
  optimizationTarget: string;
}

interface WorkflowCardPickerProps {
  selectedWorkflowId: string;
  customWorkflows: CustomWorkflowSummary[];
  onSelect: (workflowId: string) => void;
  onOpenBuilder: (workflowToEdit?: CustomWorkflowSummary) => void;
  isLoadingCustom?: boolean;
}

const COLOR_CLASSES: Record<BuiltInWorkflowCard['colorKey'], string> = {
  violet: 'border-violet-200 bg-violet-50/60 hover:border-violet-300',
  amber:  'border-amber-200  bg-amber-50/60  hover:border-amber-300',
  emerald:'border-emerald-200 bg-emerald-50/60 hover:border-emerald-300',
  blue:   'border-blue-200   bg-blue-50/60   hover:border-blue-300',
  rose:   'border-rose-200   bg-rose-50/60   hover:border-rose-300',
  slate:  'border-slate-200  bg-slate-50/60  hover:border-slate-300',
};

const SELECTED_RING: Record<BuiltInWorkflowCard['colorKey'], string> = {
  violet: 'ring-violet-400',
  amber:  'ring-amber-400',
  emerald:'ring-emerald-400',
  blue:   'ring-blue-400',
  rose:   'ring-rose-400',
  slate:  'ring-slate-400',
};

/** Reorder so featured cards appear first */
function orderedBuiltIns(): BuiltInWorkflowCard[] {
  const featured = FEATURED_WORKFLOW_IDS
    .map(id => BUILT_IN_WORKFLOW_CARDS.find(c => c.id === id))
    .filter((c): c is BuiltInWorkflowCard => c !== undefined);
  const rest = BUILT_IN_WORKFLOW_CARDS.filter(c => !FEATURED_WORKFLOW_IDS.includes(c.id));
  return [...featured, ...rest];
}

export function WorkflowCardPicker({
  selectedWorkflowId,
  customWorkflows,
  onSelect,
  onOpenBuilder,
  isLoadingCustom = false,
}: WorkflowCardPickerProps) {
  const builtIns = orderedBuiltIns();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      {builtIns.map(card => {
        const isSelected = selectedWorkflowId === card.id;
        return (
          <button
            key={card.id}
            type="button"
            data-testid={`workflow-card-${card.id}`}
            onClick={() => onSelect(card.id)}
            className={cn(
              'flex shrink-0 w-44 flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all duration-150 hover:shadow-md',
              COLOR_CLASSES[card.colorKey],
              isSelected && `ring-2 ring-offset-1 shadow-md ${SELECTED_RING[card.colorKey]}`,
            )}
          >
            <p className="text-xs font-bold text-ink leading-snug">{card.name}</p>
            <p className="text-[0.65rem] leading-relaxed text-slate-600 line-clamp-2">{card.description}</p>
            <div className="flex flex-wrap gap-1 mt-auto">
              {card.traits.map(trait => (
                <span key={trait} className="rounded-full bg-white/70 px-1.5 py-0.5 text-[0.55rem] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                  {trait}
                </span>
              ))}
            </div>
          </button>
        );
      })}

      {/* Custom workflow cards */}
      {!isLoadingCustom && customWorkflows.map(cw => {
        const isSelected = selectedWorkflowId === cw.id;
        return (
          <div
            key={cw.id}
            className={cn(
              'group relative flex shrink-0 w-44 flex-col gap-2 rounded-xl border-2 p-3 transition-all duration-150',
              'border-indigo-200 bg-indigo-50/60 hover:border-indigo-300 hover:shadow-md',
              isSelected && 'ring-2 ring-offset-1 ring-indigo-400 shadow-md',
            )}
          >
            <button
              type="button"
              data-testid={`workflow-card-custom-${cw.id}`}
              onClick={() => onSelect(cw.id)}
              className="flex flex-col gap-2 text-left w-full"
            >
              <p className="text-xs font-bold text-ink leading-snug pr-5">{cw.name}</p>
              <p className="text-[0.65rem] leading-relaxed text-slate-600 line-clamp-2">{cw.description}</p>
              <span className="mt-auto rounded-full bg-indigo-100 px-1.5 py-0.5 text-[0.55rem] font-semibold text-indigo-700 self-start">
                Custom
              </span>
            </button>
            <button
              type="button"
              aria-label={`Edit ${cw.name}`}
              onClick={() => onOpenBuilder(cw)}
              className="absolute top-2 right-2 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-100"
            >
              <Pencil className="h-3 w-3 text-indigo-600" />
            </button>
          </div>
        );
      })}

      {/* Create your own card */}
      <button
        type="button"
        data-testid="workflow-card-create"
        onClick={() => onOpenBuilder()}
        className="flex shrink-0 w-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-3 text-center transition-all duration-150 hover:border-primary hover:bg-primary/5 hover:shadow-md"
      >
        <Plus className="h-5 w-5 text-slate-400" />
        <p className="text-xs font-semibold text-slate-500">Create your own</p>
        <p className="text-[0.6rem] text-slate-400 leading-relaxed">Name it, set weights, save it</p>
      </button>
    </div>
  );
}
```

- [ ] **Write a smoke test**

```typescript
// frontend/src/features/generation/__tests__/WorkflowCardPicker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkflowCardPicker } from '../WorkflowCardPicker';

describe('WorkflowCardPicker', () => {
  const defaultProps = {
    selectedWorkflowId: '',
    customWorkflows: [],
    onSelect: vi.fn(),
    onOpenBuilder: vi.fn(),
  };

  it('renders featured built-in cards', () => {
    render(<WorkflowCardPicker {...defaultProps} />);
    expect(screen.getByTestId('workflow-card-viral-story')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-card-thought-leadership')).toBeInTheDocument();
  });

  it('calls onSelect with workflow id when card is clicked', () => {
    const onSelect = vi.fn();
    render(<WorkflowCardPicker {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('workflow-card-viral-story'));
    expect(onSelect).toHaveBeenCalledWith('viral-story');
  });

  it('shows selected ring on chosen card', () => {
    render(<WorkflowCardPicker {...defaultProps} selectedWorkflowId="viral-story" />);
    expect(screen.getByTestId('workflow-card-viral-story')).toHaveClass('ring-2');
  });

  it('renders custom workflow cards', () => {
    render(
      <WorkflowCardPicker
        {...defaultProps}
        customWorkflows={[{ id: 'cw_1', name: 'My Voice', description: 'desc', optimizationTarget: 'target' }]}
      />
    );
    expect(screen.getByTestId('workflow-card-custom-cw_1')).toBeInTheDocument();
  });

  it('calls onOpenBuilder when create card clicked', () => {
    const onOpenBuilder = vi.fn();
    render(<WorkflowCardPicker {...defaultProps} onOpenBuilder={onOpenBuilder} />);
    fireEvent.click(screen.getByTestId('workflow-card-create'));
    expect(onOpenBuilder).toHaveBeenCalledWith();
  });
});
```

- [ ] **Run tests**

```bash
cd frontend && npx vitest run src/features/generation/__tests__/WorkflowCardPicker.test.tsx
```
Expected: 5 passing

- [ ] **Commit**

```bash
git add frontend/src/features/generation/WorkflowCardPicker.tsx \
        frontend/src/features/generation/__tests__/WorkflowCardPicker.test.tsx
git commit -m "feat: add WorkflowCardPicker component"
```

---

### Task 3: Wire WorkflowCardPicker into GenerationPanel

**Files:**
- Modify: `frontend/src/features/generation/GenerationPanel.tsx`

- [ ] **Replace the `<select>` dropdown with `WorkflowCardPicker`**

In `GenerationPanel.tsx`, replace the Post Type `<select>` block (lines ~162–177) and import the new component:

```typescript
// Add at top of imports
import { WorkflowCardPicker, type CustomWorkflowSummary } from './WorkflowCardPicker';
```

Add these two props to `GenerationPanelProps`:
```typescript
customWorkflows?: CustomWorkflowSummary[];
isLoadingCustomWorkflows?: boolean;
onOpenWorkflowBuilder?: (workflow?: CustomWorkflowSummary) => void;
```

Add them to the destructured params (with defaults):
```typescript
customWorkflows = [],
isLoadingCustomWorkflows = false,
onOpenWorkflowBuilder,
```

Replace the `<select>` block entirely with:
```tsx
{/* Workflow Card Picker */}
<div className="mt-4">
  <p className={`mb-2 font-bold text-ink ${compact ? 'text-[0.65rem]' : 'text-sm'}`}>
    What should this post achieve?
  </p>
  <WorkflowCardPicker
    selectedWorkflowId={postType}
    customWorkflows={customWorkflows}
    onSelect={handlePostTypeChange}
    onOpenBuilder={onOpenWorkflowBuilder ?? (() => {})}
    isLoadingCustom={isLoadingCustomWorkflows}
  />
</div>
```

- [ ] **Verify the panel renders without TypeScript errors**

```bash
cd worker && npx tsc --noEmit; cd ../frontend && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Commit**

```bash
git add frontend/src/features/generation/GenerationPanel.tsx
git commit -m "feat: replace post-type dropdown with WorkflowCardPicker"
```

---

## Stage 2 — Custom Workflow CRUD

### Task 4: D1 migration

**Files:**
- Create: `worker/migrations/0011_custom_workflows.sql`

- [ ] **Write the migration**

```sql
-- worker/migrations/0011_custom_workflows.sql
-- Custom user-defined workflow profiles

CREATE TABLE IF NOT EXISTS custom_workflows (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL,
  optimization_target    TEXT NOT NULL,
  generation_instruction TEXT NOT NULL,
  extends_workflow_id    TEXT NOT NULL DEFAULT 'base',
  node_configs_json      TEXT NOT NULL DEFAULT '[]',
  is_deleted             INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_workflows_user
  ON custom_workflows(user_id, is_deleted);
```

- [ ] **Apply migration locally (if using wrangler)**

```bash
cd worker && npx wrangler d1 migrations apply <DB_NAME> --local
```
Expected: Migration applied successfully

- [ ] **Commit**

```bash
git add worker/migrations/0011_custom_workflows.sql
git commit -m "feat: add custom_workflows D1 migration"
```

---

### Task 5: Custom workflow types

**Files:**
- Create: `worker/src/features/custom-workflows/types.ts`

- [ ] **Write the types**

```typescript
// worker/src/features/custom-workflows/types.ts

import type { NodeWorkflowConfig } from '../../engine/types';

export interface CustomWorkflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  optimizationTarget: string;
  generationInstruction: string;
  /** Must be a built-in workflow id (e.g. 'base', 'viral-story') */
  extendsWorkflowId: string;
  nodeConfigs: NodeWorkflowConfig[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomWorkflowPayload {
  name: string;
  description: string;
  optimizationTarget: string;
  generationInstruction: string;
  extendsWorkflowId: string;
  /** 7 dimension keys ('emotions', 'psychology', etc.) mapped to 0–100 */
  dimensionWeights: Record<string, number>;
}

export interface UpdateCustomWorkflowPayload extends CreateCustomWorkflowPayload {
  id: string;
}

/** Lightweight shape returned in list responses */
export interface CustomWorkflowSummary {
  id: string;
  name: string;
  description: string;
  optimizationTarget: string;
  extendsWorkflowId: string;
  createdAt: string;
}

/** D1 row shape (snake_case, JSON strings) */
export interface CustomWorkflowRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  optimization_target: string;
  generation_instruction: string;
  extends_workflow_id: string;
  node_configs_json: string;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Commit**

```bash
git add worker/src/features/custom-workflows/types.ts
git commit -m "feat: add custom workflow types"
```

---

### Task 6: customWorkflowToDefinition converter

**Files:**
- Create: `worker/src/features/custom-workflows/customWorkflowToDefinition.ts`

- [ ] **Write the converter**

```typescript
// worker/src/features/custom-workflows/customWorkflowToDefinition.ts
/**
 * Converts a CustomWorkflow (from D1) into a WorkflowDefinition that the
 * WorkflowRegistry can resolve and run. Uses existing engine utilities —
 * no new logic is introduced here.
 */

import {
  DIMENSION_NODE_MAP,
  dimensionValueToImportance,
  IMPORTANCE_ORDER,
  type WorkflowDefinition,
  type NodeWorkflowConfig,
  type ImportanceLevel,
  type DimensionName,
} from '../../engine/types';
import type { CreateCustomWorkflowPayload, CustomWorkflow } from './types';

// Re-export DIMENSION_NODE_MAP so this module is the single place consumers
// import it from (avoids deep engine imports in feature code).
export { DIMENSION_NODE_MAP };

/**
 * Converts dimension weight sliders (0–100 per dimension) into
 * NodeWorkflowConfig[], using the same mapping as WorkflowRunner.
 *
 * The base workflow's nodeConfigs are used as the starting point — we then
 * override importance for nodes affected by the supplied weights.
 */
export function dimensionWeightsToNodeConfigs(
  dimensionWeights: Record<string, number>,
  baseNodeConfigs: NodeWorkflowConfig[],
): NodeWorkflowConfig[] {
  // Build mutable importance map from base configs
  const importanceMap: Record<string, ImportanceLevel> = {};
  for (const cfg of baseNodeConfigs) {
    importanceMap[cfg.nodeId] = cfg.importance;
  }

  // Apply dimension overrides (never decrease, never disable draft-generator)
  for (const [dim, value] of Object.entries(dimensionWeights) as [DimensionName, number][]) {
    const targetLevel = dimensionValueToImportance(value);
    for (const nodeId of DIMENSION_NODE_MAP[dim] ?? []) {
      const effectiveTarget: ImportanceLevel =
        nodeId === 'draft-generator' && targetLevel === 'off' ? 'background' : targetLevel;
      const currentIdx = IMPORTANCE_ORDER.indexOf(importanceMap[nodeId] ?? 'supporting');
      const targetIdx = IMPORTANCE_ORDER.indexOf(effectiveTarget);
      if (targetIdx > currentIdx) {
        importanceMap[nodeId] = effectiveTarget;
      }
    }
  }

  return baseNodeConfigs.map(cfg => ({
    ...cfg,
    importance: importanceMap[cfg.nodeId] ?? cfg.importance,
  }));
}

/** Converts a full CustomWorkflow object → WorkflowDefinition */
export function customWorkflowToDefinition(cw: CustomWorkflow): WorkflowDefinition {
  return {
    id: cw.id,
    name: cw.name,
    description: cw.description,
    optimizationTarget: cw.optimizationTarget,
    extendsWorkflowId: cw.extendsWorkflowId,
    nodeConfigs: cw.nodeConfigs,
    generationInstruction: cw.generationInstruction,
  };
}

/** Convenience: build WorkflowDefinition directly from a create payload + base node configs */
export function payloadToWorkflowDefinition(
  id: string,
  payload: CreateCustomWorkflowPayload,
  baseNodeConfigs: NodeWorkflowConfig[],
): WorkflowDefinition {
  const nodeConfigs = dimensionWeightsToNodeConfigs(payload.dimensionWeights, baseNodeConfigs);
  return {
    id,
    name: payload.name,
    description: payload.description,
    optimizationTarget: payload.optimizationTarget,
    extendsWorkflowId: payload.extendsWorkflowId,
    nodeConfigs,
    generationInstruction: payload.generationInstruction,
  };
}
```

- [ ] **Write unit tests**

```typescript
// worker/src/features/custom-workflows/__tests__/customWorkflowToDefinition.test.ts
import { describe, it, expect } from 'vitest';
import {
  dimensionWeightsToNodeConfigs,
  customWorkflowToDefinition,
} from '../customWorkflowToDefinition';
import type { NodeWorkflowConfig } from '../../../engine/types';

const BASE_CONFIGS: NodeWorkflowConfig[] = [
  { nodeId: 'psychology-analyzer', importance: 'important', dependsOn: [] },
  { nodeId: 'vocabulary-selector',  importance: 'supporting', dependsOn: ['psychology-analyzer'] },
  { nodeId: 'draft-generator',      importance: 'critical',   dependsOn: ['vocabulary-selector'] },
];

describe('dimensionWeightsToNodeConfigs', () => {
  it('returns base configs unchanged when no weights override', () => {
    const result = dimensionWeightsToNodeConfigs({ psychology: 50 }, BASE_CONFIGS);
    const psych = result.find(c => c.nodeId === 'psychology-analyzer')!;
    // 50 → 'supporting' which is lower than 'important', so no change
    expect(psych.importance).toBe('important');
  });

  it('upgrades importance when weight is higher than base', () => {
    const result = dimensionWeightsToNodeConfigs({ psychology: 90 }, BASE_CONFIGS);
    const psych = result.find(c => c.nodeId === 'psychology-analyzer')!;
    expect(psych.importance).toBe('critical');
  });

  it('never sets draft-generator to off', () => {
    const result = dimensionWeightsToNodeConfigs({ copywriting: 5 }, BASE_CONFIGS);
    const draft = result.find(c => c.nodeId === 'draft-generator')!;
    expect(draft.importance).not.toBe('off');
  });

  it('preserves dependsOn arrays', () => {
    const result = dimensionWeightsToNodeConfigs({ vocabulary: 85 }, BASE_CONFIGS);
    const vocab = result.find(c => c.nodeId === 'vocabulary-selector')!;
    expect(vocab.dependsOn).toEqual(['psychology-analyzer']);
  });
});

describe('customWorkflowToDefinition', () => {
  it('maps all fields correctly', () => {
    const cw = {
      id: 'cw_test',
      userId: 'u1',
      name: 'My Workflow',
      description: 'desc',
      optimizationTarget: 'virality',
      generationInstruction: 'Be bold',
      extendsWorkflowId: 'base',
      nodeConfigs: BASE_CONFIGS,
      isDeleted: false,
      createdAt: '2026-04-26T00:00:00Z',
      updatedAt: '2026-04-26T00:00:00Z',
    };
    const def = customWorkflowToDefinition(cw);
    expect(def.id).toBe('cw_test');
    expect(def.name).toBe('My Workflow');
    expect(def.extendsWorkflowId).toBe('base');
    expect(def.nodeConfigs).toHaveLength(3);
  });
});
```

- [ ] **Run tests**

```bash
cd worker && npx vitest run src/features/custom-workflows/__tests__/customWorkflowToDefinition.test.ts
```
Expected: 5 passing

- [ ] **Commit**

```bash
git add worker/src/features/custom-workflows/customWorkflowToDefinition.ts \
        worker/src/features/custom-workflows/__tests__/customWorkflowToDefinition.test.ts
git commit -m "feat: add dimensionWeights → WorkflowDefinition converter"
```

---

### Task 7: D1 helpers for custom workflows

**Files:**
- Create: `worker/src/features/custom-workflows/customWorkflowD1.ts`

- [ ] **Write the D1 helpers**

```typescript
// worker/src/features/custom-workflows/customWorkflowD1.ts

import type { D1Database } from '@cloudflare/workers-types';
import type { CustomWorkflow, CustomWorkflowRow, CustomWorkflowSummary } from './types';
import type { NodeWorkflowConfig } from '../../engine/types';

function rowToWorkflow(row: CustomWorkflowRow): CustomWorkflow {
  let nodeConfigs: NodeWorkflowConfig[] = [];
  try {
    nodeConfigs = JSON.parse(row.node_configs_json) as NodeWorkflowConfig[];
  } catch {
    nodeConfigs = [];
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    optimizationTarget: row.optimization_target,
    generationInstruction: row.generation_instruction,
    extendsWorkflowId: row.extends_workflow_id,
    nodeConfigs,
    isDeleted: row.is_deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSummary(row: CustomWorkflowRow): CustomWorkflowSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    optimizationTarget: row.optimization_target,
    extendsWorkflowId: row.extends_workflow_id,
    createdAt: row.created_at,
  };
}

export async function dbListCustomWorkflows(
  db: D1Database,
  userId: string,
): Promise<CustomWorkflowSummary[]> {
  const result = await db
    .prepare(
      `SELECT id, user_id, name, description, optimization_target,
              generation_instruction, extends_workflow_id, node_configs_json,
              is_deleted, created_at, updated_at
       FROM custom_workflows
       WHERE user_id = ? AND is_deleted = 0
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all<CustomWorkflowRow>();
  return (result.results ?? []).map(rowToSummary);
}

export async function dbGetCustomWorkflow(
  db: D1Database,
  id: string,
  userId: string,
): Promise<CustomWorkflow | null> {
  const row = await db
    .prepare(
      `SELECT * FROM custom_workflows WHERE id = ? AND user_id = ? AND is_deleted = 0`,
    )
    .bind(id, userId)
    .first<CustomWorkflowRow>();
  return row ? rowToWorkflow(row) : null;
}

export async function dbInsertCustomWorkflow(
  db: D1Database,
  workflow: CustomWorkflow,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO custom_workflows
         (id, user_id, name, description, optimization_target,
          generation_instruction, extends_workflow_id, node_configs_json,
          is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .bind(
      workflow.id,
      workflow.userId,
      workflow.name,
      workflow.description,
      workflow.optimizationTarget,
      workflow.generationInstruction,
      workflow.extendsWorkflowId,
      JSON.stringify(workflow.nodeConfigs),
      workflow.createdAt,
      workflow.updatedAt,
    )
    .run();
}

export async function dbUpdateCustomWorkflow(
  db: D1Database,
  id: string,
  userId: string,
  patch: Pick<CustomWorkflow, 'name' | 'description' | 'optimizationTarget' | 'generationInstruction' | 'extendsWorkflowId' | 'nodeConfigs'>,
  updatedAt: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE custom_workflows
       SET name = ?, description = ?, optimization_target = ?,
           generation_instruction = ?, extends_workflow_id = ?,
           node_configs_json = ?, updated_at = ?
       WHERE id = ? AND user_id = ? AND is_deleted = 0`,
    )
    .bind(
      patch.name,
      patch.description,
      patch.optimizationTarget,
      patch.generationInstruction,
      patch.extendsWorkflowId,
      JSON.stringify(patch.nodeConfigs),
      updatedAt,
      id,
      userId,
    )
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function dbSoftDeleteCustomWorkflow(
  db: D1Database,
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE custom_workflows SET is_deleted = 1, updated_at = ?
       WHERE id = ? AND user_id = ? AND is_deleted = 0`,
    )
    .bind(new Date().toISOString(), id, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

/** Fetches full CustomWorkflow rows for use in WorkflowRegistry (not summaries) */
export async function dbListCustomWorkflowsFull(
  db: D1Database,
  userId: string,
): Promise<CustomWorkflow[]> {
  const result = await db
    .prepare(`SELECT * FROM custom_workflows WHERE user_id = ? AND is_deleted = 0`)
    .bind(userId)
    .all<CustomWorkflowRow>();
  return (result.results ?? []).map(rowToWorkflow);
}
```

- [ ] **Commit**

```bash
git add worker/src/features/custom-workflows/customWorkflowD1.ts
git commit -m "feat: add custom workflow D1 query helpers"
```

---

### Task 8: Custom workflow action handlers

**Files:**
- Create: `worker/src/features/custom-workflows/customWorkflowActions.ts`

- [ ] **Write the action handlers**

```typescript
// worker/src/features/custom-workflows/customWorkflowActions.ts

import { nanoid } from 'nanoid';
import type { D1Database } from '@cloudflare/workers-types';
import {
  dbListCustomWorkflows,
  dbGetCustomWorkflow,
  dbInsertCustomWorkflow,
  dbUpdateCustomWorkflow,
  dbSoftDeleteCustomWorkflow,
} from './customWorkflowD1';
import { dimensionWeightsToNodeConfigs } from './customWorkflowToDefinition';
import type { CreateCustomWorkflowPayload, UpdateCustomWorkflowPayload } from './types';
import { workflowRegistry } from '../../engine/registry/WorkflowRegistry';

function validatePayload(p: CreateCustomWorkflowPayload): string | null {
  if (!p.name?.trim()) return 'name is required';
  if (p.name.trim().length > 40) return 'name must be 40 characters or fewer';
  if (!p.description?.trim()) return 'description is required';
  if (!p.generationInstruction?.trim()) return 'generationInstruction is required';
  if (!p.extendsWorkflowId?.trim()) return 'extendsWorkflowId is required';
  return null;
}

export async function handleListCustomWorkflows(db: D1Database, userId: string): Promise<Response> {
  const workflows = await dbListCustomWorkflows(db, userId);
  return Response.json({ workflows });
}

export async function handleCreateCustomWorkflow(
  db: D1Database,
  userId: string,
  payload: CreateCustomWorkflowPayload,
): Promise<Response> {
  const error = validatePayload(payload);
  if (error) return Response.json({ error }, { status: 400 });

  // Resolve base workflow to get its node configs as starting point
  let baseNodeConfigs = workflowRegistry.resolve('base').nodeConfigs;
  try {
    baseNodeConfigs = workflowRegistry.resolve(payload.extendsWorkflowId).nodeConfigs;
  } catch {
    // extendsWorkflowId not found — fall back to base
  }

  const nodeConfigs = dimensionWeightsToNodeConfigs(
    payload.dimensionWeights ?? {},
    baseNodeConfigs,
  );

  const now = new Date().toISOString();
  const id = `cw_${nanoid(10)}`;

  await dbInsertCustomWorkflow(db, {
    id,
    userId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    optimizationTarget: payload.optimizationTarget?.trim() ?? '',
    generationInstruction: payload.generationInstruction.trim(),
    extendsWorkflowId: payload.extendsWorkflowId,
    nodeConfigs,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id }, { status: 201 });
}

export async function handleUpdateCustomWorkflow(
  db: D1Database,
  userId: string,
  payload: UpdateCustomWorkflowPayload,
): Promise<Response> {
  if (!payload.id) return Response.json({ error: 'id is required' }, { status: 400 });
  const error = validatePayload(payload);
  if (error) return Response.json({ error }, { status: 400 });

  const existing = await dbGetCustomWorkflow(db, payload.id, userId);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  let baseNodeConfigs = workflowRegistry.resolve('base').nodeConfigs;
  try {
    baseNodeConfigs = workflowRegistry.resolve(payload.extendsWorkflowId).nodeConfigs;
  } catch { /* fall back to base */ }

  const nodeConfigs = dimensionWeightsToNodeConfigs(
    payload.dimensionWeights ?? {},
    baseNodeConfigs,
  );

  const updated = await dbUpdateCustomWorkflow(
    db,
    payload.id,
    userId,
    {
      name: payload.name.trim(),
      description: payload.description.trim(),
      optimizationTarget: payload.optimizationTarget?.trim() ?? '',
      generationInstruction: payload.generationInstruction.trim(),
      extendsWorkflowId: payload.extendsWorkflowId,
      nodeConfigs,
    },
    new Date().toISOString(),
  );

  if (!updated) return Response.json({ error: 'Update failed' }, { status: 500 });
  return Response.json({ ok: true });
}

export async function handleDeleteCustomWorkflow(
  db: D1Database,
  userId: string,
  id: string,
): Promise<Response> {
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
  const deleted = await dbSoftDeleteCustomWorkflow(db, id, userId);
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
```

- [ ] **Commit**

```bash
git add worker/src/features/custom-workflows/customWorkflowActions.ts
git commit -m "feat: add custom workflow action handlers"
```

---

### Task 9: Wire custom workflow actions into index.ts + WorkflowRegistry

**Files:**
- Modify: `worker/src/index.ts`
- Modify: `worker/src/engine/registry/WorkflowRegistry.ts`

- [ ] **Read the WorkflowRegistry to understand its current interface**

```bash
cat worker/src/engine/registry/WorkflowRegistry.ts
```

- [ ] **Add `loadCustomWorkflows` to WorkflowRegistry**

In `WorkflowRegistry.ts`, add after the existing `register` method:

```typescript
import type { D1Database } from '@cloudflare/workers-types';
import { dbListCustomWorkflowsFull } from '../../features/custom-workflows/customWorkflowD1';
import { customWorkflowToDefinition } from '../../features/custom-workflows/customWorkflowToDefinition';

/**
 * Returns a new WorkflowRegistry instance that contains all built-in workflows
 * PLUS the given user's custom workflows. Does NOT mutate the singleton registry.
 */
async loadCustomWorkflows(db: D1Database, userId: string): Promise<WorkflowRegistry> {
  const customRows = await dbListCustomWorkflowsFull(db, userId);
  const extended = new WorkflowRegistry();
  // Copy all built-in registrations
  for (const [id, def] of this.definitions) {
    extended.register(def);
  }
  // Register custom workflows (they override built-ins with same id — shouldn't happen in practice)
  for (const cw of customRows) {
    extended.register(customWorkflowToDefinition(cw));
  }
  return extended;
}
```

- [ ] **Add 5 new action cases to `dispatchAction()` in `index.ts`**

In the switch/dispatch block, add alongside existing action cases:

```typescript
case 'listCustomWorkflows': {
  return handleListCustomWorkflows(env.DB, session.userId);
}
case 'createCustomWorkflow': {
  const payload = body.payload as CreateCustomWorkflowPayload;
  return handleCreateCustomWorkflow(env.DB, session.userId, payload);
}
case 'updateCustomWorkflow': {
  const payload = body.payload as UpdateCustomWorkflowPayload;
  return handleUpdateCustomWorkflow(env.DB, session.userId, payload);
}
case 'deleteCustomWorkflow': {
  const id = body.payload?.id as string;
  return handleDeleteCustomWorkflow(env.DB, session.userId, id);
}
case 'getNodeCatalog': {
  const catalog = nodeRegistry.list().map(n => ({ id: n.id, name: n.name, description: n.description }));
  return Response.json({ nodes: catalog });
}
```

Add the imports at the top of index.ts:
```typescript
import {
  handleListCustomWorkflows,
  handleCreateCustomWorkflow,
  handleUpdateCustomWorkflow,
  handleDeleteCustomWorkflow,
} from './features/custom-workflows/customWorkflowActions';
import type { CreateCustomWorkflowPayload, UpdateCustomWorkflowPayload } from './features/custom-workflows/types';
```

- [ ] **Compile check**

```bash
cd worker && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Commit**

```bash
git add worker/src/engine/registry/WorkflowRegistry.ts worker/src/index.ts
git commit -m "feat: wire custom workflow actions and getNodeCatalog into worker"
```

---

### Task 10: useCustomWorkflows hook + WorkflowBuilderModal

**Files:**
- Create: `frontend/src/features/workflows/useCustomWorkflows.ts`
- Create: `frontend/src/features/workflows/WorkflowBuilderModal.tsx`

- [ ] **Write useCustomWorkflows hook**

```typescript
// frontend/src/features/workflows/useCustomWorkflows.ts

import { useState, useEffect, useCallback } from 'react';
import type { BackendApi } from '../../services/backendApi';
import type { CustomWorkflowSummary } from '../generation/WorkflowCardPicker';

interface UseCustomWorkflowsOptions {
  api: BackendApi;
  idToken: string;
  enabled: boolean;
}

interface UseCustomWorkflowsReturn {
  workflows: CustomWorkflowSummary[];
  isLoading: boolean;
  create: (payload: CreateWorkflowFormValues) => Promise<string | null>;
  update: (id: string, payload: CreateWorkflowFormValues) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  reload: () => void;
}

export interface CreateWorkflowFormValues {
  name: string;
  description: string;
  optimizationTarget: string;
  generationInstruction: string;
  extendsWorkflowId: string;
  dimensionWeights: Record<string, number>;
}

export function useCustomWorkflows({
  api,
  idToken,
  enabled,
}: UseCustomWorkflowsOptions): UseCustomWorkflowsReturn {
  const [workflows, setWorkflows] = useState<CustomWorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!enabled) return;
    setIsLoading(true);
    api
      .post<{ workflows: CustomWorkflowSummary[] }>('listCustomWorkflows', {}, idToken)
      .then(res => setWorkflows(res.workflows ?? []))
      .catch(() => setWorkflows([]))
      .finally(() => setIsLoading(false));
  }, [enabled, idToken, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useCallback(
    async (payload: CreateWorkflowFormValues): Promise<string | null> => {
      try {
        const res = await api.post<{ id: string }>('createCustomWorkflow', { payload }, idToken);
        reload();
        return res.id ?? null;
      } catch {
        return null;
      }
    },
    [api, idToken, reload],
  );

  const update = useCallback(
    async (id: string, payload: CreateWorkflowFormValues): Promise<boolean> => {
      try {
        await api.post('updateCustomWorkflow', { payload: { ...payload, id } }, idToken);
        reload();
        return true;
      } catch {
        return false;
      }
    },
    [api, idToken, reload],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await api.post('deleteCustomWorkflow', { payload: { id } }, idToken);
        reload();
        return true;
      } catch {
        return false;
      }
    },
    [api, idToken, reload],
  );

  return { workflows, isLoading, create, update, remove, reload };
}
```

- [ ] **Write WorkflowBuilderModal**

```typescript
// frontend/src/features/workflows/WorkflowBuilderModal.tsx

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUILT_IN_WORKFLOW_CARDS } from '../generation/builtInWorkflowCards';
import type { CustomWorkflowSummary } from '../generation/WorkflowCardPicker';
import type { CreateWorkflowFormValues } from './useCustomWorkflows';

const DIMENSIONS = [
  { key: 'emotions',     label: 'Emotions',     tooltip: 'Drives the emotional register of the hook and body' },
  { key: 'psychology',   label: 'Psychology',   tooltip: 'Maps audience pain points and cognitive triggers' },
  { key: 'persuasion',   label: 'Persuasion',   tooltip: 'Selects a persuasion framework (AIDA, PAS, etc.)' },
  { key: 'copywriting',  label: 'Copywriting',  tooltip: 'Controls hook aggression, power words, and CTA style' },
  { key: 'storytelling', label: 'Storytelling', tooltip: 'Determines how much narrative arc is applied' },
  { key: 'typography',   label: 'Typography',   tooltip: 'Sets line breaks, whitespace, and emoji usage' },
  { key: 'vocabulary',   label: 'Vocabulary',   tooltip: 'Injects domain-specific terms and tone markers' },
] as const;

function getLevelName(v: number) {
  if (v <= 10) return 'Off';
  if (v <= 30) return 'Light';
  if (v <= 50) return 'Moderate';
  if (v <= 80) return 'Strong';
  return 'Max';
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  emotions: 50, psychology: 50, persuasion: 50,
  copywriting: 50, storytelling: 50, typography: 50, vocabulary: 50,
};

interface WorkflowBuilderModalProps {
  isOpen: boolean;
  workflowToEdit?: CustomWorkflowSummary;
  onClose: () => void;
  onSave: (values: CreateWorkflowFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isSaving?: boolean;
}

export function WorkflowBuilderModal({
  isOpen,
  workflowToEdit,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
}: WorkflowBuilderModalProps) {
  const isEditing = !!workflowToEdit;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [optimizationTarget, setOptimizationTarget] = useState('');
  const [generationInstruction, setGenerationInstruction] = useState('');
  const [extendsWorkflowId, setExtendsWorkflowId] = useState('base');
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);
  const [nameError, setNameError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (workflowToEdit) {
      setName(workflowToEdit.name);
      setDescription(workflowToEdit.description);
      setOptimizationTarget(workflowToEdit.optimizationTarget);
      setExtendsWorkflowId(workflowToEdit.extendsWorkflowId ?? 'base');
    } else {
      setName(''); setDescription(''); setOptimizationTarget('');
      setGenerationInstruction(''); setExtendsWorkflowId('base');
      setWeights(DEFAULT_WEIGHTS);
    }
  }, [workflowToEdit, isOpen]);

  if (!isOpen) return null;

  function handleWeightChange(key: string, value: number) {
    setWeights(w => ({ ...w, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setNameError('Name is required'); return; }
    if (name.trim().length > 40) { setNameError('Max 40 characters'); return; }
    setNameError('');
    await onSave({ name: name.trim(), description, optimizationTarget, generationInstruction, extendsWorkflowId, dimensionWeights: weights });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading text-base font-bold text-ink">
            {isEditing ? 'Edit Workflow' : 'Create Your Workflow'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-border/30">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Name <span className="text-red-500">*</span></label>
            <input
              data-testid="workflow-builder-name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. My Founder Voice"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            />
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            <p className="text-[10px] text-muted mt-0.5">{name.length}/40</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Description</label>
            <input
              data-testid="workflow-builder-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="One sentence — what does this workflow produce?"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            />
          </div>

          {/* Base workflow */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Extends (base workflow)</label>
            <select
              data-testid="workflow-builder-base"
              value={extendsWorkflowId}
              onChange={e => setExtendsWorkflowId(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            >
              {BUILT_IN_WORKFLOW_CARDS.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Generation instruction */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Generation instruction</label>
            <textarea
              data-testid="workflow-builder-instruction"
              value={generationInstruction}
              onChange={e => setGenerationInstruction(e.target.value)}
              rows={3}
              placeholder="e.g. Always open with a personal story. Never use lists. End with a vulnerable question."
              className="w-full resize-y rounded-xl border border-border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            />
          </div>

          {/* Dimension sliders */}
          <div>
            <p className="text-xs font-bold text-ink mb-3">Dimension weights</p>
            <div className="grid grid-cols-1 gap-3">
              {DIMENSIONS.map(({ key, label, tooltip }) => {
                const val = weights[key] ?? 50;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-ink" title={tooltip}>{label}</span>
                      <span className="text-xs font-bold text-primary">{getLevelName(val)}</span>
                    </div>
                    <p className="text-[10px] text-muted mb-1">{tooltip}</p>
                    <input
                      type="range" min="0" max="100" step="1" value={val}
                      onChange={e => handleWeightChange(key, Number(e.target.value))}
                      className="w-full accent-primary"
                      data-testid={`workflow-builder-slider-${key}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => workflowToEdit && onDelete(workflowToEdit.id)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                variant="ink"
                size="sm"
                disabled={isSaving}
                data-testid="workflow-builder-save"
              >
                {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create workflow'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Compile check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Commit**

```bash
git add frontend/src/features/workflows/useCustomWorkflows.ts \
        frontend/src/features/workflows/WorkflowBuilderModal.tsx
git commit -m "feat: add useCustomWorkflows hook and WorkflowBuilderModal"
```

---

## Stage 3 — Live Intelligence Panel

### Task 11: nodeInsightSummary (worker)

**Files:**
- Create: `worker/src/generation/nodeInsightSummary.ts`

- [ ] **Write the file**

```typescript
// worker/src/generation/nodeInsightSummary.ts
/**
 * Converts a node's typed output JSON into a short human-readable insight
 * string for display in the frontend EnrichmentProgressPanel.
 *
 * Returns null for nodes that don't produce summarisable output (e.g. validators).
 * Never throws — malformed output just returns null.
 */

export function buildNodeInsightSummary(nodeId: string, outputJson: string): string | null {
  try {
    const output = JSON.parse(outputJson) as Record<string, unknown>;
    switch (nodeId) {
      case 'psychology-analyzer': {
        const emotion = output.dominantEmotion as string | undefined;
        const triggers = (output.triggers as Array<{ type: string }> | undefined)
          ?.slice(0, 2)
          .map(t => t.type)
          .join(', ');
        if (emotion || triggers) {
          return [emotion && `Dominant emotion: ${emotion}`, triggers && `Triggers: ${triggers}`]
            .filter(Boolean)
            .join('. ');
        }
        return null;
      }

      case 'research-context': {
        const facts = output.keyFacts as string[] | undefined;
        const trends = output.trends as string[] | undefined;
        const first = facts?.[0] ?? trends?.[0];
        if (!first) return null;
        return `Found: ${first}`;
      }

      case 'vocabulary-selector': {
        const words = (output.powerWords as string[] | undefined)?.slice(0, 3).join(', ');
        return words ? `Power words: ${words}` : null;
      }

      case 'hook-designer': {
        const hooks = output.hooks as Array<{ type: string; text: string }> | undefined;
        const rec = hooks?.[output.recommendedIndex as number ?? 0];
        return rec ? `Hook (${rec.type}): "${rec.text.slice(0, 60)}…"` : null;
      }

      case 'narrative-arc': {
        const arc = (output as { arc?: string }).arc;
        const cta = (output as { ctaType?: string }).ctaType;
        if (!arc) return null;
        return cta ? `Arc: ${arc} · CTA: ${cta}` : `Arc: ${arc}`;
      }

      case 'draft-generator': {
        const variants = output.variants as Array<{ hookType?: string }> | undefined;
        if (!variants?.length) return null;
        return `${variants.length} variants generated`;
      }

      case 'tone-calibrator':
        return 'Tone adjusted to author voice';

      case 'constraint-validator':
        return null; // not summarisable

      default:
        return null;
    }
  } catch {
    return null;
  }
}
```

- [ ] **Write unit tests**

```typescript
// worker/src/generation/__tests__/nodeInsightSummary.test.ts
import { describe, it, expect } from 'vitest';
import { buildNodeInsightSummary } from '../nodeInsightSummary';

describe('buildNodeInsightSummary', () => {
  it('returns null for constraint-validator', () => {
    expect(buildNodeInsightSummary('constraint-validator', '{}')).toBeNull();
  });

  it('extracts dominantEmotion from psychology-analyzer output', () => {
    const output = JSON.stringify({
      dominantEmotion: 'aspiration',
      triggers: [{ type: 'fomo', rationale: '' }],
    });
    const result = buildNodeInsightSummary('psychology-analyzer', output);
    expect(result).toContain('aspiration');
    expect(result).toContain('fomo');
  });

  it('extracts first fact from research-context', () => {
    const output = JSON.stringify({ keyFacts: ['70% of professionals feel burnout'] });
    const result = buildNodeInsightSummary('research-context', output);
    expect(result).toContain('70% of professionals');
  });

  it('returns null gracefully for malformed JSON', () => {
    expect(buildNodeInsightSummary('hook-designer', 'NOT_JSON')).toBeNull();
  });

  it('returns null for unknown nodeId', () => {
    expect(buildNodeInsightSummary('unknown-node', '{}')).toBeNull();
  });

  it('extracts recommended hook text', () => {
    const output = JSON.stringify({
      hooks: [{ type: 'contrarian', text: 'Most people get this wrong' }],
      recommendedIndex: 0,
    });
    const result = buildNodeInsightSummary('hook-designer', output);
    expect(result).toContain('contrarian');
    expect(result).toContain('Most people get this wrong');
  });
});
```

- [ ] **Run tests**

```bash
cd worker && npx vitest run src/generation/__tests__/nodeInsightSummary.test.ts
```
Expected: 6 passing

- [ ] **Commit**

```bash
git add worker/src/generation/nodeInsightSummary.ts \
        worker/src/generation/__tests__/nodeInsightSummary.test.ts
git commit -m "feat: add nodeInsightSummary for SSE enrichment progress events"
```

---

### Task 12: SSE stream enrichment events

**Files:**
- Modify: `worker/src/index.ts` (the `/api/generate/stream` handler)

- [ ] **Read the current stream handler to understand where to insert the subscriber**

```bash
grep -n "generate/stream\|callGenerationWorkerStream\|enrichment" worker/src/index.ts | head -30
```

- [ ] **Add SSE enrichment event emission**

Inside the `/api/generate/stream` handler, before `callGenerationWorkerStream()` is called, add:

```typescript
import { lifecycleEventBus } from './engine/events/LifecycleEventBus';
import { buildNodeInsightSummary } from './generation/nodeInsightSummary';
import type { NodeCompletedEvent } from './engine/types';

// Inside the stream handler, before callGenerationWorkerStream():
const enrichmentQueue: string[] = [];

const unsubscribeNodeCompleted = lifecycleEventBus.subscribe<NodeCompletedEvent>(
  'node:completed',
  (event) => {
    // Handler is synchronous — push to queue; SSE writer drains the queue
    const insightSummary = buildNodeInsightSummary(event.nodeId, '{}'); // outputJson not available here; summary based on nodeId only
    const ssePayload = JSON.stringify({
      type: 'enrichment:node_completed',
      nodeId: event.nodeId,
      durationMs: event.durationMs,
      insightSummary,
    });
    enrichmentQueue.push(`data: ${ssePayload}\n\n`);
  },
);

// After stream completes / on cleanup:
// unsubscribeNodeCompleted();
```

Modify the SSE transform stream to drain `enrichmentQueue` before each forwarded chunk:

```typescript
// Inside TransformStream flush or transform:
const transform = new TransformStream({
  transform(chunk, controller) {
    // Drain any queued enrichment events first
    while (enrichmentQueue.length > 0) {
      controller.enqueue(new TextEncoder().encode(enrichmentQueue.shift()!));
    }
    controller.enqueue(chunk);
  },
  flush() {
    unsubscribeNodeCompleted();
  },
});
```

- [ ] **Compile check**

```bash
cd worker && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Commit**

```bash
git add worker/src/index.ts
git commit -m "feat: emit enrichment:node_completed SSE events during streaming generation"
```

---

### Task 13: EnrichmentProgressPanel + nodeProgressLabels

**Files:**
- Create: `frontend/src/features/generation/nodeProgressLabels.ts`
- Create: `frontend/src/features/generation/EnrichmentProgressPanel.tsx`

- [ ] **Write nodeProgressLabels.ts**

```typescript
// frontend/src/features/generation/nodeProgressLabels.ts

export interface NodeProgressLabel {
  pending: string;
  done: string;
}

export const NODE_PROGRESS_LABELS: Record<string, NodeProgressLabel> = {
  'psychology-analyzer': { pending: 'Analysing your audience…',     done: 'Audience psychology mapped' },
  'research-context':    { pending: 'Gathering research context…',  done: 'Research context ready' },
  'vocabulary-selector': { pending: 'Selecting vocabulary…',        done: 'Vocabulary selected' },
  'hook-designer':       { pending: 'Designing hook options…',      done: 'Hook options ready' },
  'narrative-arc':       { pending: 'Planning narrative structure…', done: 'Narrative arc set' },
  'draft-generator':     { pending: 'Generating variants…',         done: 'Variants generated' },
  'tone-calibrator':     { pending: 'Calibrating tone to your voice…', done: 'Tone calibrated' },
  'constraint-validator':{ pending: 'Validating constraints…',      done: 'Constraints validated' },
};

export interface EnrichmentNodeEvent {
  type: 'enrichment:node_completed';
  nodeId: string;
  durationMs: number;
  insightSummary: string | null;
}

/** Parses a raw SSE `data:` line value. Returns null if not an enrichment event. */
export function parseEnrichmentEvent(rawData: string): EnrichmentNodeEvent | null {
  try {
    const parsed = JSON.parse(rawData) as { type?: string };
    if (parsed.type !== 'enrichment:node_completed') return null;
    return parsed as EnrichmentNodeEvent;
  } catch {
    return null;
  }
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
```

- [ ] **Write EnrichmentProgressPanel.tsx**

```typescript
// frontend/src/features/generation/EnrichmentProgressPanel.tsx

import { CheckCircle, Loader2, Circle } from 'lucide-react';
import { NODE_PROGRESS_LABELS, formatDuration, type EnrichmentNodeEvent } from './nodeProgressLabels';

export interface NodeProgressState {
  nodeId: string;
  status: 'pending' | 'running' | 'done';
  durationMs?: number;
  insightSummary?: string | null;
}

interface EnrichmentProgressPanelProps {
  /** Ordered list of nodes that are part of the current workflow */
  expectedNodeIds: string[];
  /** Events received so far via SSE */
  completedEvents: EnrichmentNodeEvent[];
  /** Which node is currently running (from node:started events if available, else first pending) */
  activeNodeId?: string | null;
}

export function EnrichmentProgressPanel({
  expectedNodeIds,
  completedEvents,
  activeNodeId,
}: EnrichmentProgressPanelProps) {
  const completedMap = new Map(completedEvents.map(e => [e.nodeId, e]));

  // Build display list from expectedNodeIds, then add any completed nodes not in expected
  const allNodeIds = [
    ...expectedNodeIds,
    ...completedEvents.map(e => e.nodeId).filter(id => !expectedNodeIds.includes(id)),
  ];

  return (
    <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3 space-y-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-indigo-600 mb-2">
        Enrichment in progress
      </p>
      {allNodeIds.map(nodeId => {
        const labels = NODE_PROGRESS_LABELS[nodeId];
        const event = completedMap.get(nodeId);
        const isActive = activeNodeId === nodeId;
        const isDone = !!event;

        return (
          <div key={nodeId} className="flex items-start gap-2">
            {isDone ? (
              <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
            ) : isActive ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-500 animate-spin" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-300" />
            )}
            <div className="min-w-0">
              <span className={`text-xs font-medium ${isDone ? 'text-ink' : isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
                {isDone && labels
                  ? labels.done
                  : isActive && labels
                    ? labels.pending
                    : labels?.pending ?? nodeId}
                {isDone && event?.durationMs != null && (
                  <span className="ml-1.5 text-[0.6rem] text-muted font-normal">
                    {formatDuration(event.durationMs)}
                  </span>
                )}
              </span>
              {isDone && event?.insightSummary && (
                <p className="text-[0.6rem] text-slate-500 leading-relaxed mt-0.5">
                  {event.insightSummary}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Write smoke test**

```typescript
// frontend/src/features/generation/__tests__/EnrichmentProgressPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EnrichmentProgressPanel } from '../EnrichmentProgressPanel';

describe('EnrichmentProgressPanel', () => {
  it('shows pending label for uncompleted nodes', () => {
    render(
      <EnrichmentProgressPanel
        expectedNodeIds={['psychology-analyzer']}
        completedEvents={[]}
      />
    );
    expect(screen.getByText('Analysing your audience…')).toBeInTheDocument();
  });

  it('shows done label and duration for completed nodes', () => {
    render(
      <EnrichmentProgressPanel
        expectedNodeIds={['psychology-analyzer']}
        completedEvents={[{
          type: 'enrichment:node_completed',
          nodeId: 'psychology-analyzer',
          durationMs: 1200,
          insightSummary: 'Dominant emotion: aspiration',
        }]}
      />
    );
    expect(screen.getByText('Audience psychology mapped')).toBeInTheDocument();
    expect(screen.getByText('1.2s')).toBeInTheDocument();
    expect(screen.getByText('Dominant emotion: aspiration')).toBeInTheDocument();
  });
});
```

- [ ] **Run tests**

```bash
cd frontend && npx vitest run src/features/generation/__tests__/EnrichmentProgressPanel.test.tsx
```
Expected: 2 passing

- [ ] **Commit**

```bash
git add frontend/src/features/generation/nodeProgressLabels.ts \
        frontend/src/features/generation/EnrichmentProgressPanel.tsx \
        frontend/src/features/generation/__tests__/EnrichmentProgressPanel.test.tsx
git commit -m "feat: add EnrichmentProgressPanel and nodeProgressLabels"
```

---

### Task 14: Wire EnrichmentProgressPanel into GenerationPanel

**Files:**
- Modify: `frontend/src/features/generation/GenerationPanel.tsx`

- [ ] **Add SSE event parsing and panel wiring**

Add to `GenerationPanel.tsx`:

```typescript
import { EnrichmentProgressPanel } from './EnrichmentProgressPanel';
import { parseEnrichmentEvent, type EnrichmentNodeEvent } from './nodeProgressLabels';
```

Add to `GenerationPanelProps`:
```typescript
enrichmentEvents?: EnrichmentNodeEvent[];
activeEnrichmentNodeId?: string | null;
expectedEnrichmentNodeIds?: string[];
```

Replace the `{loadingAction === 'variants' ? 'Generating…' : '4 Variants'}` spinner section to also show the panel:

```tsx
{loadingAction === 'variants' && enrichmentEvents !== undefined && (
  <div className="mt-4">
    <EnrichmentProgressPanel
      expectedNodeIds={expectedEnrichmentNodeIds ?? [
        'psychology-analyzer', 'research-context', 'vocabulary-selector',
        'hook-designer', 'narrative-arc', 'draft-generator', 'tone-calibrator', 'constraint-validator',
      ]}
      completedEvents={enrichmentEvents}
      activeNodeId={activeEnrichmentNodeId}
    />
  </div>
)}
```

- [ ] **Compile check + run existing tests**

```bash
cd frontend && npx tsc --noEmit && npx vitest run
```

- [ ] **Commit**

```bash
git add frontend/src/features/generation/GenerationPanel.tsx
git commit -m "feat: show EnrichmentProgressPanel during variant generation"
```

---

## Stage 4 — Variant Angle Display

### Task 15: Promote variant rationale to headline

**Files:**
- Modify: `frontend/src/features/generation/GenerationPanel.tsx`

- [ ] **Restructure variant card layout**

In the `variantsPreview.variants.map(...)` block, change from current layout to:

```tsx
<div key={variant.id} className={`rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/40 to-white/80 backdrop-blur-sm shadow-md transition-all duration-200 hover:shadow-lg hover:border-violet-300/80 ${compact ? 'p-3' : 'p-4'}`}>
  <div className="flex flex-col gap-2.5">
    {/* Header row: variant number + workflow name */}
    <div className="flex items-start justify-between gap-2">
      <p className={`font-bold uppercase tracking-[0.2em] text-violet-700/80 ${compact ? 'text-[0.65rem]' : 'text-xs'}`}>
        Variant {index + 1}
      </p>
      {variant.postType && (
        <span className="text-[0.55rem] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
          {variant.postType.replace(/-/g, ' ')}
        </span>
      )}
    </div>

    {/* Rationale as headline — the creative angle */}
    {variant.variant_rationale && (
      <p className={`font-semibold text-ink leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
        "{variant.variant_rationale}"
      </p>
    )}

    {/* Hook / Arc badges below the headline */}
    {(variant.hookType || variant.arcType) && (
      <div className="flex flex-wrap gap-1.5">
        {variant.hookType && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[0.6rem] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
            {variant.hookType.replace(/_/g, ' ')}
          </span>
        )}
        {variant.arcType && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {variant.arcType.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    )}

    {/* Preview text */}
    <p className={`text-ink font-medium ${compact ? 'line-clamp-4 text-xs leading-5' : 'line-clamp-5 text-sm leading-6'}`}>
      {variant.fullText}
    </p>

    {/* Actions */}
    <div className="flex flex-wrap gap-2 mt-1">
      {onSavePreviewVariant ? (
        <Button type="button" variant="outline" size="sm"
          onClick={() => onSavePreviewVariant(index)}
          disabled={(previewVariantSaveByIndex[index] ?? 'idle') === 'saving' || variantsPreview.variants.length !== 4}
          className="px-2.5 py-1.5 text-xs font-bold">
          {saveLabel(index)}
        </Button>
      ) : null}
      <Button type="button" variant="secondary" size="sm"
        onClick={() => onApplyVariant(index)}
        className="px-2.5 py-1.5 text-xs font-bold">
        Review changes
      </Button>
    </div>

    {previewVariantSaveErrors[index] ? (
      <p className="text-xs text-red-700 font-semibold">{previewVariantSaveErrors[index]}</p>
    ) : null}
  </div>
</div>
```

- [ ] **Compile check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add frontend/src/features/generation/GenerationPanel.tsx
git commit -m "feat: promote variant_rationale to headline in variant cards"
```

---

## Stage 5 — Justification Panel

### Task 16: GenerationJustificationPanel

**Files:**
- Create: `frontend/src/features/review/GenerationJustificationPanel.tsx`

- [ ] **Write the component**

```typescript
// frontend/src/features/review/GenerationJustificationPanel.tsx

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { NodeRunItem } from '../../services/backendApi';
import { CHANNEL_DISPLAY_NAMES } from '../../lib/channelConstants';

interface JustificationData {
  workflowName: string | null;
  audienceDescription: string | null;
  dominantEmotion: string | null;
  triggers: string[];
  arcType: string | null;
  hookType: string | null;
  ctaType: string | null;
  powerWords: string[];
  avoidWords: string[];
  channel: string | null;
  wordCount: number | null;
  withinRange: boolean | null;
}

function extractJustification(nodeRuns: NodeRunItem[]): JustificationData {
  const getOutput = (nodeId: string) => {
    const run = nodeRuns.find(r => r.node_id === nodeId);
    if (!run) return null;
    try { return JSON.parse(run.output_json) as Record<string, unknown>; } catch { return null; }
  };

  const psych = getOutput('psychology-analyzer');
  const vocab = getOutput('vocabulary-selector');
  const arc = getOutput('narrative-arc');
  const validator = getOutput('constraint-validator');

  return {
    workflowName: null, // not stored in nodeRuns; could be added later
    audienceDescription: psych?.audienceDescription as string | null ?? null,
    dominantEmotion: psych?.dominantEmotion as string | null ?? null,
    triggers: ((psych?.triggers as Array<{ type: string }> | undefined) ?? []).slice(0, 3).map(t => t.type),
    arcType: arc?.arc as string | null ?? null,
    hookType: (arc as { selectedHook?: { type: string } } | null)?.selectedHook?.type ?? null,
    ctaType: arc?.ctaType as string | null ?? null,
    powerWords: ((vocab?.powerWords as string[] | undefined) ?? []).slice(0, 5),
    avoidWords: ((vocab?.avoidWords as string[] | undefined) ?? []).slice(0, 3),
    channel: null,
    wordCount: (validator as { variants?: Array<{ wordCount: number }> } | null)?.variants?.[0]?.wordCount ?? null,
    withinRange: (validator as { allPassed?: boolean } | null)?.allPassed ?? null,
  };
}

interface Section {
  title: string;
  lines: string[];
}

function buildSections(data: JustificationData): Section[] {
  const sections: Section[] = [];

  const audienceLines: string[] = [];
  if (data.audienceDescription) audienceLines.push(data.audienceDescription);
  if (data.dominantEmotion) audienceLines.push(`Dominant emotion: ${data.dominantEmotion}`);
  if (data.triggers.length) audienceLines.push(`Key triggers: ${data.triggers.join(', ')}`);
  if (audienceLines.length) sections.push({ title: 'Audience insight', lines: audienceLines });

  const structureLines: string[] = [];
  if (data.arcType) structureLines.push(`Arc: ${data.arcType.replace(/_/g, ' ')}`);
  if (data.hookType) structureLines.push(`Hook: ${data.hookType.replace(/_/g, ' ')}`);
  if (data.ctaType) structureLines.push(`CTA style: ${data.ctaType.replace(/_/g, ' ')}`);
  if (structureLines.length) sections.push({ title: 'Structure', lines: structureLines });

  const vocabLines: string[] = [];
  if (data.powerWords.length) vocabLines.push(`Power words: ${data.powerWords.join(', ')}`);
  if (data.avoidWords.length) vocabLines.push(`Avoided: ${data.avoidWords.join(', ')}`);
  if (vocabLines.length) sections.push({ title: 'Vocabulary', lines: vocabLines });

  const channelLines: string[] = [];
  if (data.wordCount != null) {
    const status = data.withinRange === false ? ' ⚠ outside target' : '';
    channelLines.push(`Word count: ${data.wordCount}${status}`);
  }
  if (channelLines.length) sections.push({ title: 'Constraints', lines: channelLines });

  return sections;
}

interface GenerationJustificationPanelProps {
  nodeRuns: NodeRunItem[];
  isLoading?: boolean;
}

export function GenerationJustificationPanel({
  nodeRuns,
  isLoading = false,
}: GenerationJustificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) return null;
  if (!nodeRuns.length) return null;

  const data = extractJustification(nodeRuns);
  const sections = buildSections(data);
  if (!sections.length) return null;

  return (
    <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/30">
      <button
        type="button"
        onClick={() => setIsOpen(p => !p)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-xs font-bold text-indigo-700">Why this post was built this way</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-indigo-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 border-t border-indigo-200/60 pt-3">
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-indigo-500 mb-1">
                {section.title}
              </p>
              {section.lines.map(line => (
                <p key={line} className="text-xs text-slate-700 leading-relaxed">{line}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Write a test**

```typescript
// frontend/src/features/review/__tests__/GenerationJustificationPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GenerationJustificationPanel } from '../GenerationJustificationPanel';
import type { NodeRunItem } from '../../../services/backendApi';

const mockNodeRuns: NodeRunItem[] = [
  {
    node_id: 'psychology-analyzer',
    input_json: '{}',
    output_json: JSON.stringify({
      dominantEmotion: 'aspiration',
      triggers: [{ type: 'fomo', rationale: '' }],
      audienceDescription: 'Mid-level professionals seeking career growth',
    }),
    model: 'gemini',
    duration_ms: 1200,
    status: 'completed',
    error: null,
  },
];

describe('GenerationJustificationPanel', () => {
  it('renders nothing when nodeRuns is empty', () => {
    const { container } = render(<GenerationJustificationPanel nodeRuns={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows collapsed trigger button', () => {
    render(<GenerationJustificationPanel nodeRuns={mockNodeRuns} />);
    expect(screen.getByText('Why this post was built this way')).toBeInTheDocument();
  });

  it('expands to show audience insight on click', () => {
    render(<GenerationJustificationPanel nodeRuns={mockNodeRuns} />);
    fireEvent.click(screen.getByText('Why this post was built this way'));
    expect(screen.getByText('Dominant emotion: aspiration')).toBeInTheDocument();
    expect(screen.getByText('Key triggers: fomo')).toBeInTheDocument();
  });
});
```

- [ ] **Run tests**

```bash
cd frontend && npx vitest run src/features/review/__tests__/GenerationJustificationPanel.test.tsx
```
Expected: 3 passing

- [ ] **Commit**

```bash
git add frontend/src/features/review/GenerationJustificationPanel.tsx \
        frontend/src/features/review/__tests__/GenerationJustificationPanel.test.tsx
git commit -m "feat: add GenerationJustificationPanel for post editor"
```

---

### Task 17: Wire justification panel into ReviewWorkspace

**Files:**
- Modify: `frontend/src/features/review/ReviewWorkspace.tsx`

- [ ] **Read the current editor layout section**

```bash
grep -n "editorLayout\|GenerationPanel\|nodeRuns\|getNodeRuns" frontend/src/features/review/ReviewWorkspace.tsx | head -20
```

- [ ] **Add the panel to the editor layout**

Add import at top of ReviewWorkspace.tsx:
```typescript
import { GenerationJustificationPanel } from './GenerationJustificationPanel';
```

In the editor screen section, after the existing generation panel (or at the bottom of the editor sidebar), add:
```tsx
{nodeRuns && nodeRuns.length > 0 && (
  <GenerationJustificationPanel nodeRuns={nodeRuns} />
)}
```

`nodeRuns` should come from `useReviewFlow()` which already calls `getNodeRuns` — check that it's being passed down and add it if not.

- [ ] **Compile check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Commit**

```bash
git add frontend/src/features/review/ReviewWorkspace.tsx
git commit -m "feat: show GenerationJustificationPanel in post editor"
```

---

## Stage 6 — EnrichmentFlowPage Redesign

### Task 18: getNodeCatalog action (already added in Task 9)

The `getNodeCatalog` action was added to `index.ts` in Task 9. No additional work needed here.

---

### Task 19: Redesign EnrichmentFlowPage

**Files:**
- Modify: `frontend/src/pages/EnrichmentFlowPage.tsx`

- [ ] **Add workflow context header section**

Replace the static `FLOW_NODES` constant and all hardcoded node arrays with a dynamic approach. Add these at the top of the file (replacing the static `FLOW_NODES` block):

```typescript
// Fetched once on mount from getNodeCatalog
interface NodeCatalogEntry { id: string; name: string; description: string; }

// Inside the component, add state:
const [nodeCatalog, setNodeCatalog] = useState<NodeCatalogEntry[]>([]);

useEffect(() => {
  api.post<{ nodes: NodeCatalogEntry[] }>('getNodeCatalog', {}, idToken)
    .then(res => setNodeCatalog(res.nodes ?? []))
    .catch(() => {});
}, [idToken]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Add workflow context header above the DAG canvas**

In the main content area, before `<DraggableCanvas>`, add:

```tsx
{selectedRun && (
  <div className="px-4 py-2.5 border-b border-border bg-canvas shrink-0">
    <div className="flex flex-wrap items-center gap-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Workflow</p>
        <p className="text-sm font-semibold text-ink">
          {/* patternName stored in pipeline_state; rows have patternName field */}
          {rows.find(r => r.topicId === selectedRun?.topicId)?.patternName ?? 'Unknown'}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Channel</p>
        <p className="text-sm font-semibold text-ink capitalize">
          {rows.find(r => r.topicId === selectedRun?.topicId)?.topicDeliveryChannel ?? '—'}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Nodes ran</p>
        <p className="text-sm font-semibold text-ink">
          {loadedNodeRuns?.length ?? 0}
        </p>
      </div>
    </div>
  </div>
)}
```

- [ ] **Add "Summary" tab to NodeDetailPanel**

In `NodeDetailPanel`, add a tab switcher for "Summary" vs "Raw output". The Summary tab uses the same node-output-to-readable logic as `extractJustification` in the justification panel — extract the key fields and render them as readable paragraphs instead of raw JSON.

Add to `NodeDetailPanel` state:
```typescript
const [activeTab, setActiveTab] = useState<'summary' | 'raw'>('summary');
```

Replace the single raw output `<pre>` block with:
```tsx
{/* Tab switcher */}
<div className="flex gap-1 border-b border-border mb-3">
  {(['summary', 'raw'] as const).map(tab => (
    <button
      key={tab}
      type="button"
      onClick={() => setActiveTab(tab)}
      className={cn(
        'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors',
        activeTab === tab ? 'text-ink border-b-2 border-primary' : 'text-muted hover:text-ink',
      )}
    >
      {tab}
    </button>
  ))}
</div>

{activeTab === 'raw' ? (
  <pre className="max-h-64 overflow-y-auto rounded-xl border border-border bg-canvas p-3 text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap font-mono">
    {nodeRun.output}
  </pre>
) : (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-ink/80 leading-relaxed space-y-1">
    {/* Render key fields from parsed output */}
    {Object.entries((() => { try { return JSON.parse(nodeRun.output) as Record<string, unknown>; } catch { return {}; } })())
      .filter(([, v]) => typeof v === 'string' || (Array.isArray(v) && v.length > 0))
      .slice(0, 6)
      .map(([k, v]) => (
        <p key={k}><span className="font-semibold">{k}:</span>{' '}
          {Array.isArray(v) ? (v as string[]).slice(0, 3).join(', ') : String(v).slice(0, 120)}
        </p>
      ))}
  </div>
)}
```

- [ ] **Add execution timeline toggle view**

Add a toggle button in the header:
```tsx
const [showTimeline, setShowTimeline] = useState(false);
// In header:
<button type="button" onClick={() => setShowTimeline(p => !p)}
  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/30 hover:text-ink transition-colors">
  {showTimeline ? 'DAG view' : 'Timeline view'}
</button>
```

Add timeline view (shown when `showTimeline` is true, replacing the `<DraggableCanvas>`):
```tsx
{showTimeline && loadedNodeRuns && (
  <div className="flex-1 overflow-y-auto p-4">
    <p className="text-xs font-bold text-muted mb-3">Execution timeline</p>
    <div className="space-y-2">
      {[...loadedNodeRuns]
        .sort((a, b) => a.durationMs - b.durationMs)
        .map(run => {
          const maxMs = Math.max(...loadedNodeRuns.map(r => r.durationMs), 1);
          const width = Math.max(4, (run.durationMs / maxMs) * 100);
          return (
            <div key={run.nodeId} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-[11px] text-ink font-medium truncate">
                {nodeCatalog.find(n => n.id === run.nodeId)?.name ?? run.nodeId}
              </span>
              <div className="flex-1 rounded-full bg-border h-2 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', run.status === 'failed' ? 'bg-red-400' : 'bg-primary')}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-[11px] text-muted text-right">
                {run.durationMs < 1000 ? `${run.durationMs}ms` : `${(run.durationMs / 1000).toFixed(1)}s`}
              </span>
            </div>
          );
        })}
    </div>
  </div>
)}
```

- [ ] **Replace static enrichment nodes with dynamic catalog**

In the DAG canvas, replace `ENRICHMENT_NODESToRender.map(...)` with:
```tsx
{(executedEnrichmentNodeIds?.length
  ? executedEnrichmentNodeIds
  : nodeCatalog.filter(n => !['constraint-validator', 'draft-generator', 'tone-calibrator'].includes(n.id)).map(n => n.id)
).map(nodeId => {
  const catalogEntry = nodeCatalog.find(n => n.id === nodeId);
  const flowNode: FlowNode = {
    id: nodeId,
    label: catalogEntry?.name ?? nodeId,
    type: 'llm',
    description: catalogEntry?.description ?? '',
    promptTemplate: '',
    group: 'enrichment',
  };
  return <NodeCard key={nodeId} {...cardProps(flowNode)} />;
})}
```

- [ ] **Final compile check**

```bash
cd worker && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit
```
Expected: 0 errors in both

- [ ] **Run full test suite**

```bash
cd frontend && npx vitest run
```
Expected: All passing

- [ ] **Commit**

```bash
git add frontend/src/pages/EnrichmentFlowPage.tsx
git commit -m "feat: redesign EnrichmentFlowPage with dynamic nodes, workflow header, summary tabs, and timeline view"
```

---

## Final: Full compile + review

- [ ] **Run full TypeScript compile on both packages**

```bash
cd worker && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```
Expected: 0 errors in both

- [ ] **Run all tests**

```bash
cd worker && npx vitest run
cd ../frontend && npx vitest run
```

- [ ] **Manual smoke test checklist**

1. Open generation panel — workflow cards appear instead of dropdown
2. Select "Viral Story" card — card gets ring highlight
3. Click "4 Variants" — enrichment progress panel shows nodes completing live
4. Variants appear — first thing visible is the rationale headline, not metadata badges
5. Click "Review changes" on a variant — justification panel is visible in editor, expands to show audience insight
6. Open Enrichment Flow page — select a topic — workflow header shows workflow name
7. Click a node with output — "Summary" tab shows readable key fields
8. Toggle "Timeline view" — bar chart shows node durations

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: complete enrichment UX redesign — workflow cards, custom workflows, live intelligence panel, variant angles, justification panel, enrichment flow redesign"
```
