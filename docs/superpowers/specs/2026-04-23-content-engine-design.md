# Content Engine Design Spec
**Date:** 2026-04-23  
**Status:** Implemented, TypeScript clean (0 errors)  
**Location:** `worker/src/engine/`

---

## Problem Statement

The existing generation pipeline (external generation worker) produced generic output because:
- Channel constraints were unresolved free-text, not structured data
- All intelligence (psychology, vocabulary, structure) was crammed into one LLM call
- No workflow differentiation — every post went through the same path
- Node outputs were not accumulated — each step lost context from prior steps
- No way to extend the pipeline without touching existing code

---

## Core Design Decisions

### 1. Importance Levels Replace Numeric Weights

Numeric weights (0.7, 0.8, 0.9) are ambiguous — humans cannot meaningfully distinguish them.
The engine uses **five named categorical levels** instead:

| Level | Role in generation brief | Numeric factor |
|---|---|---|
| `critical` | Primary directive — generator optimises for this | 1.0 |
| `important` | Included with clear emphasis | 0.7 |
| `supporting` | Background context, not primary directive | 0.4 |
| `background` | One-line mention only | 0.15 |
| `off` | Node skipped entirely | 0.0 |

These map to fixed numeric factors only inside `GenerationBriefBuilder` — callers never set numbers.

### 2. Event Architecture: Three Distinct Layers

Events belong at **lifecycle boundaries**, not between nodes:

```
LAYER 1 — Node Registry (NodeRegistry.ts)
  Nodes are self-contained plugins. register() once at startup.
  New nodes added without touching existing code.

LAYER 2 — Workflow DAG (WorkflowRegistry.ts + DagResolver.ts)
  Workflows are pure data (WorkflowDefinition objects).
  DagResolver runs Kahn's topological sort → ExecutionPlan (parallel phases).
  Workflows can extend parent workflows via extendsWorkflowId.

LAYER 3 — LifecycleEventBus (events/LifecycleEventBus.ts)
  Events fire at: workflow:started, workflow:completed, workflow:failed,
                  node:started, node:completed, node:skipped, node:failed
  Consumers subscribe independently — zero coupling to pipeline internals.
  Subscribers never block execution (errors are caught and logged).
```

### 3. Context Accumulator (Not Event Chaining)

Nodes do NOT pass output to the next node via events. Instead, all outputs
accumulate in a shared `WorkflowContext.outputs` object (ContextAccumulator).

- Each node receives a **frozen snapshot** of the context (structuredClone + Object.freeze)
- Nodes write outputs back; the runner merges them via `writeOutputs()`
- The draft generator calls `buildGenerationBrief(context)` which reads ALL
  accumulated outputs, applies importance weights, and assembles the prompt

This solves the "telephone game" problem where each node only saw the prior node's output.

### 4. Workflow Inheritance (Composition Not Duplication)

Child workflows override parent configs selectively:

```
base → viral-story → viral-story--linkedin  (future)
     → thought-leadership
     → engagement-trap
     → educational
     → personal-brand
```

Merge rules (WorkflowRegistry.resolve):
1. Build ancestry chain [root … parent … child]
2. Walk root → child; child config for same nodeId fully replaces parent config
3. skipNodeIds from entire chain are unioned and applied last
4. generationInstruction: child value wins; falls back to nearest ancestor
5. importanceMap built from final merged configs

---

## File Structure

```
worker/src/engine/
├── types.ts                          Single source of truth for all types
├── index.ts                          Public API — only file external code imports
│
├── importance/
│   └── ImportanceResolver.ts         resolveNumericWeight, buildImportanceMap,
│                                     isNodeActive, sortByImportance
│
├── events/
│   └── LifecycleEventBus.ts          Typed sync event bus + lifecycleEventBus singleton
│
├── registry/
│   ├── NodeRegistry.ts               register/get/has/list + nodeRegistry singleton
│   └── WorkflowRegistry.ts           register/get/resolve/list + workflowRegistry singleton
│
├── context/
│   └── ContextAccumulator.ts         Mutable context + frozen snapshots for nodes
│
├── executor/
│   ├── DagResolver.ts                Kahn's topological sort → ExecutionPlan
│   └── WorkflowRunner.ts             Orchestrates phases, Promise.allSettled, events
│
├── brief/
│   └── GenerationBriefBuilder.ts     Deterministic: accumulated context → prompt string
│
├── nodes/
│   ├── registry-setup.ts             Registers all 8 built-in nodes (idempotent)
│   └── definitions/
│       ├── psychology-analyzer.ts    Audience psychology, triggers, pain points
│       ├── research-context.ts       Facts, stats, credibility hooks
│       ├── vocabulary-selector.ts    Power words, avoid list, signature phrases
│       ├── hook-designer.ts          3 typed hooks with recommendation
│       ├── narrative-arc.ts          Arc type, sections, CTA blueprint
│       ├── draft-generator.ts        4 differentiated variants (powerful model)
│       ├── tone-calibrator.ts        Minimal voice alignment (fast model)
│       └── constraint-validator.ts   Deterministic word/format validation (no LLM)
│
└── workflows/
    ├── registry-setup.ts             Registers all 6 built-in workflows (base first)
    └── definitions/
        ├── base.ts                   Root — all nodes at moderate importance
        ├── viral-story.ts            psychology=critical, research=background
        ├── thought-leadership.ts     research=critical, narrative-arc=critical
        ├── engagement-trap.ts        hook-designer=critical, structure=supporting
        ├── educational.ts            research=critical, constraint-validator=critical
        └── personal-brand.ts         tone-calibrator=critical, research=off
```

