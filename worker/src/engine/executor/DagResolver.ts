import type { NodeWorkflowConfig, ExecutionPlan, ExecutionPhase } from '../types';

/**
 * Validates that all dependsOn references point to known nodeIds.
 */
function validateDependencies(activeConfigs: NodeWorkflowConfig[]): void {
  const knownIds = new Set(activeConfigs.map((c) => c.nodeId));
  for (const config of activeConfigs) {
    for (const dep of config.dependsOn) {
      if (!knownIds.has(dep)) {
        throw new Error(
          `Node "${config.nodeId}" depends on unknown node "${dep}"`,
        );
      }
    }
  }
}

/**
 * Performs a topological sort (Kahn's algorithm) on the active node configs
 * and returns an execution plan — groups of nodes that can run in parallel.
 *
 * Throws if a cycle is detected or if a dependsOn references an unknown node.
 */
export function buildExecutionPlan(activeConfigs: NodeWorkflowConfig[]): ExecutionPlan {
  validateDependencies(activeConfigs);

  // Build in-degree map and adjacency list (dep → dependents)
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const config of activeConfigs) {
    if (!inDegree.has(config.nodeId)) {
      inDegree.set(config.nodeId, 0);
    }
    if (!dependents.has(config.nodeId)) {
      dependents.set(config.nodeId, []);
    }
    for (const dep of config.dependsOn) {
      inDegree.set(config.nodeId, (inDegree.get(config.nodeId) ?? 0) + 1);
      if (!dependents.has(dep)) {
        dependents.set(dep, []);
      }
      dependents.get(dep)!.push(config.nodeId);
    }
  }

  const plan: ExecutionPlan = [];
  let queue: string[] = [];

  // Seed with all zero-in-degree nodes
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  let phaseIndex = 0;
  let placed = 0;

  while (queue.length > 0) {
    const phase: ExecutionPhase = {
      phase: phaseIndex++,
      parallelNodeIds: [...queue],
    };
    plan.push(phase);
    placed += queue.length;

    const nextQueue: string[] = [];
    for (const nodeId of queue) {
      for (const dependent of dependents.get(nodeId) ?? []) {
        const newDegree = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          nextQueue.push(dependent);
        }
      }
    }
    queue = nextQueue;
  }

  if (placed < activeConfigs.length) {
    const unplaced = activeConfigs
      .map((c) => c.nodeId)
      .filter((id) => (inDegree.get(id) ?? 0) > 0);
    throw new Error(
      `Cycle detected in workflow DAG involving nodes: [${unplaced.join(', ')}]`,
    );
  }

  return plan;
}
