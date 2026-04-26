# Enrichment UX Redesign + Custom Workflows — Design Spec

**Date:** 2026-04-26
**Status:** Approved
**Scope:** Frontend generation UX, custom workflow CRUD, live intelligence panel, enrichment flow page redesign

---

## 1. Problem Statement

The generation pipeline is already excellent: a full DAG-based 8-node enrichment engine with lifecycle events, importance levels, channel constraints, and workflow inheritance. The UX does not reflect this quality. Users see a spinner, then 4 variants they can barely differentiate. The intelligence gathered — psychology, vocabulary, hooks, narrative arc — is invisible and undiscoverable.

Three specific gaps:
1. **Workflow selection** is a plain dropdown of post types with disconnected dimension sliders. Users don't understand what they're choosing or why it matters.
2. **No user-created workflows.** Every creator has a distinct style but there's no way to encode it permanently into a named workflow card.
3. **Generation is a black box.** The enrichment nodes run in silence. Their outputs — the most valuable part of the system — are buried in a dev-only debug page.

---

## 2. Goals

- Replace the post-type dropdown + sliders with named **workflow cards** that communicate creative philosophy, not parameter values.
- Allow users to **create, name, and save custom workflow cards** by configuring dimension weights and a generation instruction.
- Surface enrichment intelligence as a **live progress panel** during generation — nodes report what they found as they complete.
- Make variant cards show **creative angle as the headline**, not metadata badges.
- Add a **justification panel** in the editor that explains why the post was built the way it was.
- Redesign **EnrichmentFlowPage** to show real per-topic workflow data, not a static diagram.

---

## 3. What Already Exists (do not re-build)

| Piece | Location | Status |
|---|---|---|
| `LifecycleEventBus` + all event types | `worker/src/engine/events/LifecycleEventBus.ts` | ✅ Built |
| `WorkflowDefinition` with `extendsWorkflowId` | `worker/src/engine/types.ts` | ✅ Built |
| `DimensionWeights` + `dimensionValueToImportance()` | `worker/src/engine/types.ts` | ✅ Built |
| `WorkflowRunner` — DAG execution + event emission | `worker/src/engine/executor/WorkflowRunner.ts` | ✅ Built |
| `CHANNEL_CONSTRAINTS_MAP` | `worker/src/engine/types.ts` | ✅ Built |
| 14 built-in workflow definitions | `worker/src/engine/workflows/definitions/` | ✅ Built |
| SSE streaming endpoint | `worker/src/index.ts` `/api/generate/stream` | ✅ Built |
| `EnrichmentFlowPage` (dev inspector) | `frontend/src/pages/EnrichmentFlowPage.tsx` | ✅ Built (to be redesigned) |
| `GenerationPanel` with sliders | `frontend/src/features/generation/GenerationPanel.tsx` | ✅ Built (to be refactored) |
| `variant_rationale` field on `DraftVariant` | `worker/src/engine/types.ts` | ✅ Built (needs UI promotion) |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND                                                     │
│                                                               │
│  WorkflowCardPicker          WorkflowBuilderModal             │
│  (replaces dropdown)         (create / edit custom cards)     │
│        │                              │                       │
│        └──────────┬───────────────────┘                       │
│                   │ postType + dimensionWeights                │
│                   ▼                                           │
│  GenerationPanel (refactored)                                 │
│        │ SSE stream                                           │
│        ▼                                                       │
│  EnrichmentProgressPanel     VariantAngleCards                │
│  (live node updates)         (rationale as headline)          │
│        │                              │                       │
│        └──────────┬───────────────────┘                       │
│                   ▼                                           │
│  ReviewWorkspace → GenerationJustificationPanel               │
│                   ▼                                           │
│  EnrichmentFlowPage (redesigned — real workflow data)         │
└────────────────────────────────────────────────────────────-─┘
                   │ HTTP/D1
