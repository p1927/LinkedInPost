import { SheetsGateway } from './persistence/drafts';
import { PipelineStore } from './persistence/pipeline-db';
import type { Env } from './index';

/**
 * All request-scoped services wired from the Worker environment.
 * Create once per request via `buildServices(env)` rather than
 * scattering `new SheetsGateway(env)` / `new PipelineStore(env.PIPELINE_DB)` calls.
 */
export interface Services {
  sheets: SheetsGateway;
  pipeline: PipelineStore;
}

export function buildServices(env: Env): Services {
  return {
    sheets: new SheetsGateway(env),
    pipeline: new PipelineStore(env.PIPELINE_DB),
  };
}
