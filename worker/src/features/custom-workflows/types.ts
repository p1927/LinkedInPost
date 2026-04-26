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
