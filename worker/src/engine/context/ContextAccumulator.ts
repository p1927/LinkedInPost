import {
  CHANNEL_CONSTRAINTS_MAP,
  createEmptyOutputs,
  type WorkflowContext,
  type WorkflowInput,
  type WorkflowNodeOutputs,
  type NodeRunRecord,
  type NodeErrorRecord,
  type ImportanceLevel,
} from '../types';

export class ContextAccumulator {
  private readonly context: WorkflowContext;

  constructor(
    input: WorkflowInput,
    resolvedWorkflowId: string,
    importanceMap: Record<string, ImportanceLevel>,
    generationInstruction: string = '',
  ) {
    this.context = {
      ...input,
      resolvedWorkflowId,
      channelConstraints: CHANNEL_CONSTRAINTS_MAP[input.channel],
      importanceMap,
      generationInstruction,
      nodeRunLog: [],
      errors: [],
      outputs: createEmptyOutputs(),
    };
  }

  /**
   * Merges partial node outputs into the live context.
   * Only keys explicitly present (non-undefined) in `partial` are written.
   */
  writeOutputs(partial: Partial<WorkflowNodeOutputs>): void {
    for (const key of Object.keys(partial) as Array<keyof WorkflowNodeOutputs>) {
      if (partial[key] !== undefined) {
        // TypeScript cannot narrow the assignment across mapped types here;
        // the cast is safe because we iterate over partial's own keys.
        (this.context.outputs as unknown as Record<string, unknown>)[key] = partial[key];
      }
    }
  }

  recordNodeRun(record: NodeRunRecord): void {
    this.context.nodeRunLog.push(record);
  }

  recordError(record: NodeErrorRecord): void {
    this.context.errors.push(record);
  }

  /**
   * Returns a deep-frozen snapshot of the current context.
   * Safe to hand to node.run() as `Readonly<WorkflowContext>`.
   */
  snapshot(): Readonly<WorkflowContext> {
    const clone = structuredClone(this.context);
    return Object.freeze(clone);
  }

  /**
   * Returns the live mutable reference.
   * Intended for the workflow runner only — nodes receive `snapshot()` instead.
   */
  getContext(): WorkflowContext {
    return this.context;
  }
}
