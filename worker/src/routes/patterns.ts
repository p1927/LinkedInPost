import type { PipelineStore } from '../persistence/pipeline-db/pipeline';

/**
 * Pattern-related action handlers.
 * Integrated via dispatchAction cases in index.ts.
 */

export async function handleGetPatternAssignment(
  pipeline: PipelineStore,
  spreadsheetId: string,
  payload: Record<string, unknown>,
): Promise<{
  generationRunId: string;
  patternId: string;
  patternName: string;
  patternRationale: string;
  testGroup: string;
} | null> {
  const topicId = String(payload.topicId || '').trim();
  if (!topicId) {
    throw new Error('topicId is required.');
  }
  return pipeline.getTemplateAssignment(spreadsheetId, topicId);
}

export async function handleListPatternAssignments(
  pipeline: PipelineStore,
  spreadsheetId: string,
): Promise<
  Array<{
    topicId: string;
    generationRunId: string;
    patternId: string;
    patternName: string;
    patternRationale: string;
    testGroup: string;
    assignedAt: string;
  }>
> {
  return pipeline.listTemplateAssignments(spreadsheetId);
}

export async function handleSavePatternMetadata(
  pipeline: PipelineStore,
  spreadsheetId: string,
  payload: Record<string, unknown>,
  getRow: () => Promise<import('../generation/types').SheetRow>,
): Promise<import('../generation/types').SheetRow> {
  const generationRunId = String(payload.generationRunId || '').trim();
  const patternId = String(payload.patternId || '').trim();
  const patternName = String(payload.patternName || '').trim();
  const patternRationale = String(payload.patternRationale || '').trim();
  if (!patternId) {
    throw new Error('patternId is required.');
  }
  const row = await getRow();
  return pipeline.savePatternMetadata(spreadsheetId, row, {
    generationRunId,
    patternId,
    patternName,
    patternRationale,
  });
}

export async function handleGetTestGroup(
  payload: Record<string, unknown>,
): Promise<{ topicId: string; testGroup: string }> {
  const { getRandomizedTestGroup } = await import('../persistence/pipeline-db/pipeline');
  const topicId = String(payload.topicId || '').trim();
  if (!topicId) {
    throw new Error('topicId is required.');
  }
  return { topicId, testGroup: getRandomizedTestGroup(topicId) };
}
