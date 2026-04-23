import { IMPORTANCE_WEIGHT, type ImportanceLevel, type NodeWorkflowConfig } from '../types';

/** Returns the numeric weight for a given importance level. */
export function resolveNumericWeight(level: ImportanceLevel): number {
  return IMPORTANCE_WEIGHT[level];
}

/**
 * Builds a map of nodeId → importance for all provided configs.
 * Nodes with importance 'off' are included (not filtered out).
 */
export function buildImportanceMap(
  configs: NodeWorkflowConfig[],
): Record<string, ImportanceLevel> {
  const map: Record<string, ImportanceLevel> = {};
  for (const config of configs) {
    map[config.nodeId] = config.importance;
  }
  return map;
}

/** Returns true if the node should be executed (importance !== 'off'). */
export function isNodeActive(importance: ImportanceLevel): boolean {
  return importance !== 'off';
}

/**
 * Sorts configs descending by numeric weight so critical nodes appear first.
 * Does not mutate the original array.
 */
export function sortByImportance(configs: NodeWorkflowConfig[]): NodeWorkflowConfig[] {
  return [...configs].sort(
    (a, b) => resolveNumericWeight(b.importance) - resolveNumericWeight(a.importance),
  );
}
