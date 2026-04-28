import { useState, useEffect } from 'react';
import {
  Sparkles, Loader2, ThumbsUp, ThumbsDown,
  GripVertical, FileText, CheckCircle2,
} from 'lucide-react';
import { TrendingSidebar } from './TrendingSidebar';
import type { BackendApi } from '@/services/backendApi';
import type { TrendingCapabilities } from '../trending/hooks/useTrending';
import type { Clip } from '../feed/types';

type TabId = 'trending' | 'research' | 'analysis';

export interface TopicRightPanelProps {
  topic: string;
  idToken: string;
  api: BackendApi;
  capabilities?: TrendingCapabilities;
  pros: string[];
  cons: string[];
  generatingInsights: boolean;
  insightsError: string;
  onGenerateInsights: () => void;
  topicEntered: boolean;
  onClipDragStart: (clip: Clip) => void;
  onClipDragEnd: () => void;
  attachedClipIds: Set<string>;
}

export function TopicRightPanel({
  topic, idToken, api, capabilities,
  pros, cons, generatingInsights, insightsError,
  onGenerateInsights, topicEntered,
  onClipDragStart, onClipDragEnd, attachedClipIds,
}: TopicRightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('trending');
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClips, setLoadingClips] = useState(false);

  useEffect(() => {
    setLoadingClips(true);
    api.listClips(idToken)
      .then(setClips)
      .catch(() => {})
      .finally(() => setLoadingClips(false));
  }, [idToken, api]);

  const TABS: { id: TabId; label: string }[] = [
    { id: 'trending', label: 'Trending' },
    { id: 'research', label: 'Research' },
    { id: 'analysis', label: 'Analysis' },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-white/20">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={[
              'flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-all duration-150',
              activeTab === id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted/50 hover:text-muted',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        {activeTab === 'trending' && (
          <ClipsPanel
            clips={clips}
            loading={loadingClips}
            onDragStart={onClipDragStart}
            onDragEnd={onClipDragEnd}
            attachedClipIds={attachedClipIds}
          />
        )}
        {activeTab === 'research' && (
          <TrendingSidebar
            topic={topic}
            idToken={idToken}
            api={api}
            capabilities={capabilities}
            onRefresh={() => {}}
          />
        )}
        {activeTab === 'analysis' && (
          <AnalysisPanel
            pros={pros}
            cons={cons}
            generating={generatingInsights}
            error={insightsError}
            onGenerate={onGenerateInsights}
            canGenerate={topicEntered}
          />
        )}
      </div>
    </div>
  );
}

function ClipsPanel({
  clips, loading, onDragStart, onDragEnd, attachedClipIds,
}: {
  clips: Clip[];
  loading: boolean;
  onDragStart: (clip: Clip) => void;
  onDragEnd: () => void;
  attachedClipIds: Set<string>;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2.5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/30 bg-white/20 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted/20" />
            <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-muted/10" />
            <div className="mt-1 h-2.5 w-2/3 animate-pulse rounded bg-muted/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!clips.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <FileText className="h-8 w-8 text-muted/30" />
        <div>
          <p className="text-sm font-medium text-muted/60">No clips yet</p>
          <p className="mt-1 text-xs text-muted/40">Clip articles from your feed to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted/40">
        {clips.length} clip{clips.length !== 1 ? 's' : ''} · drag to sections
      </p>
      {clips.map((clip) => (
        <ClipNode
          key={clip.id}
          clip={clip}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          isAttached={attachedClipIds.has(clip.id)}
        />
      ))}
    </div>
  );
}

function ClipNode({
  clip, onDragStart, onDragEnd, isAttached,
}: {
  clip: Clip;
  onDragStart: (clip: Clip) => void;
  onDragEnd: () => void;
  isAttached: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
          id: clip.id,
          passageText: clip.passageText,
          articleUrl: clip.articleUrl,
          articleTitle: clip.articleTitle,
          source: clip.source,
        }));
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart(clip);
      }}
      onDragEnd={onDragEnd}
      className={[
        'group flex cursor-grab items-start gap-2 rounded-xl border p-3 backdrop-blur-sm',
        'transition-all duration-150 active:cursor-grabbing active:opacity-60 active:shadow-lg',
        isAttached
          ? 'border-primary/40 bg-primary/8'
          : 'border-white/40 bg-white/30 hover:border-primary/30 hover:bg-white/50',
      ].join(' ')}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted/30 group-hover:text-muted/60" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold leading-snug text-ink line-clamp-1">
            {clip.articleTitle || 'Untitled'}
          </p>
          {isAttached && (
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          )}
        </div>
        {clip.passageText && (
          <p className="mt-1 text-[11px] leading-relaxed text-muted/70 line-clamp-2">
            "{clip.passageText}"
          </p>
        )}
        {clip.source && (
          <p className="mt-1 text-[10px] text-muted/50">{clip.source}</p>
        )}
      </div>
    </div>
  );
}

function AnalysisPanel({
  pros, cons, generating, error, onGenerate, canGenerate,
}: {
  pros: string[];
  cons: string[];
  generating: boolean;
  error: string;
  onGenerate: () => void;
  canGenerate: boolean;
}) {
  const hasInsights = pros.length > 0 || cons.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
          Pros &amp; Cons
        </span>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || !canGenerate}
          className={[
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150',
            generating || !canGenerate
              ? 'cursor-not-allowed border-white/20 text-muted/40'
              : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
          ].join(' ')}
        >
          {generating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {generating ? 'Analysing…' : 'Generate with AI'}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {generating && !hasInsights && (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-muted/20" />
          ))}
        </div>
      )}

      {hasInsights && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600/70">
              <ThumbsUp className="h-3 w-3" />
              For
            </div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {pros.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-ink/80">
                  <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600/70">
              <ThumbsDown className="h-3 w-3" />
              Watch out
            </div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {cons.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-ink/80">
                  <span className="mt-0.5 shrink-0 text-amber-500">!</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!hasInsights && !generating && (
        <p className="text-xs text-muted/40">
          Enter a topic then click "Generate with AI" to get strategic pros &amp; cons.
        </p>
      )}
    </div>
  );
}
