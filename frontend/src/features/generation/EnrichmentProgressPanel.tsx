// frontend/src/features/generation/EnrichmentProgressPanel.tsx

import { CheckCircle, Loader2, Circle } from 'lucide-react';
import { NODE_PROGRESS_LABELS, formatDuration, type EnrichmentNodeEvent } from './nodeProgressLabels';

export interface NodeProgressState {
  nodeId: string;
  status: 'pending' | 'running' | 'done';
  durationMs?: number;
  insightSummary?: string | null;
}

interface EnrichmentProgressPanelProps {
  /** Ordered list of nodes that are part of the current workflow */
  expectedNodeIds: string[];
  /** Events received so far via SSE */
  completedEvents: EnrichmentNodeEvent[];
  /** Which node is currently running */
  activeNodeId?: string | null;
}

export function EnrichmentProgressPanel({
  expectedNodeIds,
  completedEvents,
  activeNodeId,
}: EnrichmentProgressPanelProps) {
  const completedMap = new Map(completedEvents.map(e => [e.nodeId, e]));

  // Show expected nodes first, then any completed nodes not in the expected list
  const allNodeIds = [
    ...expectedNodeIds,
    ...completedEvents.map(e => e.nodeId).filter(id => !expectedNodeIds.includes(id)),
  ];

  return (
    <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/40 p-3 space-y-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-indigo-600 mb-2">
        Enrichment in progress
      </p>
      {allNodeIds.map(nodeId => {
        const labels = NODE_PROGRESS_LABELS[nodeId];
        const event = completedMap.get(nodeId);
        const isActive = activeNodeId === nodeId;
        const isDone = !!event;

        return (
          <div key={nodeId} className="flex items-start gap-2">
            {isDone ? (
              <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-500" />
            ) : isActive ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-500 animate-spin" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-300" />
            )}
            <div className="min-w-0">
              <span className={`text-xs font-medium ${isDone ? 'text-ink' : isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
                {isDone && labels
                  ? labels.done
                  : isActive && labels
                    ? labels.pending
                    : labels?.pending ?? nodeId}
                {isDone && event?.durationMs != null && (
                  <span className="ml-1.5 text-[0.6rem] text-muted font-normal">
                    {formatDuration(event.durationMs)}
                  </span>
                )}
              </span>
              {isDone && event?.insightSummary && (
                <p className="text-[0.6rem] text-slate-500 leading-relaxed mt-0.5">
                  {event.insightSummary}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
