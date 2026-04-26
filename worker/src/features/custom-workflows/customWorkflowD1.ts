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
      `SELECT id, name, description, optimization_target, extends_workflow_id, created_at
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
