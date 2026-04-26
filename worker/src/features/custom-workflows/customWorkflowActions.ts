// worker/src/features/custom-workflows/customWorkflowActions.ts

import type { D1Database } from '@cloudflare/workers-types';
import {
  dbListCustomWorkflows,
  dbGetCustomWorkflow,
  dbInsertCustomWorkflow,
  dbUpdateCustomWorkflow,
  dbSoftDeleteCustomWorkflow,
} from './customWorkflowD1';
import { dimensionWeightsToNodeConfigs } from './customWorkflowToDefinition';
import type { CreateCustomWorkflowPayload, UpdateCustomWorkflowPayload } from './types';
import { workflowRegistry } from '../../engine/registry/WorkflowRegistry';

function nanoid10(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  for (const byte of arr) result += chars[byte % chars.length];
  return result;
}

function validatePayload(p: CreateCustomWorkflowPayload): string | null {
  if (!p.name?.trim()) return 'name is required';
  if (p.name.trim().length > 40) return 'name must be 40 characters or fewer';
  if (!p.description?.trim()) return 'description is required';
  if (!p.generationInstruction?.trim()) return 'generationInstruction is required';
  if (!p.extendsWorkflowId?.trim()) return 'extendsWorkflowId is required';
  return null;
}

export async function handleListCustomWorkflows(db: D1Database, userId: string): Promise<Response> {
  const workflows = await dbListCustomWorkflows(db, userId);
  return Response.json({ workflows });
}

export async function handleCreateCustomWorkflow(
  db: D1Database,
  userId: string,
  payload: CreateCustomWorkflowPayload,
): Promise<Response> {
  const error = validatePayload(payload);
  if (error) return Response.json({ error }, { status: 400 });

  // Resolve base workflow to get its node configs as starting point
  let baseNodeConfigs = workflowRegistry.resolve('base').nodeConfigs;
  try {
    baseNodeConfigs = workflowRegistry.resolve(payload.extendsWorkflowId).nodeConfigs;
  } catch {
    // extendsWorkflowId not found — fall back to base
  }

  const nodeConfigs = dimensionWeightsToNodeConfigs(
    payload.dimensionWeights ?? {},
    baseNodeConfigs,
  );

  const now = new Date().toISOString();
  const id = `cw_${nanoid10()}`;

  await dbInsertCustomWorkflow(db, {
    id,
    userId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    optimizationTarget: payload.optimizationTarget?.trim() ?? '',
    generationInstruction: payload.generationInstruction.trim(),
    extendsWorkflowId: payload.extendsWorkflowId,
    nodeConfigs,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id }, { status: 201 });
}

export async function handleUpdateCustomWorkflow(
  db: D1Database,
  userId: string,
  payload: UpdateCustomWorkflowPayload,
): Promise<Response> {
  if (!payload.id) return Response.json({ error: 'id is required' }, { status: 400 });
  const error = validatePayload(payload);
  if (error) return Response.json({ error }, { status: 400 });

  const existing = await dbGetCustomWorkflow(db, payload.id, userId);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  let baseNodeConfigs = workflowRegistry.resolve('base').nodeConfigs;
  try {
    baseNodeConfigs = workflowRegistry.resolve(payload.extendsWorkflowId).nodeConfigs;
  } catch { /* fall back to base */ }

  const nodeConfigs = dimensionWeightsToNodeConfigs(
    payload.dimensionWeights ?? {},
    baseNodeConfigs,
  );

  const updated = await dbUpdateCustomWorkflow(
    db,
    payload.id,
    userId,
    {
      name: payload.name.trim(),
      description: payload.description.trim(),
      optimizationTarget: payload.optimizationTarget?.trim() ?? '',
      generationInstruction: payload.generationInstruction.trim(),
      extendsWorkflowId: payload.extendsWorkflowId,
      nodeConfigs,
    },
    new Date().toISOString(),
  );

  if (!updated) return Response.json({ error: 'Update failed' }, { status: 500 });
  return Response.json({ ok: true });
}

export async function handleDeleteCustomWorkflow(
  db: D1Database,
  userId: string,
  id: string,
): Promise<Response> {
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
  const deleted = await dbSoftDeleteCustomWorkflow(db, id, userId);
  if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
}