---

## Node Execution Order (base workflow)

```
Phase 0 (parallel):   psychology-analyzer, research-context
Phase 1 (parallel):   vocabulary-selector, hook-designer
Phase 2 (sequential): narrative-arc
Phase 3 (sequential): draft-generator        ← calls buildGenerationBrief(context)
Phase 4 (sequential): tone-calibrator
Phase 5 (sequential): constraint-validator
```

Nodes in the same phase have no dependency on each other and run via `Promise.allSettled`.
A failed node is non-fatal — the pipeline continues with null in that output slot.

---

## Channel Constraints (resolved at runtime, not hardcoded in prompts)

| Channel | Word range | Images | Links in body | Carousel |
|---|---|---|---|---|
| linkedin | 150–250 | 4 | ✗ | ✓ |
| instagram | 80–150 | 10 | ✗ | ✓ |
| telegram | 200–400 | 10 | ✓ | ✗ |
| whatsapp | 50–100 | 1 | ✓ | ✗ |
| gmail | 200–800 | 5 | ✓ | ✗ |

Each channel also has a `platformContract` string (emotional contract with audience)
that flows into every node prompt automatically via the context.

---

## Built-in Workflows

### viral-story
Goal: emotional resonance and shareability  
Key weights: psychology-analyzer=critical, hook-designer=critical, research-context=background  
Instruction: Raw personal hook → emotional tension → lesson → vulnerable CTA

### thought-leadership
Goal: credibility and authority building  
Key weights: research-context=critical, narrative-arc=critical, psychology-analyzer=supporting  
Instruction: Counterintuitive data point → evidence-backed argument → forward-looking prediction

### engagement-trap
Goal: maximum comments and discussion  
Key weights: hook-designer=critical, psychology-analyzer=critical, vocabulary-selector=background  
Instruction: Provocative statement → defend position without resolving tension → force-pick-a-side CTA

### educational
Goal: knowledge retention and saves  
Key weights: research-context=critical, narrative-arc=critical, constraint-validator=critical  
Instruction: Why this matters now → numbered steps → single actionable takeaway

### personal-brand
Goal: follower loyalty and identity deepening  
Key weights: tone-calibrator=critical, vocabulary-selector=important, research-context=off  
Instruction: Must sound unmistakably like this person — mirror signature phrases

---

## Key Invariants (must not be broken by future changes)

1. **`types.ts` has no imports from other engine files** — all types self-contained
2. **`index.ts` is the only entry point** — external code never imports from sub-paths
3. **`base` workflow must be registered before child workflows** — `registry-setup.ts` enforces this
4. **`buildGenerationBrief` is called by `draft-generator` node** — not stored as a node output slot.
   The `generationBrief` output slot in `WorkflowNodeOutputs` exists for external pre-injection only.
5. **Node IDs in `GenerationBriefBuilder.addSection` must exactly match registered node IDs**:
   - `'psychology-analyzer'` (not `'psychology-analyser'`)
   - `'research-context'` (not `'research-gatherer'`)
   - `'vocabulary-selector'`
   - `'hook-designer'` (not `'hook-generator'`)
   - `'narrative-arc'` (not `'narrative-planner'`)
6. **`runWorkflow` returns `calibratedVariants ?? draftVariants`** — never raw drafts alone
7. **Node failures are non-fatal** — `Promise.allSettled`, never `Promise.all`
8. **Nodes receive frozen context snapshots** — `structuredClone + Object.freeze`
   Nodes must never mutate the context object passed to them.

---

## How to Extend

