import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Scissors, ExternalLink, Copy, Check, Scale, ChevronDown,
  Link2, ThumbsUp, ThumbsDown, Bookmark, Share2, Layers, PenLine, Sparkles,
} from 'lucide-react';
import type { NewsArticle } from '../../trending/types';
import type { BackendApi } from '@/services/backendApi';
import type { ArticleAnalysis } from '../types';
import type { SheetRow } from '../../../services/sheets';
import type { DraftConnection } from '../types';
import { useSelectionClipper, SelectionClipTooltip } from './SelectionClipper';

interface ArticleDetailViewProps {
  article: NewsArticle;
  idToken: string;
  api: BackendApi;
  onBack: () => void;
  onClip: (article: NewsArticle) => void;
  onClipPassage?: (text: string) => void;
  isClipped: boolean;
  rows?: SheetRow[];
  onOpenDraft?: (row: SheetRow) => void;
  onDebate?: () => void;
  asSheet?: boolean;
}

type TabKey = 'opinion' | 'perspectives' | 'connection' | 'debate';

const SOURCE_COLORS = [
  '#0BAB64','#FF7900','#7C3AED','#dc2626','#0EA5E9',
  '#F59E0B','#10B981','#3B82F6','#EC4899','#6366F1',
];

function sourceHex(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return SOURCE_COLORS[hash % SOURCE_COLORS.length];
}

function readMinutes(text?: string): number {
  if (!text) return 1;
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}

function formatRelTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <div className={`h-3 rounded bg-violet-100 animate-pulse ${width}`} />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="shrink-0 text-muted hover:text-primary transition-colors focus-visible:outline-none rounded"
      aria-label="Copy"
    >
      {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
    </button>
  );
}

function ToolbarBtn({
  icon, title, active = false, onClick,
}: { icon: React.ReactNode; title: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        'h-8 w-8 inline-flex items-center justify-center rounded-[7px] transition-colors duration-100 border-0 bg-transparent p-0',
        active ? 'text-primary' : 'text-muted hover:text-primary',
      ].join(' ')}
    >
      {icon}
    </button>
  );
}

/* ─── Right rail sections ─── */

function RLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-[13px] font-semibold text-ink tracking-tight mb-2.5">
      {children}
    </div>
  );
}

