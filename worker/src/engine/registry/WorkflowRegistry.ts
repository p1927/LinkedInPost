import type { D1Database } from '@cloudflare/workers-types';
import type {
  WorkflowDefinition,
  ResolvedWorkflow,
  NodeWorkflowConfig,
} from '../types';
import { buildImportanceMap } from '../importance/ImportanceResolver';

const MAX_INHERITANCE_DEPTH = 5;

export class WorkflowRegistry {
  private readonly workflows = new Map<string, WorkflowDefinition>();

  /** Registers a workflow definition. Throws if a workflow with the same id already exists. */
  register(workflow: WorkflowDefinition): void {
    if (this.workflows.has(workflow.id)) {
      throw new Error(`[WorkflowRegistry] Workflow already registered: "${workflow.id}"`);
    }
    this.workflows.set(workflow.id, workflow);
  }

  /** Returns the raw workflow definition. Throws if not found. */
  get(workflowId: string): WorkflowDefinition {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(
        `[WorkflowRegistry] Workflow not found: "${workflowId}". Registered: [${[...this.workflows.keys()].join(', ')}]`,
      );
    }
    return workflow;
  }

  /**
   * Resolves a workflow by walking the extendsWorkflowId chain (max depth 5).
   *
   * Merge rules:
   * 1. Collect ancestry chain from root → child.
   * 2. Start with root's nodeConfigs.
   * 3. Each subsequent workflow replaces any config whose nodeId matches (full replacement).
   * 4. skipNodeIds from the child are applied last.
   * 5. importanceMap is built from the final merged configs.
   * 6. generationInstruction: child's value wins; falls back to nearest ancestor.
   */
  resolve(workflowId: string): ResolvedWorkflow {
    const chain = this.buildChain(workflowId);
    const child = chain[chain.length - 1];

    // Merge nodeConfigs from root to child
    const configMap = new Map<string, NodeWorkflowConfig>();
    for (const wf of chain) {
      for (const config of wf.nodeConfigs) {
        // Child configs fully replace parent configs for the same nodeId
        configMap.set(config.nodeId, config);
      }
    }

    // Collect all skipNodeIds from the entire chain (child wins, but skip is additive)
    const skipSet = new Set<string>();
    for (const wf of chain) {
      for (const id of wf.skipNodeIds ?? []) {
        skipSet.add(id);
      }
    }

    const mergedConfigs = [...configMap.values()].filter(
      (c) => !skipSet.has(c.nodeId),
    );

    // generationInstruction: walk chain in reverse; use first non-empty value (child first)
    let generationInstruction = '';
    for (let i = chain.length - 1; i >= 0; i--) {
      if (chain[i].generationInstruction) {
        generationInstruction = chain[i].generationInstruction;
        break;
      }
    }

    return {
      id: child.id,
      name: child.name,
      description: child.description,
      optimizationTarget: child.optimizationTarget,
      nodeConfigs: mergedConfigs,
      generationInstruction,
      importanceMap: buildImportanceMap(mergedConfigs),
    };
  }

  /** Returns all registered workflows sorted by id. */
  list(): WorkflowDefinition[] {
    return [...this.workflows.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Returns a new WorkflowRegistry containing all built-in workflows
   * PLUS the given user's custom workflows from D1.
   * Does NOT mutate the singleton registry.
   */
  async loadCustomWorkflows(db: D1Database, userId: string): Promise<WorkflowRegistry> {
    const { dbListCustomWorkflowsFull } = await import('../../features/custom-workflows/customWorkflowD1');
    const { customWorkflowToDefinition } = await import('../../features/custom-workflows/customWorkflowToDefinition');
    const customRows = await dbListCustomWorkflowsFull(db, userId);
    const extended = new WorkflowRegistry();
    // Copy all built-in registrations
    for (const def of this.list()) {
      extended.register(def);
    }
    // Register custom workflows
    for (const cw of customRows) {
      try {
        extended.register(customWorkflowToDefinition(cw));
      } catch {
        // Skip duplicates (shouldn't happen but guard against it)
      }
    }
    return extended;
  }

  /**
   * Builds the ancestry chain [root, ..., parent, child] for the given workflowId.
   * Throws on cycles or if the chain exceeds MAX_INHERITANCE_DEPTH.
   */
  private buildChain(workflowId: string): WorkflowDefinition[] {
    const chain: WorkflowDefinition[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = workflowId;

    while (currentId !== undefined) {
      if (visited.has(currentId)) {
        throw new Error(
          `[WorkflowRegistry] Circular inheritance detected for workflow "${currentId}" in chain: [${chain.map((w) => w.id).join(' → ')}]`,
        );
      }
      if (chain.length >= MAX_INHERITANCE_DEPTH) {
        throw new Error(
          `[WorkflowRegistry] Inheritance chain exceeds max depth (${MAX_INHERITANCE_DEPTH}) for workflow "${workflowId}"`,
        );
      }
      visited.add(currentId);
      const wf = this.get(currentId);
      chain.unshift(wf); // prepend so root is first
      currentId = wf.extendsWorkflowId;
    }

    return chain;
  }
}

export const workflowRegistry = new WorkflowRegistry();
