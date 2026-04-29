import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Scissors, ExternalLink, Copy, Check, Scale, ChevronDown, Sparkles, Info, Link2, BookOpen } from 'lucide-react';
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

function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return (
    <div className={`h-3 rounded bg-violet-100 animate-pulse ${width}`} />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 shrink-0 text-muted hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
      aria-label="Copy"
    >
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
    </button>
  );
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
  const articleContentRef = useRef<HTMLDivElement>(null);

  const { tooltip: selectionTooltip, handleClip: handleSelectionClip } = useSelectionClipper({
    containerRef: articleContentRef,
    onClip: (text) => onClipPassage?.(text),
    enabled: Boolean(onClipPassage),
  });

  const [analysis, setAnalysis] = useState<ArticleAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('opinion');
  const [opinionResponse, setOpinionResponse] = useState('');
  const [connections, setConnections] = useState<DraftConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);

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
        setAnalysisError(
          (e instanceof Error ? e.message : null) || 'Could not analyze article.',
        ),
      )
      .finally(() => setAnalysisLoading(false));
  };

  useEffect(() => {
    fetchAnalysis();
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
        drafts: rows.map(r => ({ topicId: r.topicId ?? '', topic: r.topic ?? '' })).filter(d => d.topicId && d.topic),
      })
      .then(result => setConnections(result.connections))
      .catch((e: unknown) => {
        setConnections([]);
        setConnectionsError((e instanceof Error ? e.message : null) || 'Could not load connections.');
      })
      .finally(() => setConnectionsLoading(false));
  }, [activeTab, article.url, idToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const formattedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const handleClipOpinionResponse = () => {
    if (!opinionResponse.trim()) return;
    onClip({
      ...article,
      description: opinionResponse,
    });
  };

  return (
    <div className={asSheet ? 'flex flex-col gap-4 h-full overflow-y-auto' : 'flex gap-6 flex-1 min-h-0 overflow-hidden'}>
      {selectionTooltip && (
        <SelectionClipTooltip
          x={selectionTooltip.x}
          y={selectionTooltip.y}
          onClip={handleSelectionClip}
        />
      )}

      {/* ── LEFT: Article Content ─────────────────────────────── */}
      <div ref={articleContentRef} className={asSheet ? 'rounded-2xl border border-border/50 bg-white/70 backdrop-blur-sm p-6 flex flex-col gap-4' : 'flex-1 overflow-y-auto rounded-2xl border border-border/50 bg-white/70 backdrop-blur-sm p-6 flex flex-col gap-4'}>
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors w-fit"
        >
          <ArrowLeft size={15} />
          Back to Feed
        </button>

        {/* Hero image */}
        {article.imageUrl && (
          <div className="relative w-full overflow-hidden rounded-xl">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full max-h-48 object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-canvas/30 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-bold text-ink leading-tight tracking-tight">{article.title}</h1>

        {/* Meta: source + date */}
        <div className="flex items-center gap-2 flex-wrap">
          {article.source && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {article.source}
            </span>
          )}
          {formattedDate && (
            <span className="text-xs text-muted">{formattedDate}</span>
          )}
        </div>

        {/* Description */}
        {article.description && (
          <p className="text-sm text-ink/80 leading-relaxed border-l-2 border-primary/20 pl-3">
            {article.description}
          </p>
        )}

        {/* Action row */}
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg shadow-sm hover:bg-primary/90 hover:shadow-[0_0_0_4px_rgba(124,58,237,0.12)] transition-all duration-200"
          >
            Read Full Article
            <ExternalLink size={14} />
          </a>

          <button
            type="button"
            onClick={() => onClip(article)}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all duration-200',
              isClipped
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border/60 text-muted hover:border-primary/50 hover:text-primary',
            ].join(' ')}
            title={isClipped ? 'Clipped' : 'Clip article'}
          >
            <Scissors size={14} className={isClipped ? 'fill-primary' : ''} />
            {isClipped ? 'Clipped' : 'Clip'}
          </button>

          {onDebate && (
            <button
              type="button"
              onClick={onDebate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold text-muted hover:border-amber-400/60 hover:text-amber-700 active:scale-[0.97] transition-all duration-150"
              title="Find an opposing article"
            >
              <Scale size={14} />
              Debate
            </button>
          )}
        </div>

        {/* Note */}
        <div className="flex items-center gap-1.5 border-t border-border/40 pt-3">
          <Info size={12} className="text-muted/60 shrink-0" />
          <p className="text-xs text-muted italic">
            Article content is displayed as a preview. Click "Read Full Article" to view the complete article.
          </p>
        </div>
      </div>

      {/* ── RIGHT: AI Insight Panel ───────────────────────────── */}
      <div className={asSheet ? 'flex flex-col gap-4' : 'w-80 xl:w-96 shrink-0 overflow-y-auto flex flex-col gap-4'}>

        {/* [G] Article Intelligence */}
        <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/90 to-sky-50/50 backdrop-blur-sm p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={14} className="text-blue-500 shrink-0" />
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Summary</h3>
          </div>

          {analysisLoading && (
            <div className="space-y-2">
              <SkeletonLine />
              <SkeletonLine width="w-4/5" />
              <SkeletonLine width="w-3/4" />
            </div>
          )}

          {analysisError && (
            <div className="space-y-2">
              <p className="text-xs text-red-600">{analysisError}</p>
              <button
                type="button"
                onClick={fetchAnalysis}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {analysis && (
            <div className="space-y-2">
              <details className="group rounded-lg border border-blue-200/50 bg-white/60 overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-semibold text-blue-900/80 hover:bg-blue-50/60 list-none">
                  What is this about?
                  <ChevronDown size={13} className="text-blue-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-3 pb-3 pt-1 text-[13px] text-blue-900/70 leading-relaxed">{analysis.summary}</p>
              </details>

              <details className="group rounded-lg border border-blue-200/50 bg-white/60 overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-semibold text-blue-900/80 hover:bg-blue-50/60 list-none">
                  Why does it matter?
                  <ChevronDown size={13} className="text-blue-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-3 pb-3 pt-1 text-[13px] text-blue-900/70 leading-relaxed">{analysis.whyItMatters}</p>
              </details>

            </div>
          )}
        </div>

        {/* [H] Opposing View */}
        <div className="relative rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-orange-50/40 backdrop-blur-sm p-4 overflow-hidden">
          <span aria-hidden className="absolute top-2 right-3 text-3xl font-serif text-amber-200/80 select-none leading-none pointer-events-none">"</span>
          <div className="flex items-center gap-1.5 mb-3">
            <Scale size={14} className="text-amber-500 shrink-0" />
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Opposing View</h3>
          </div>

          {analysisLoading && (
            <div className="space-y-2">
              <SkeletonLine />
              <SkeletonLine width="w-4/5" />
            </div>
          )}

          {analysis && (
            <p className="text-[13px] text-amber-900/75 leading-relaxed">{analysis.opposingView}</p>
          )}

          {!analysisLoading && !analysis && analysisError && (
            <p className="text-xs text-muted italic">Unavailable</p>
          )}
        </div>

        {/* [I] 3 Post Angles */}
        <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 to-purple-50/40 backdrop-blur-sm p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={14} className="text-violet-500 shrink-0" />
            <h3 className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Post Angles</h3>
          </div>

          {analysisLoading && (
            <div className="space-y-2">
              <SkeletonLine />
              <SkeletonLine width="w-4/5" />
              <SkeletonLine width="w-3/4" />
            </div>
          )}

          {analysis && (
            <ol className="space-y-2">
              {analysis.postAngles.map((angle, i) => (
                <li
                  key={i}
                  className="group flex items-start gap-2 rounded-lg border border-border/40 bg-white/50 px-3 py-2 text-xs text-ink/80 hover:bg-white/60 hover:border-primary/20 transition-colors duration-150"
                >
                  <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">{i + 1}</span>
                  <span className="flex-1 leading-relaxed">{angle}</span>
                  <CopyButton text={angle} />
                </li>
              ))}
            </ol>
          )}

          {!analysisLoading && !analysis && analysisError && (
            <p className="text-xs text-muted italic">Unavailable</p>
          )}
        </div>

        {/* Tabs J/K/L */}
        <div className="rounded-2xl border border-border/50 bg-white/70 backdrop-blur-sm p-4 flex flex-col gap-3">
          {/* Segmented control tab strip */}
          <div className="flex gap-0.5 bg-surface-muted/60 rounded-full p-0.5">
            {(
              [
                { key: 'opinion', label: 'Opinion' },
                { key: 'perspectives', label: 'Perspectives' },
                { key: 'connection', label: 'Connection' },
                { key: 'debate' as TabKey, label: 'Debate' },
              ] as { key: TabKey; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  'flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-all duration-150',
                  activeTab === key
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-muted hover:text-ink bg-transparent',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab J — Opinion */}
          {activeTab === 'opinion' && (
            <div className="space-y-3">
              {analysisLoading && <SkeletonLine />}
              {analysis && (
                <>
                  <p className="text-xs text-ink/75 italic leading-relaxed border-l-2 border-primary/25 pl-2.5 py-0.5">{analysis.opinionPrompt}</p>
                  <textarea
                    value={opinionResponse}
                    onChange={(e) => setOpinionResponse(e.target.value)}
                    placeholder="Your take..."
                    rows={3}
                    className="w-full min-h-[80px] rounded-lg border border-border/60 bg-white/80 px-3 py-2 text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
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

          {/* Tab K — Perspectives */}
          {activeTab === 'perspectives' && (
            <div className="space-y-2">
              {analysisLoading && (
                <div className="space-y-2">
                  <SkeletonLine />
                  <SkeletonLine width="w-4/5" />
                  <SkeletonLine width="w-3/4" />
                </div>
              )}
              {analysis && (
                <>
                  {(
                    [
                      { role: 'Founder', text: analysis.perspectiveFlip.founder },
                      { role: 'Expert', text: analysis.perspectiveFlip.expert },
                      { role: 'Beginner', text: analysis.perspectiveFlip.beginner },
                    ]
                  ).map(({ role, text }) => (
                    <div key={role} className="rounded-lg border border-border/40 bg-white/50 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{role[0]}</span>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wide">{role}</p>
                      </div>
                      <p className="text-[12px] text-ink/80 leading-relaxed">{text}</p>
                    </div>
                  ))}
                </>
              )}
              {!analysisLoading && !analysis && analysisError && (
                <p className="text-xs text-muted italic">Unavailable until analysis loads.</p>
              )}
            </div>
          )}

          {/* Tab L — Connection */}
          {activeTab === 'connection' && (
            <div className="space-y-2">
              {connectionsLoading && (
                <div className="space-y-2">
                  <SkeletonLine />
                  <SkeletonLine width="w-4/5" />
                </div>
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
                          drafts: rows.map(r => ({ topicId: r.topicId ?? '', topic: r.topic ?? '' })).filter(d => d.topicId && d.topic),
                        })
                        .then(result => setConnections(result.connections))
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
              {!connectionsLoading && connections.map(conn => (
                <div
                  key={conn.topicId}
                  className="rounded-lg border border-border/40 bg-white/50 px-3 py-2.5 space-y-1"
                >
                  <p className="text-xs font-semibold text-ink line-clamp-1">{conn.topic}</p>
                  <p className="text-[11px] text-muted leading-relaxed">{conn.reason}</p>
                  {onOpenDraft && rows.some(r => r.topicId === conn.topicId) && (
                    <button
                      type="button"
                      onClick={() => {
                        const row = rows.find(r => r.topicId === conn.topicId);
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

          {/* Tab M — Debate */}
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
        </div>

        {/* Related Reading note */}
        <div className="rounded-2xl border border-border/50 bg-white/70 backdrop-blur-sm p-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Related Reading</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {/* Empty state placeholder card */}
            <div className="shrink-0 w-36 h-24 rounded-xl border border-dashed border-border bg-white/50 flex flex-col items-center justify-center gap-1.5">
              <BookOpen size={16} className="text-muted/40" />
              <p className="text-[10px] text-muted text-center px-2 leading-relaxed">Search a topic to see related articles</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
