// worker/src/features/custom-workflows/customWorkflowToDefinition.ts
/**
 * Converts a CustomWorkflow (from D1) into a WorkflowDefinition that the
 * WorkflowRegistry can resolve and run. Uses existing engine utilities —
 * no new logic is introduced here.
 */

import { dimensionValueToImportance } from '../../engine/types';
import type {
  WorkflowDefinition,
  NodeWorkflowConfig,
  ImportanceLevel,
  DimensionName,
} from '../../engine/types';
import type { CreateCustomWorkflowPayload, CustomWorkflow } from './types';

// Mirrors the private constant in WorkflowRunner.ts — kept in sync manually.
export const DIMENSION_NODE_MAP: Record<DimensionName, string[]> = {
  emotions:    ['hook-designer', 'narrative-arc'],
  psychology:  ['psychology-analyzer'],
  persuasion:  ['hook-designer', 'narrative-arc'],
  copywriting: ['tone-calibrator', 'draft-generator'],
  storytelling: ['narrative-arc'],
  typography:  ['constraint-validator', 'tone-calibrator'],
  vocabulary:  ['vocabulary-selector'],
};

const IMPORTANCE_ORDER: ImportanceLevel[] = ['off', 'background', 'supporting', 'important', 'critical'];

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
