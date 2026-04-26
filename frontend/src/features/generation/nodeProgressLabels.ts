// frontend/src/features/generation/nodeProgressLabels.ts

export interface NodeProgressLabel {
  pending: string;
  done: string;
}

export const NODE_PROGRESS_LABELS: Record<string, NodeProgressLabel> = {
  'psychology-analyzer': { pending: 'Analysing your audience…',       done: 'Audience psychology mapped' },
  'research-context':    { pending: 'Gathering research context…',    done: 'Research context ready' },
  'vocabulary-selector': { pending: 'Selecting vocabulary…',          done: 'Vocabulary selected' },
  'hook-designer':       { pending: 'Designing hook options…',        done: 'Hook options ready' },
  'narrative-arc':       { pending: 'Planning narrative structure…',  done: 'Narrative arc set' },
  'draft-generator':     { pending: 'Generating variants…',           done: 'Variants generated' },
  'tone-calibrator':     { pending: 'Calibrating tone to your voice…', done: 'Tone calibrated' },
  'constraint-validator':{ pending: 'Validating constraints…',        done: 'Constraints validated' },
};

export interface EnrichmentNodeEvent {
  type: 'enrichment:node_completed';
  nodeId: string;
  durationMs: number;
  insightSummary: string | null;
}

/** Parses a raw SSE `data:` line value. Returns null if not an enrichment event. */
export function parseEnrichmentEvent(rawData: string): EnrichmentNodeEvent | null {
  try {
    const parsed = JSON.parse(rawData) as { type?: string };
    if (parsed.type !== 'enrichment:node_completed') return null;
    return parsed as EnrichmentNodeEvent;
  } catch {
    return null;
  }
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
