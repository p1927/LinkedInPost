import { buildExecutionPlan } from './DagResolver';
import { lifecycleEventBus } from '../events/LifecycleEventBus';
import { workflowRegistry } from '../registry/WorkflowRegistry';
import { nodeRegistry } from '../registry/NodeRegistry';
import { ContextAccumulator } from '../context/ContextAccumulator';
import { isNodeActive } from '../importance/ImportanceResolver';
import type {
  RunWorkflowOptions,
  RunWorkflowResult,
  NodeRunEnvironment,
  WorkflowNodeOutputs,
} from '../types';

/**
 * Orchestrates a full workflow execution:
 *  1. Resolves the workflow (inheritance chain, importance map)
 *  2. Filters to active nodes and builds the DAG execution plan
 *  3. Runs phases sequentially; nodes within a phase run concurrently
 *  4. Fires lifecycle events at every boundary
 *
 * Individual node failures are non-fatal — the pipeline continues and the
 * error is recorded in the context. Use `result.context.errors` to inspect.
 */
export async function runWorkflow(options: RunWorkflowOptions): Promise<RunWorkflowResult> {
  const { input, env, llmRef, fallbackLlmRef } = options;
  const startedAt = Date.now();

  // ── 1. Resolve workflow ──────────────────────────────────────
  let resolvedWorkflow;
  try {
    resolvedWorkflow = workflowRegistry.resolve(input.workflowId);
  } catch (err) {
    lifecycleEventBus.emit({
      type: 'workflow:failed',
      runId: input.runId,
      workflowId: input.workflowId,
      error: err instanceof Error ? err.message : String(err),
      timestamp: Date.now(),
    });
    throw err;
  }

  // ── 2. Filter active nodes and build execution plan ──────────
  const activeConfigs = resolvedWorkflow.nodeConfigs.filter((c) =>
    isNodeActive(c.importance),
  );
  const plan = buildExecutionPlan(activeConfigs);

  // ── 3. Initialise context accumulator ───────────────────────
  const accumulator = new ContextAccumulator(input, resolvedWorkflow.id, resolvedWorkflow.importanceMap, resolvedWorkflow.generationInstruction);

  // ── 4. Fire workflow:started ─────────────────────────────────
  lifecycleEventBus.emit({
    type: 'workflow:started',
    runId: input.runId,
    workflowId: input.workflowId,
    resolvedWorkflowId: resolvedWorkflow.id,
    timestamp: Date.now(),
  });

  // ── 5. Execute phases ────────────────────────────────────────
  const nodeEnv: NodeRunEnvironment = { env, llmRef, fallbackLlmRef };

  for (const executionPhase of plan) {
    // Fire node:started for every node in this phase
    for (const nodeId of executionPhase.parallelNodeIds) {
      lifecycleEventBus.emit({
        type: 'node:started',
        runId: input.runId,
        nodeId,
        phase: executionPhase.phase,
        timestamp: Date.now(),
      });
    }

    // Run all nodes in the phase concurrently; failures must not cancel siblings
    const results = await Promise.allSettled(
      executionPhase.parallelNodeIds.map(async (nodeId) => {
        const nodeStartedAt = Date.now();
        const config = activeConfigs.find((c) => c.nodeId === nodeId)!;
        const nodeDef = nodeRegistry.get(nodeId);
        const frozenContext = accumulator.snapshot();

        const outputs = await nodeDef.run(frozenContext, nodeEnv, config.params ?? {});
        return { nodeId, outputs, startedAt: nodeStartedAt, importance: config.importance };
      }),
    );

    // Process settled results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const nodeId = executionPhase.parallelNodeIds[i];
      const config = activeConfigs.find((c) => c.nodeId === nodeId)!;
      const now = Date.now();

      if (result.status === 'fulfilled') {
        const { outputs, startedAt: nodeStartedAt, importance } = result.value;

        // Write outputs into the accumulator
        accumulator.writeOutputs(outputs as Partial<WorkflowNodeOutputs>);

        // Record the run
        accumulator.recordNodeRun({
          nodeId,
          status: 'completed',
          startedAt: nodeStartedAt,
          durationMs: now - nodeStartedAt,
          importance,
        });

        lifecycleEventBus.emit({
          type: 'node:completed',
          runId: input.runId,
          nodeId,
          durationMs: now - nodeStartedAt,
          importance,
          timestamp: now,
        });
      } else {
        // Rejected — non-fatal
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);

        accumulator.recordNodeRun({
          nodeId,
          status: 'failed',
          startedAt: Date.now() - 0, // approximate; we don't have per-node start for rejected case
          durationMs: 0,
          importance: config.importance,
          error: errorMessage,
        });

        accumulator.recordError({ nodeId, error: errorMessage, timestamp: now });

        lifecycleEventBus.emit({
          type: 'node:failed',
          runId: input.runId,
          nodeId,
          error: errorMessage,
          timestamp: now,
        });
      }
    }
  }

  // ── 6. Fire workflow:completed ───────────────────────────────
  const finalContext = accumulator.snapshot();
  const durationMs = Date.now() - startedAt;

  lifecycleEventBus.emit({
    type: 'workflow:completed',
    runId: input.runId,
    workflowId: input.workflowId,
    context: finalContext,
    durationMs,
    timestamp: Date.now(),
  });

  return {
    runId: input.runId,
    workflowId: input.workflowId,
    context: finalContext,
    // Prefer calibrated variants (post tone-calibrator) over raw drafts
    variants: finalContext.outputs.calibratedVariants ?? finalContext.outputs.draftVariants ?? [],
    durationMs,
  };
}