function RSection({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 last:mb-0">{children}</div>;
}

function RDivider() {
  return <div className="h-px bg-violet-200/45 my-0" />;
}

export function ArticleDetailView({
  article,
  idToken,
  api,
  onBack,
  onClip,
  onClipPassage,
  isClipped,
  rows = [],
  onOpenDraft,
  onDebate,
  asSheet = false,
}: ArticleDetailViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const articleContentRef = useRef<HTMLDivElement>(null);
  const [readPct, setReadPct] = useState(0);
  const [localClips, setLocalClips] = useState<string[]>([]);

  const [analysis, setAnalysis] = useState<ArticleAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('opinion');
  const [opinionResponse, setOpinionResponse] = useState('');
  const [connections, setConnections] = useState<DraftConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);

  const { tooltip: selectionTooltip, handleClip: handleSelectionClip } = useSelectionClipper({
    containerRef: articleContentRef,
    onClip: (text) => {
      onClipPassage?.(text);
      setLocalClips((prev) => [...prev, text]);
    },
    enabled: Boolean(onClipPassage),
  });

  const fetchAnalysis = () => {
    setAnalysisLoading(true);
    setAnalysis(null);
    setAnalysisError(null);
    api
      .analyzeFeedArticle(idToken, {
        title: article.title,
        description: article.description,
        source: article.source,
      })
      .then(setAnalysis)
      .catch((e: unknown) =>
        setAnalysisError((e instanceof Error ? e.message : null) || 'Could not analyze article.'),
      )
      .finally(() => setAnalysisLoading(false));
  };

  useEffect(() => {
    fetchAnalysis();
    setLocalClips([]);
    setReadPct(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.url, idToken]);

  useEffect(() => {
    if (activeTab !== 'connection' || rows.length === 0) return;
    setConnectionsLoading(true);
    setConnectionsError(null);
    api
      .findDraftConnections(idToken, {
        title: article.title,
        description: article.description ?? '',
        drafts: rows
          .map((r) => ({ topicId: r.topicId ?? '', topic: r.topic ?? '' }))
          .filter((d) => d.topicId && d.topic),
      })
      .then((result) => setConnections(result.connections))
      .catch((e: unknown) => {
        setConnections([]);
        setConnectionsError((e instanceof Error ? e.message : null) || 'Could not load connections.');
      })
      .finally(() => setConnectionsLoading(false));
  }, [activeTab, article.url, idToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = el.scrollHeight - el.clientHeight;
    setReadPct(max <= 0 ? 100 : Math.round((el.scrollTop / max) * 100));
  };

  const dotColor = article.source ? sourceHex(article.source) : '#7C3AED';
  const mins = readMinutes(article.description);
  const relTime = formatRelTime(article.publishedAt);

  const handleClipOpinionResponse = () => {
    if (!opinionResponse.trim()) return;
    onClip({ ...article, description: opinionResponse });
  };

  /* ─── Article body (shared between sheet and full reader) ─── */
  const ArticleBody = (
    <article
      className="max-w-[720px] mx-auto px-8 py-9 pb-28"
      ref={asSheet ? articleContentRef : undefined}
    >
      {selectionTooltip && (
        <SelectionClipTooltip
          x={selectionTooltip.x}
          y={selectionTooltip.y}
          onClip={handleSelectionClip}
        />
      )}

      {/* Cluster badge */}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/[0.08] border border-primary/[0.18] text-[10px] font-bold uppercase tracking-[0.04em] text-primary mb-3.5">
        <Layers size={11} aria-hidden />
        1 outlet covering
      </span>

      {/* Title */}
      <h1 className="text-[30px] leading-[1.15] font-semibold tracking-[-0.018em] text-ink mb-3.5">
        {article.title}
      </h1>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap text-[12.5px] text-muted pb-[18px] border-b border-violet-200/55 mb-6">
        <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: dotColor }} />
        <span className="font-semibold text-ink">{article.source}</span>
        {relTime && (
          <>
            <span className="w-[3px] h-[3px] rounded-full bg-violet-300 shrink-0" />
            <span>{relTime}</span>
          </>
        )}
        <span className="w-[3px] h-[3px] rounded-full bg-violet-300 shrink-0" />
        <span>{mins} min read</span>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11.5px] font-semibold text-primary border border-violet-200/70 bg-white/70 hover:border-primary hover:bg-white transition-all duration-100"
        >
          <ExternalLink size={11} aria-hidden />
          Read original
        </a>
      </div>

      {/* Lede */}
      {article.description && (
        <p className="text-[17px] leading-[1.6] font-medium text-ink tracking-[-0.005em] mb-[22px]">
          {article.description}
        </p>
      )}

      {/* Clipped passages rail */}
      {localClips.length > 0 && (
        <div className="mt-6 px-3.5 py-3 rounded-[10px] bg-white/60 border border-dashed border-primary/30 flex items-center gap-2.5 flex-wrap">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-violet-500 flex items-center gap-1">
            <Scissors size={12} aria-hidden />
            {localClips.length} clip{localClips.length !== 1 ? 's' : ''} from this article
          </span>
          {localClips.map((clip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-[5px] bg-primary/[0.07] border border-primary/[0.18] rounded-[7px] text-[11.5px] text-ink max-w-xs"
            >
              <span className="italic truncate max-w-[240px]">"{clip}"</span>
              <button
                type="button"
                className="text-muted/60 hover:text-primary transition-colors"
                onClick={() => setLocalClips((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remove clip"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Compose CTA */}
      <div className="mt-10 px-6 py-7 rounded-2xl border border-primary/[0.18] bg-gradient-to-br from-primary/[0.08] to-violet-400/[0.04] text-center">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-violet-500 mb-2">
          Done reading?
        </div>
        <div className="text-[22px] font-semibold text-ink tracking-tight mb-1.5">
          Turn this into a LinkedIn post
        </div>
        <p className="text-[13.5px] text-muted mb-5 max-w-[480px] mx-auto leading-[1.55]">
          We'll seed your draft with this article's key points
          {localClips.length > 0 ? ` and your ${localClips.length} clipped passage${localClips.length !== 1 ? 's' : ''}` : ''}.
          You stay in the driver's seat — edit, set the channel and schedule, then publish.
        </p>
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => onClip(article)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-[0_8px_22px_-6px_rgba(124,58,237,0.5)] hover:bg-primary/90 transition-colors"
          >
            <PenLine size={15} aria-hidden />
            Compose post from this article
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-violet-200/70 bg-white/70 text-ink text-[13px] font-semibold hover:border-primary hover:text-primary transition-all duration-100"
          >
            <Bookmark size={15} aria-hidden />
            Save for later
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] border border-violet-200/70 bg-white/70 text-ink text-[13px] font-semibold hover:border-primary hover:text-primary transition-all duration-100"
          >
            <ArrowLeft size={15} aria-hidden />
            Back to feed
          </button>
        </div>
      </div>
    </article>
  );

  /* ─── Right rail (AI analysis) ─── */
  const RightRail = (
    <aside className="w-[300px] shrink-0 border-l border-violet-200/45 bg-white/62 backdrop-blur-[18px] overflow-y-auto px-[22px] py-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { value: '1 outlet', label: 'Covering this story' },
          { value: analysis ? (analysis.summary.toLowerCase().includes('positive') ? 'Positive' : 'Neutral') : '—', label: 'Tone across outlets' },
          { value: relTime || '—', label: 'Published' },
          { value: `${mins} min`, label: 'Est. read time' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <div className="text-[15.5px] font-bold text-ink leading-[1.2] tracking-tight">{s.value}</div>
            <div className="text-[11px] text-muted font-medium leading-[1.4]">{s.label}</div>
          </div>
        ))}
      </div>

      <RDivider />
      <div className="pt-5">

        {/* Summary */}
        <RSection>
          <RLabel>Summary</RLabel>
          {analysisLoading && (
            <div className="space-y-2">
              <SkeletonLine />
              <SkeletonLine width="w-4/5" />
              <SkeletonLine width="w-3/4" />
            </div>
          )}
          {analysisError && (
            <div className="space-y-1.5">
              <p className="text-xs text-red-500">{analysisError}</p>
              <button type="button" onClick={fetchAnalysis} className="text-xs font-semibold text-primary hover:underline">
                Try again
              </button>
            </div>
          )}
          {analysis && (
            <div className="space-y-3">
              <details className="group" open>
                <summary className="flex cursor-pointer items-center justify-between text-[12.5px] font-semibold text-muted list-none pb-1.5 border-b border-violet-200/45">
                  What is this about?
                  <ChevronDown size={12} className="text-muted/50 transition-transform group-open:rotate-180 shrink-0" />
                </summary>
                <p className="pt-2 text-[12.5px] text-ink/75 leading-relaxed">{analysis.summary}</p>
              </details>
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between text-[12.5px] font-semibold text-muted list-none pb-1.5 border-b border-violet-200/45">
                  Why does it matter?
                  <ChevronDown size={12} className="text-muted/50 transition-transform group-open:rotate-180 shrink-0" />
                </summary>
                <p className="pt-2 text-[12.5px] text-ink/75 leading-relaxed">{analysis.whyItMatters}</p>
              </details>
            </div>
          )}
        </RSection>

        <RDivider />
        <div className="pt-5">

        {/* Post angles */}
        <RSection>
          <RLabel>
            <Sparkles size={13} className="text-primary shrink-0" aria-hidden />
            Post angles
          </RLabel>
          {analysisLoading && (
            <div className="space-y-2">
              <SkeletonLine /><SkeletonLine width="w-4/5" /><SkeletonLine width="w-3/4" />
            </div>
          )}
          {analysis && (
            <ol className="space-y-1.5">
              {analysis.postAngles.map((angle, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 py-2 border-b border-violet-200/45 last:border-b-0 cursor-default"
                >
                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[12.5px] text-ink/80 leading-relaxed">{angle}</span>
                  <CopyButton text={angle} />
                </li>
              ))}
            </ol>
          )}
          {!analysisLoading && !analysis && analysisError && (
            <p className="text-xs text-muted italic">Unavailable</p>
          )}
        </RSection>

        <RDivider />
        <div className="pt-5">

        {/* Opposing view */}
        {(analysis || analysisLoading) && (
          <>
            <RSection>
              <RLabel>
                <Scale size={13} className="text-amber-500 shrink-0" aria-hidden />
                Opposing view
              </RLabel>
              {analysisLoading && (
                <div className="space-y-2"><SkeletonLine /><SkeletonLine width="w-4/5" /></div>
              )}
              {analysis && (
                <p className="text-[12.5px] text-ink/75 leading-relaxed">{analysis.opposingView}</p>
              )}
            </RSection>
            <RDivider />
          </>
        )}

        {/* Tabs: Opinion / Perspectives / Connection / Debate */}
        <RSection>
          {/* Tab strip */}
          <div className="flex gap-0.5 bg-violet-50/80 rounded-full p-0.5 mb-3">
            {(
              [
                { key: 'opinion', label: 'Opinion' },
                { key: 'perspectives', label: 'Views' },
                { key: 'connection', label: 'Connect' },
                { key: 'debate', label: 'Debate' },
              ] as { key: TabKey; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  'flex-1 rounded-full px-1.5 py-1.5 text-[11px] font-semibold transition-all duration-150',
                  activeTab === key ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-ink bg-transparent',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Opinion */}
          {activeTab === 'opinion' && (
            <div className="space-y-3">
              {analysisLoading && <SkeletonLine />}
              {analysis && (
                <>
                  <p className="text-[12px] text-ink/70 italic leading-relaxed border-l-2 border-primary/25 pl-2.5 py-0.5">
                    {analysis.opinionPrompt}
                  </p>
                  <textarea
                    value={opinionResponse}
                    onChange={(e) => setOpinionResponse(e.target.value)}
                    placeholder="Your take..."
                    rows={3}
                    className="w-full min-h-[80px] rounded-lg border border-violet-200/60 bg-white/80 px-3 py-2 text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleClipOpinionResponse}
                    disabled={!opinionResponse.trim()}
                    className="w-full rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <Scissors size={12} />
                    Clip this response
                  </button>
                </>
              )}
              {!analysisLoading && !analysis && analysisError && (
                <p className="text-xs text-muted italic">Unavailable until analysis loads.</p>
              )}
            </div>
          )}

          {/* Tab: Perspectives */}
          {activeTab === 'perspectives' && (
            <div className="space-y-2">
              {analysisLoading && (
                <div className="space-y-2">
                  <SkeletonLine /><SkeletonLine width="w-4/5" /><SkeletonLine width="w-3/4" />
                </div>
              )}
              {analysis &&
                [
                  { role: 'Founder', text: analysis.perspectiveFlip.founder },
                  { role: 'Expert', text: analysis.perspectiveFlip.expert },
                  { role: 'Beginner', text: analysis.perspectiveFlip.beginner },
                ].map(({ role, text }) => (
                  <div key={role} className="py-2 border-b border-violet-200/45 last:border-b-0">
                    <p className="text-[10.5px] font-bold text-primary uppercase tracking-wide mb-1">{role}</p>
                    <p className="text-[12px] text-ink/80 leading-relaxed">{text}</p>
                  </div>
                ))}
              {!analysisLoading && !analysis && analysisError && (
                <p className="text-xs text-muted italic">Unavailable until analysis loads.</p>
              )}
            </div>
          )}

          {/* Tab: Connection */}
          {activeTab === 'connection' && (
            <div className="space-y-2">
              {connectionsLoading && (
                <div className="space-y-2"><SkeletonLine /><SkeletonLine width="w-4/5" /></div>
              )}
              {connectionsError && !connectionsLoading && (
                <div className="space-y-1.5">
                  <p className="text-xs text-red-500">{connectionsError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setConnectionsError(null);
                      setConnectionsLoading(true);
                      api
                        .findDraftConnections(idToken, {
                          title: article.title,
                          description: article.description ?? '',
                          drafts: rows
                            .map((r) => ({ topicId: r.topicId ?? '', topic: r.topic ?? '' }))
                            .filter((d) => d.topicId && d.topic),
                        })
                        .then((result) => setConnections(result.connections))
                        .catch((e: unknown) => {
                          setConnections([]);
                          setConnectionsError((e instanceof Error ? e.message : null) || 'Could not load connections.');
                        })
                        .finally(() => setConnectionsLoading(false));
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}
              {!connectionsLoading && !connectionsError && connections.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                  <Link2 size={18} className="text-muted/50" />
                  <p className="text-xs text-muted leading-relaxed italic">
                    {rows.length === 0
                      ? 'Open a draft from the Clips Dock to see connections.'
                      : 'No drafts seem to relate to this article.'}
                  </p>
                </div>
              )}
              {!connectionsLoading &&
                connections.map((conn) => (
                  <div
                    key={conn.topicId}
                    className="py-2 border-b border-violet-200/45 last:border-b-0 space-y-1"
                  >
                    <p className="text-[12.5px] font-semibold text-ink line-clamp-1">{conn.topic}</p>
                    <p className="text-[11.5px] text-muted leading-relaxed">{conn.reason}</p>
                    {onOpenDraft && rows.some((r) => r.topicId === conn.topicId) && (
                      <button
                        type="button"
                        onClick={() => {
                          const row = rows.find((r) => r.topicId === conn.topicId);
                          if (row) onOpenDraft(row);
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Open Draft →
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Tab: Debate */}
          {activeTab === 'debate' && (
            <div className="space-y-3">
              <p className="text-xs text-ink/70 leading-relaxed">
                Compare this article against an opposing perspective side by side.
              </p>
              {onDebate && (
                <button
                  type="button"
                  onClick={onDebate}
                  className="w-full rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Scale size={14} />
                  Enter Debate Mode
                </button>
              )}
            </div>
          )}
        </RSection>

        </div>
        </div>
        </div>
      </div>
    </aside>
  );

  /* ─── asSheet layout ─── */
  if (asSheet) {
    return (
      <div className="flex flex-col h-full overflow-y-auto" onScroll={handleScroll}>
        {/* Progress bar */}
        <div className="sticky top-0 h-0.5 bg-primary/10 z-10 shrink-0">
          <div
            className="h-full bg-gradient-to-r from-primary to-violet-400 transition-[width] duration-100"
            style={{ width: `${readPct}%` }}
          />
        </div>

        {/* Back button */}
        <div className="px-6 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold text-muted hover:bg-white/60 hover:text-ink transition-all duration-100"
          >
            <ArrowLeft size={15} aria-hidden />
            Feed
          </button>
        </div>

        <div ref={articleContentRef}>{ArticleBody}</div>

        {/* AI sections below article in sheet mode */}
        <div className="px-8 pb-10 space-y-4">
          {/* Summary */}
          <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/90 to-sky-50/50 backdrop-blur-sm p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Summary</span>
            </div>
            {analysisLoading && (
              <div className="space-y-2"><SkeletonLine /><SkeletonLine width="w-4/5" /></div>
            )}
            {analysis && (
              <p className="text-[13px] text-blue-900/70 leading-relaxed">{analysis.summary}</p>
            )}
          </div>

          {/* Post Angles */}
          {analysis && (
            <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 to-purple-50/40 backdrop-blur-sm p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Post Angles</span>
              </div>
              <ol className="space-y-2">
                {analysis.postAngles.map((angle, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink/80 leading-relaxed">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="flex-1">{angle}</span>
                    <CopyButton text={angle} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Full reader layout ─── */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Reading progress bar */}
      <div className="h-0.5 bg-primary/[0.10] shrink-0 z-20">
        <div
          className="h-full bg-gradient-to-r from-primary to-violet-400 transition-[width] duration-100"
          style={{ width: `${readPct}%` }}
        />
      </div>

      {/* Sticky reader header */}
      <div className="shrink-0 bg-white/[0.78] backdrop-blur-[18px] border-b border-violet-200/55 px-8 py-2.5 flex items-center gap-3.5 z-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-muted hover:bg-white/60 hover:text-ink transition-all duration-100 shrink-0"
        >
          <ArrowLeft size={15} aria-hidden />
          Feed
        </button>
        <span className="text-violet-300 select-none">/</span>
        <span className="text-[12px] text-muted/80 font-semibold truncate min-w-0 flex-1">
          {article.title}
        </span>
        <div className="ml-auto flex items-center gap-0.5 shrink-0">
          <ToolbarBtn icon={<ThumbsUp size={16} aria-hidden />} title="Like" />
          <ToolbarBtn icon={<ThumbsDown size={16} aria-hidden />} title="Hide" />
          <ToolbarBtn
            icon={<Scissors size={16} aria-hidden />}
            title={isClipped ? 'Clipped' : 'Clip article'}
            active={isClipped}
            onClick={() => onClip(article)}
          />
          <ToolbarBtn icon={<Bookmark size={16} aria-hidden />} title="Save" />
          <ToolbarBtn icon={<Share2 size={16} aria-hidden />} title="Share" />
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 inline-flex items-center justify-center rounded-[7px] text-muted hover:text-primary transition-colors"
            title="Open original"
          >
            <ExternalLink size={16} aria-hidden />
          </a>
        </div>
      </div>

      {/* Content row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Center scrollable article */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          <div ref={articleContentRef}>{ArticleBody}</div>
        </div>

        {/* Right rail */}
        {RightRail}
      </div>
    </div>
  );
}