### Add a new node
```typescript
// 1. Create worker/src/engine/nodes/definitions/my-node.ts
export const nodeDefinition: NodeDefinition = {
  id: 'my-node',
  name: 'My Node',
  reads: ['psychologyAnalysis'],   // existing output slots it reads
  writes: 'someOutputSlot',        // must be a key of WorkflowNodeOutputs
  preferredModelTier: 'balanced',
  async run(context, nodeEnv, params) { ... }
};

// 2. Add to nodes/registry-setup.ts imports + definitions array
// 3. Add the output slot to WorkflowNodeOutputs in types.ts if new
// 4. Add to whichever workflow needs it via nodeConfigs
```

### Add a new workflow
```typescript
// Create worker/src/engine/workflows/definitions/my-workflow.ts
export const myWorkflow: WorkflowDefinition = {
  id: 'my-workflow',
  extendsWorkflowId: 'base',        // inherits all base nodes
  nodeConfigs: [
    // Only list overrides — everything else inherits from base
    { nodeId: 'psychology-analyzer', importance: 'critical', dependsOn: [] },
  ],
  generationInstruction: '...',
  // ...
};

// Add to workflows/registry-setup.ts
```

### Add a workflow variant (platform-specific)
```typescript
export const viralStoryLinkedIn: WorkflowDefinition = {
  id: 'viral-story--linkedin',
  extendsWorkflowId: 'viral-story',   // inherits from non-base parent
  nodeConfigs: [
    { nodeId: 'draft-generator', importance: 'critical', dependsOn: ['narrative-arc', 'hook-designer'], params: { wordTarget: 180 } },
  ],
  generationInstruction: 'LinkedIn-specific: peer-authority voice, no lists, question CTA',
};
```

### Subscribe to lifecycle events
```typescript
import { lifecycleEventBus } from './engine';

lifecycleEventBus.subscribe('workflow:completed', (event) => {
  // save to D1, notify UI, feed analytics
  console.log(`Workflow ${event.workflowId} done in ${event.durationMs}ms`);
});

lifecycleEventBus.subscribe('node:failed', (event) => {
  // alert on critical node failures
});
```

### Call the engine
```typescript
import { runWorkflow } from './engine';

const result = await runWorkflow({
  input: {
    runId: crypto.randomUUID(),
    workflowId: 'viral-story',       // or 'thought-leadership', etc.
    topic: 'Why most productivity advice is backwards',
    topicId: 'topic-uuid',
    channel: 'linkedin',
    authorProfile: 'Pratyush Mishra — founder, direct communicator, ...',
    generationRules: 'No buzzwords. Always end with a question.',
    researchArticles: [],            // optional
  },
  env,                               // WorkerEnv with API keys
  llmRef: { provider: 'gemini', model: 'gemini-2.5-flash' },
  fallbackLlmRef: { provider: 'openrouter', model: 'anthropic/claude-3-haiku' },
});

result.variants        // DraftVariant[] — calibrated and validated
result.context         // full WorkflowContext — all node outputs, logs, errors
result.durationMs      // total wall time
```

---

## Bugs Fixed During Implementation Review

These bugs were introduced by parallel agent implementation and caught during verification:

| # | File | Bug | Fix |
|---|---|---|---|
| 1 | `nodes/registry-setup.ts` | `tone-calibrator` and `constraint-validator` not imported or registered — last 2 nodes silently skipped | Added both imports and registrations |
| 2 | `brief/GenerationBriefBuilder.ts` | Wrong node IDs: `research-gatherer`, `hook-generator`, `narrative-planner` — importance lookup always missed, all sections rendered as `supporting` regardless of workflow config | Corrected to `research-context`, `hook-designer`, `narrative-arc` |
| 3 | `executor/WorkflowRunner.ts` | Returned `draftVariants` only — tone calibration work silently discarded | Changed to `calibratedVariants ?? draftVariants` |
| 4 | `nodes/definitions/draft-generator.ts` | Never called `buildGenerationBrief(context)` — the entire weighted brief assembly was dead code | Imported and called `buildGenerationBrief(context)`; removed fallback minimal brief |

---

## What Is NOT in This Engine

- **LLM provider selection** — callers pass `llmRef` directly; policy resolution lives in `worker/src/llm/policy.ts`
- **D1 persistence** — the runner returns a `WorkflowContext`; callers decide what to persist
- **Content review / guardrails** — handled separately by `features/content-review/`
- **Image generation** — out of scope; engine produces text variants only
- **Authentication** — engine is stateless; no user or session context
- **Streaming** — `runWorkflow` is async/await only; streaming is a caller concern