┌─────────────────────────────────────────────────────────────┐
│  WORKER                                                       │
│                                                               │
│  customWorkflowActions (CRUD for custom_workflows D1 table)   │
│  WorkflowRegistry.loadCustom() (merges D1 + built-ins)       │
│  SSE enrichment events (node:completed → readable summary)    │
└─────────────────────────────────────────────────────────────┘
```

**Event architecture principle:** `LifecycleEventBus` is the backbone. It already fires `node:started`, `node:completed`, `node:failed`. This spec adds one SSE subscriber that converts those events into frontend-readable progress messages. The DAG runner and event bus are **not modified** — only a new subscriber is added.

---

## 5. Custom Workflow Data Model

### 5.1 D1 Migration — `custom_workflows` table

```sql
-- migration: 0011_custom_workflows.sql
CREATE TABLE IF NOT EXISTS custom_workflows (
  id            TEXT PRIMARY KEY,          -- nanoid, e.g. 'cw_abc123'
  user_id       TEXT NOT NULL,
  name          TEXT NOT NULL,             -- e.g. "My Founder Voice"
  description   TEXT NOT NULL,             -- one-sentence purpose
  optimization_target TEXT NOT NULL,       -- plain-language goal
  generation_instruction TEXT NOT NULL,    -- appended to every brief
  extends_workflow_id TEXT NOT NULL DEFAULT 'base', -- parent workflow
  node_configs_json TEXT NOT NULL,         -- JSON: NodeWorkflowConfig[]
  is_deleted    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_custom_workflows_user ON custom_workflows(user_id, is_deleted);
```

### 5.2 TypeScript Type (`worker/src/features/custom-workflows/types.ts`)

```typescript
export interface CustomWorkflow {
  id: string;                      // 'cw_abc123'
  userId: string;
  name: string;
  description: string;
  optimizationTarget: string;
  generationInstruction: string;
  extendsWorkflowId: string;       // must be a built-in workflow id
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
  dimensionWeights: Record<string, number>; // 7 dims, 0-100
}

export interface UpdateCustomWorkflowPayload extends CreateCustomWorkflowPayload {
  id: string;
}
```

### 5.3 Worker Actions (`worker/src/features/custom-workflows/customWorkflowActions.ts`)

Four actions dispatched through the existing `dispatchAction()` switch:

| Action | Description |
|---|---|
| `listCustomWorkflows` | Returns all non-deleted workflows for current user |
| `createCustomWorkflow` | Validates payload, converts dimensionWeights → nodeConfigs, inserts |
| `updateCustomWorkflow` | Validates ownership, updates row |
| `deleteCustomWorkflow` | Soft-delete (`is_deleted = 1`) |

`dimensionWeights` → `nodeConfigs` conversion uses the existing `DIMENSION_NODE_MAP` + `dimensionValueToImportance()` from `engine/types.ts`. This keeps the conversion logic in one place.

### 5.4 WorkflowRegistry — Loading Custom Workflows

Add a `loadCustomWorkflows(db, userId)` method to `WorkflowRegistry`. This is called once per generation request, merges user's custom workflows with built-ins. Custom workflows are converted to `WorkflowDefinition` shape and registered ephemerally (not mutating the singleton registry).

---

## 6. Frontend Components

### 6.1 `WorkflowCardPicker` (`frontend/src/features/generation/WorkflowCardPicker.tsx`)

**Replaces:** the `<select>` dropdown for post type in `GenerationPanel`.

**Displays:** A horizontal scrollable row of cards. Each card shows:
- Workflow name (bold)
- One-sentence description
- 3 key trait pills (derived from `optimizationTarget`)
- Selected state (ring highlight)

**Card types shown:**
1. Built-in workflow cards (sourced from a frontend constant mirroring the worker definitions)
2. Custom workflow cards (fetched from `listCustomWorkflows` on mount)
3. A **"+ Create your own"** card that opens `WorkflowBuilderModal`

**Props:**
```typescript
interface WorkflowCardPickerProps {
  selectedWorkflowId: string;
  customWorkflows: CustomWorkflowSummary[];
  onSelect: (workflowId: string) => void;
  onOpenBuilder: (workflowToEdit?: CustomWorkflowSummary) => void;
  isLoadingCustom: boolean;
}
```

**Behaviour:** Selecting a built-in card sets `postType` on `GenerationPanel`. Selecting a custom card sets both `postType` (= custom workflow id) and pre-fills `dimensionWeights` from the custom workflow's stored node configs. The "Advanced Controls" collapsible (sliders) remains available but is pre-populated from the card selection.

---

### 6.2 `WorkflowBuilderModal` (`frontend/src/features/workflows/WorkflowBuilderModal.tsx`)

**Opens from:** "Create your own" card or edit icon on a custom card.

**Fields:**
| Field | Input | Notes |
|---|---|---|
| Name | Text input | Required, max 40 chars |
| Description | Text input | Required, one sentence |
| Base workflow | Select (built-in only) | Sets `extendsWorkflowId` |
| Goal / target | Text area | `optimizationTarget` |
| Generation instruction | Text area | Appended to every brief |
| 7 dimension sliders | Range 0–100 | Same `DIMENSIONS` array as today |

**Sliders are labeled meaningfully** in this context — each shows not just the level name but a short tooltip explaining what that dimension does to the output:
- `psychology: Strong` → "Audience pain points and triggers drive the hook and body"
- `vocabulary: Off` → "Vocabulary injection disabled; writer uses natural language"

**Save flow:** POST `createCustomWorkflow` → success → modal closes → `WorkflowCardPicker` reloads custom cards → new card is auto-selected.

**Edit flow:** Loads existing workflow into form, PATCH `updateCustomWorkflow`.

**Delete:** Trash icon on custom card → confirmation → `deleteCustomWorkflow`.

---

### 6.3 `EnrichmentProgressPanel` (`frontend/src/features/generation/EnrichmentProgressPanel.tsx`)

Shown during generation. Replaces the plain "Generating…" state.

**Displays:** A live-updating list of node completions with human-readable summaries:

```
⏳ Analysing your audience…
✅ Psychology         1.2s   "Readers feel pressure to stay relevant. Key trigger: aspiration."
✅ Research context   2.1s   "3 recent signals found on [topic]. Leading with: [stat]."
⏳ Designing hook…
◌  Draft generation       waiting
◌  Tone calibration        waiting
```

**How it works:**
- The SSE stream (`/api/generate/stream`) already exists.
- A new `EnrichmentProgressEvent` SSE message type is added (alongside the existing `complete` event).
- `WorkflowRunner` already emits `node:completed` on the `LifecycleEventBus`. A new SSE subscriber in the stream handler listens and writes the event to the SSE stream.
- The frontend parses these events and updates the panel.

**Node → human-readable summary mapping** (`frontend/src/features/generation/nodeProgressLabels.ts`):

```typescript
export const NODE_PROGRESS_LABELS: Record<string, { pending: string; done: string }> = {
  'psychology-analyzer': {
    pending: 'Analysing your audience…',
    done: 'Audience psychology mapped',
  },
  'research-context': {
    pending: 'Gathering research context…',
    done: 'Research context ready',
  },
  'vocabulary-selector': {
    pending: 'Selecting vocabulary…',
    done: 'Vocabulary selected',
  },
  'hook-designer': {
    pending: 'Designing hook options…',
    done: 'Hook options ready',
  },
  'narrative-arc': {
    pending: 'Planning narrative structure…',
    done: 'Narrative arc set',
  },
  'draft-generator': {
    pending: 'Generating variants…',
    done: 'Variants generated',
  },
  'tone-calibrator': {
    pending: 'Calibrating tone…',
    done: 'Tone calibrated',
  },
  'constraint-validator': {
    pending: 'Validating constraints…',
    done: 'Constraints validated',
  },
};
```

The `done` label is shown alongside the duration in ms. For nodes that produce output (psychology, research, hook), the output's key field is appended as a one-line insight (e.g., `dominantEmotion`, `keyFacts[0]`, `hooks[0].text`).

**New SSE event shape** (added to stream protocol):
```typescript
interface EnrichmentProgressSseEvent {
  type: 'enrichment:node_completed';
  nodeId: string;
  durationMs: number;
  /** Short human-readable summary of what the node found. Null for nodes with no summarisable output. */
  insightSummary: string | null;
}
```

---

### 6.4 Variant Angle Display (refactor `GenerationPanel.tsx`)

**Current:** `variant_rationale` shown as `text-[0.6rem] italic text-slate-500` below the badges.

**New:** Rationale is the **headline** of each variant card.

```
┌──────────────────────────────────────────────────────┐
│  Variant 1                                Viral Story │
│                                                       │
│  "Challenges the assumption that X — opens a debate" │  ← rationale as H3
│  contrarian hook  ·  problem-agitate-solve            │  ← badges below
│                                                       │
│  "Most people think..."  [preview, line-clamped]      │
│                                                       │
│                           [Save]  [Review changes]    │
└──────────────────────────────────────────────────────┘
```

The workflow name is shown top-right in muted text. Variant number moves to top-left in small uppercase. This makes the creative angle the first thing the user reads, not the last.

---

### 6.5 `GenerationJustificationPanel` (`frontend/src/features/review/GenerationJustificationPanel.tsx`)

Shown in `ReviewWorkspace` editor view. Collapsible. Reads from `nodeRuns` for the selected topic.

**Sections:**

```
Built with: Viral Story workflow

┌── Audience Insight ─────────────────────────────────┐
│ Readers feel pressure to stay relevant.              │
│ Key triggers: aspiration, authority                  │
└─────────────────────────────────────────────────────┘

┌── Structure ────────────────────────────────────────┐
│ Arc: Hook → Story → Lesson                          │
│ Hook: contrarian — challenges assumption about X    │
│ CTA: open question inviting disagreement            │
└─────────────────────────────────────────────────────┘

┌── Vocabulary ───────────────────────────────────────┐
│ Power words used: [word1] [word2] [word3]           │
│ Avoided: corporate jargon                           │
└─────────────────────────────────────────────────────┘

┌── Channel ──────────────────────────────────────────┐
│ LinkedIn · 183 words · within 150–250 target        │
└─────────────────────────────────────────────────────┘
```

Data comes from `nodeRuns` already stored in D1 per topic. The panel parses `outputJson` of each relevant node and renders it in human-readable form. No new API required — uses the existing `getNodeRuns` endpoint.

---

### 6.6 EnrichmentFlowPage Redesign (`frontend/src/pages/EnrichmentFlowPage.tsx`)

**Problems with current version:**
1. `FLOW_NODES` is a **static hardcoded array** — it doesn't reflect which nodes actually ran or in what order.
2. Node outputs shown as raw JSON `pre` blocks — unreadable.
3. No per-topic workflow context (which workflow was selected, why).
4. Prompt templates are static placeholders, not actual prompts.

**Changes:**

**A. Dynamic node list from actual `nodeRuns`**
When a topic run is selected, build the flow diagram from `nodeRuns` data (what actually executed) rather than `FLOW_NODES`. Nodes not in `nodeRuns` are shown as greyed-out / "skipped".

**B. Workflow context header**
Above the DAG, show:
- Workflow name + description used for this topic
- `optimizationTarget`
- Channel + word target

**C. Human-readable node output panels**
`NodeDetailPanel` gets a "Summary" tab alongside the existing "Raw output" tab.
The summary tab renders the typed output (using the same `NODE_PROGRESS_LABELS` mapping + per-node field extractors) as a readable paragraph, not JSON.

**D. Execution timeline view**
A secondary view (toggle button) shows nodes as a horizontal timeline with durations — useful for spotting slow nodes. Built from `nodeRunLog` in `WorkflowContext`.

**E. Node discovery from registries (no static list)**
Replace `FLOW_NODES` constant with a call to `GET /api/engine/node-catalog` (new lightweight endpoint) that returns `{ id, name, description }[]` from the worker's `nodeRegistry`. This keeps the frontend in sync with whatever nodes exist in the backend.

---

## 7. New API Actions (worker)

| Action name | Method | Description |
|---|---|---|
| `listCustomWorkflows` | GET-style action | Returns `CustomWorkflow[]` for current user |
| `createCustomWorkflow` | POST-style action | Validates, inserts, returns created workflow |
| `updateCustomWorkflow` | POST-style action | Validates ownership, updates |
| `deleteCustomWorkflow` | POST-style action | Soft-deletes |
| `getNodeCatalog` | GET-style action | Returns `{ id, name, description }[]` from `nodeRegistry` |

All actions follow the existing `dispatchAction()` pattern in `worker/src/index.ts`.

---

## 8. SSE Stream Extension

The existing `/api/generate/stream` handler intercepts the `complete` SSE event for post-processing. The extension:

1. Inside the generation-worker (where `WorkflowRunner` lives), subscribe a handler to `lifecycleEventBus` for `node:completed` **before** `runWorkflow()` is called.
2. `LifecycleEventBus` handlers are synchronous. The handler pushes events into a local queue (plain array). The SSE writer loop drains the queue each iteration before forwarding the underlying chunk.
3. On each queued `node:completed`, write an `enrichment:node_completed` SSE event to the response stream.
4. The SSE event carries `nodeId`, `durationMs`, and `insightSummary`.
5. Unsubscribe the handler after `workflow:completed` fires to prevent memory leaks.

`insightSummary` is computed by a small pure function `buildNodeInsightSummary(nodeId, outputJson)` in a new file `worker/src/generation/nodeInsightSummary.ts`. Each case extracts 1–2 key fields from the node's typed output and formats a short string. Falls back to `null` for nodes with no summarisable output (e.g., `constraint-validator`).

---

## 9. Implementation Stages

### Stage 1 — Workflow Card Picker
- `WorkflowCardPicker` component (built-in workflows only)
- Refactor `GenerationPanel` to use it in place of the dropdown
- Wire `onSelect` → `postType` prop (already supported)
- Unit-test: card renders, selection fires callback

### Stage 2 — Custom Workflow CRUD
- D1 migration `0011_custom_workflows.sql`
- `worker/src/features/custom-workflows/` module (types, actions, D1 helpers)
- Extend `WorkflowRegistry` with `loadCustomWorkflows()`
- `WorkflowBuilderModal` frontend component
- Custom cards appear in `WorkflowCardPicker`
- Integration test: create → list → use → delete

### Stage 3 — Live Intelligence Panel (SSE)
- `nodeInsightSummary.ts` (worker)
- SSE stream extension: subscribe to `lifecycleEventBus`, emit `enrichment:node_completed`
- `EnrichmentProgressPanel` + `nodeProgressLabels.ts` (frontend)
- Wire into `GenerationPanel` loading state
- Manual test: verify panel updates during a real generation

### Stage 4 — Variant Angle Display
- Refactor variant cards in `GenerationPanel` to lead with `variant_rationale`
- Show workflow name top-right on each card
- CSS-only change + minor restructure

### Stage 5 — Justification Panel
- `GenerationJustificationPanel` component
- Add to `ReviewWorkspace` editor layout (collapsible)
- Uses existing `getNodeRuns` — no new API
- Manual test: verify all 4 sections render correctly

### Stage 6 — EnrichmentFlowPage Redesign
- `getNodeCatalog` worker action
- Replace static `FLOW_NODES` with dynamic node catalog
- Workflow context header section
- Human-readable "Summary" tab in `NodeDetailPanel`
- Execution timeline view (toggle)

---

## 10. File Map (new files only)

```
worker/src/
  migrations/
    0011_custom_workflows.sql
  features/
    custom-workflows/
      types.ts                        CustomWorkflow, CreateCustomWorkflowPayload
      customWorkflowActions.ts        listCustomWorkflows, create, update, delete
      customWorkflowD1.ts             D1 query helpers
      customWorkflowToDefinition.ts   CustomWorkflow → WorkflowDefinition
  generation/
    nodeInsightSummary.ts             nodeId + outputJson → string | null

frontend/src/
  features/
    generation/
      WorkflowCardPicker.tsx          Card grid for workflow selection
      EnrichmentProgressPanel.tsx     Live node progress during generation
      nodeProgressLabels.ts           nodeId → { pending, done } label map
      builtInWorkflowCards.ts         Static metadata for the 14 built-in workflows
    workflows/
      WorkflowBuilderModal.tsx        Create / edit custom workflow
      useCustomWorkflows.ts           Hook: fetch, create, update, delete
    review/
      GenerationJustificationPanel.tsx  "Why this post" panel in editor
```

---

## 11. Coding Standards

- **Separation of concerns:** D1 queries in `*D1.ts`, business logic in `*Actions.ts`, types in `types.ts`.
- **No magic strings:** All node IDs used in the frontend come from `nodeProgressLabels.ts` keys; any new node auto-appears as "unknown node" rather than breaking.
- **Defensive rendering:** If `nodeRuns` is empty or missing, `GenerationJustificationPanel` and `EnrichmentProgressPanel` render gracefully empty, never crash.
- **Naming:** Files use kebab-case. React components use PascalCase. Hooks prefix `use`. D1 helpers suffix `D1`. Pure util functions are in separate files from UI.
- **No wide imports:** Each feature folder exports from an `index.ts` barrel. Consumers import from the barrel, not deep paths.

---

## 12. Out of Scope

- Sharing custom workflows between users / workspace-level workflows
- Importing/exporting workflow configs as JSON
- A/B testing workflows against live engagement data
- Any changes to the enrichment node definitions or WorkflowRunner internals
