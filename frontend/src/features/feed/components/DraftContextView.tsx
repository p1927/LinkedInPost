import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, X, CheckCircle2, Zap, Copy, Check } from 'lucide-react';
import type { Clip } from '../types';
import type { ClipClusterResult, CrossDomainInsight, OpinionLeaderInsight } from '../types';
import type { SheetRow } from '../../../services/sheets';
import type { BackendApi } from '@/services/backendApi';
import { topicEditorPathForRow } from '../../topic-navigation/utils/workspaceRoutes';

interface DraftContextViewProps {
  row: SheetRow;
  clips: Clip[];
  idToken: string;
  api: BackendApi;
  onBack: () => void;
  onUnassignClip: (clipId: string, postId: string) => void;
}

type ContextTab = 'q' | 'r';

function SkeletonCard() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-white/60 p-2 animate-pulse">
      <div className="h-8 w-8 shrink-0 rounded bg-violet-100" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-3/4 rounded bg-violet-100" />
        <div className="h-2 w-1/2 rounded bg-violet-50" />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-muted hover:text-primary transition-colors"
      title="Copy post angle"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

function getMiniDockScale(i: number, hoveredIndex: number | null): number {
  if (hoveredIndex === null) return 1;
  const dist = Math.abs(i - hoveredIndex);
  if (dist === 0) return 1.4;
  if (dist === 1) return 1.15;
  return 1;
}

export function DraftContextView({
  row,
  clips,
  idToken,
  api,
  onBack,
  onUnassignClip,
}: DraftContextViewProps) {
  const navigate = useNavigate();

  const AUTOSAVE_KEY = `feed_draft_${row.topicId ?? 'unknown'}`;
  const initialText = (() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) return saved;
    } catch { /* ignore */ }
    return row.selectedText || row.variant1 || row.variant2 || row.variant3 || row.variant4 || '';
  })();
  const [draftText, setDraftText] = useState(initialText);

  // Autosave draft text to localStorage with 800ms debounce
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(AUTOSAVE_KEY, draftText); } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(t);
  }, [draftText, AUTOSAVE_KEY]);

  const [miniDockHovered, setMiniDockHovered] = useState<number | null>(null);
  const [addedClipIds, setAddedClipIds] = useState<string[]>([]);
  const [activeContextTab, setActiveContextTab] = useState<ContextTab>('q');

  const [clustering, setClustering] = useState<ClipClusterResult | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterTrigger, setClusterTrigger] = useState(0);

  const [crossDomain, setCrossDomain] = useState<CrossDomainInsight[]>([]);
  const [crossDomainLoading, setCrossDomainLoading] = useState(false);
  const [crossDomainError, setCrossDomainError] = useState<string | null>(null);
  const [crossDomainTrigger, setCrossDomainTrigger] = useState(0);

  const [opinionLeaders, setOpinionLeaders] = useState<OpinionLeaderInsight[]>([]);
  const [opinionLeadersLoading, setOpinionLeadersLoading] = useState(false);
  const [opinionLeadersError, setOpinionLeadersError] = useState<string | null>(null);
  const [opinionLeadersTrigger, setOpinionLeadersTrigger] = useState(0);

  const assignedClips = clips.filter(c => c.assignedPostIds.includes(row.topicId ?? ''));

  const runClustering = useCallback(() => {
    if (assignedClips.length < 2) return;
    setClusterLoading(true);
    api.clusterDraftClips(idToken, {
      draftText,
      clips: assignedClips.map(c => ({
        title: c.articleTitle,
        snippet: c.passageText || c.articleTitle,
      })),
    })
      .then(setClustering)
      .catch(() => {})
      .finally(() => setClusterLoading(false));
  }, [assignedClips.length, row.topicId, draftText, idToken, api]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    runClustering();
  }, [clusterTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial auto-cluster when assigned clips first become available
  useEffect(() => {
    if (assignedClips.length >= 2) {
      setClusterTrigger(t => t + 1);
    }
  }, [assignedClips.length, row.topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-domain: fetch when tab Q becomes active, only once per topic
  useEffect(() => {
    if (activeContextTab !== 'q') return;
    if (crossDomain.length > 0 || crossDomainLoading) return;
    const topic = row.topic || '';
    if (!topic) return;
    let active = true;
    setCrossDomainLoading(true);
    setCrossDomainError(null);
    api.crossDomainInsight(idToken, { topic })
      .then(r => { if (active) setCrossDomain(r.insights); })
      .catch(() => { if (active) setCrossDomainError('Failed to load insights. Try again.'); })
      .finally(() => { if (active) setCrossDomainLoading(false); });
    return () => { active = false; };
  }, [activeContextTab, row.topic, idToken, api, crossDomainTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opinion leaders: fetch when tab R becomes active, only once per topic
  useEffect(() => {
    if (activeContextTab !== 'r') return;
    if (opinionLeaders.length > 0 || opinionLeadersLoading) return;
    const topic = row.topic || '';
    if (!topic) return;
    let active = true;
    setOpinionLeadersLoading(true);
    setOpinionLeadersError(null);
    api.opinionLeaderInsights(idToken, { topic })
      .then(r => { if (active) setOpinionLeaders(r.leaders); })
      .catch(() => { if (active) setOpinionLeadersError('Failed to load leaders. Try again.'); })
      .finally(() => { if (active) setOpinionLeadersLoading(false); });
    return () => { active = false; };
  }, [activeContextTab, row.topic, idToken, api, opinionLeadersTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const wordCount = draftText.trim() ? draftText.trim().split(/\s+/).length : 0;
  const charCount = draftText.length;

  function handleRemoveAddedClip(clipId: string) {
    setAddedClipIds(prev => prev.filter(id => id !== clipId));
  }

  function handleAddClipToEditor(clipId: string) {
    setAddedClipIds(prev => prev.includes(clipId) ? prev : [...prev, clipId]);
  }

  const addedClips = assignedClips.filter(c => addedClipIds.includes(c.id));

  // Derive clip at a given clustering index
  function clipAtIndex(index: number): Clip | undefined {
    return assignedClips[index];
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden gap-0">
      {/* LEFT: Draft Editor */}
      <div className="flex-1 flex flex-col min-h-0 border-r border-border/30 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/30 bg-white/80 backdrop-blur-sm px-6 py-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Feed
          </button>
          <span className="text-border/60">|</span>
          <h1 className="text-base font-semibold text-ink truncate flex-1">
            {row.topic || 'Untitled Draft'}
          </h1>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col p-8 gap-4">
          <textarea
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            placeholder="Start writing your post here, or drag clips from the right panel as context..."
            className="w-full flex-1 min-h-[320px] resize-none rounded-xl border border-border/40 bg-white/60 p-6 text-base text-ink leading-relaxed tracking-normal placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all font-[inherit]"
          />

          {/* Word / char count */}
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            <span>·</span>
            <span>{charCount} characters</span>
            {charCount > 3000 && (
              <span className="text-amber-500 font-medium">LinkedIn limit ~3000 chars</span>
            )}
          </div>

          {/* Context blocks — clips added to post */}
          {addedClips.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Context clips</p>
              {addedClips.map(clip => (
                <div
                  key={clip.id}
                  className="flex items-start gap-2 rounded-lg border border-blue-200/60 bg-blue-50/60 p-3"
                >
                  {clip.thumbnailUrl && (
                    <img
                      src={clip.thumbnailUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink line-clamp-1">{clip.articleTitle}</p>
                    {clip.passageText && (
                      <p className="text-xs text-muted line-clamp-2 mt-0.5">{clip.passageText}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddedClip(clip.id)}
                    className="shrink-0 text-muted hover:text-ink transition-colors"
                    title="Remove from context"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Generate Post CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(topicEditorPathForRow(row))}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary/90 transition-colors shadow-sm"
            >
              Generate Post in Editor
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Context Panel */}
      <div className="w-96 shrink-0 flex flex-col overflow-hidden bg-white/50 backdrop-blur-sm">
        {/* Panel header */}
        <div className="shrink-0 flex items-center justify-between border-b border-border/30 bg-white/80 backdrop-blur-sm px-4 py-3">
          <span className="text-sm font-semibold text-ink">Context Panel</span>
          {assignedClips.length >= 2 && (
            <button
              type="button"
              onClick={() => { setClustering(null); setClusterTrigger(t => t + 1); }}
              disabled={clusterLoading}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={12} className={clusterLoading ? 'animate-spin' : ''} />
              Re-cluster
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col p-4 gap-4 min-h-0">
          {/* Clip sections */}
          {clusterLoading && (
            <div className="space-y-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {!clusterLoading && clustering && assignedClips.length >= 2 && (
            <>
              {/* AI-clustered themes */}
              <div className="space-y-3">
                {clustering.themes.map((theme, ti) => (
                  <div key={ti}>
                    <p className="mb-1.5 text-xs font-semibold text-ink/70 uppercase tracking-wide">{theme.name}</p>
                    <div className="space-y-1.5">
                      {theme.indices.map(idx => {
                        const clip = clipAtIndex(idx);
                        if (!clip) return null;
                        return (
                          <div
                            key={clip.id}
                            className="flex items-start gap-2 rounded-lg border border-border/30 bg-white/70 p-2 group cursor-pointer hover:border-primary/40 transition-colors"
                            onClick={() => handleAddClipToEditor(clip.id)}
                            title="Click to add to editor context"
                          >
                            {clip.thumbnailUrl && (
                              <img
                                src={clip.thumbnailUrl}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded object-cover"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-ink line-clamp-2">{clip.articleTitle}</p>
                              {clip.passageText && (
                                <p className="text-xs text-muted line-clamp-1 mt-0.5">{clip.passageText}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onUnassignClip(clip.id, row.topicId ?? '');
                              }}
                              className="shrink-0 text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Unassign from draft"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Support / Challenge split */}
              {(clustering.support.length > 0 || clustering.challenge.length > 0) && (
                <div className="space-y-2">
                  {clustering.support.length > 0 && (
                    <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-700">Supports your point</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {clustering.support.map(idx => {
                          const clip = clipAtIndex(idx);
                          if (!clip) return null;
                          return (
                            <span
                              key={idx}
                              className="inline-block rounded-full bg-white/70 border border-emerald-200/60 px-2 py-0.5 text-xs text-emerald-800 max-w-[180px] truncate"
                              title={clip.articleTitle}
                            >
                              {clip.articleTitle}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {clustering.challenge.length > 0 && (
                    <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap size={13} className="text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700">Challenges your point</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {clustering.challenge.map(idx => {
                          const clip = clipAtIndex(idx);
                          if (!clip) return null;
                          return (
                            <span
                              key={idx}
                              className="inline-block rounded-full bg-white/70 border border-amber-200/60 px-2 py-0.5 text-xs text-amber-800 max-w-[180px] truncate"
                              title={clip.articleTitle}
                            >
                              {clip.articleTitle}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Flat list when no clustering or < 2 clips */}
          {!clusterLoading && !clustering && assignedClips.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Assigned Clips</p>
              {assignedClips.map(clip => (
                <div
                  key={clip.id}
                  className="flex items-start gap-2 rounded-lg border border-border/30 bg-white/70 p-2 group cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => handleAddClipToEditor(clip.id)}
                  title="Click to add to editor context"
                >
                  {clip.thumbnailUrl && (
                    <img
                      src={clip.thumbnailUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink line-clamp-2">{clip.articleTitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onUnassignClip(clip.id, row.topicId ?? '');
                    }}
                    className="shrink-0 text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Unassign from draft"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {assignedClips.length === 0 && !clusterLoading && (
            <p className="text-xs text-muted text-center py-6">
              No clips assigned to this draft yet. Assign clips from the ClipsDock below.
            </p>
          )}

          {/* Tabs Q / R */}
          <div className="mt-auto pt-4 border-t border-border/30">
            <div className="flex gap-1 mb-3">
              {(['q', 'r'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveContextTab(tab)}
                  className={[
                    'flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors',
                    activeContextTab === tab
                      ? 'bg-primary text-primary-fg shadow-sm'
                      : 'bg-white/60 text-muted hover:text-ink hover:bg-white/80',
                  ].join(' ')}
                >
                  {tab === 'q' ? 'Cross-domain' : 'Opinion Leaders'}
                </button>
              ))}
            </div>

            {activeContextTab === 'q' && (
              <div className="space-y-2">
                {crossDomainLoading && (
                  <div className="space-y-2">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                )}
                {crossDomainError && (
                  <div className="rounded-lg border border-red-200/60 bg-red-50/60 p-3 text-xs text-red-700 flex items-center justify-between gap-2">
                    <span>{crossDomainError}</span>
                    <button
                      type="button"
                      onClick={() => { setCrossDomain([]); setCrossDomainError(null); setCrossDomainTrigger(t => t + 1); }}
                      className="shrink-0 underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!crossDomainLoading && !crossDomainError && crossDomain.length > 0 && (
                  crossDomain.map((insight, i) => (
                    <div key={i} className="rounded-lg border border-border/30 bg-white/70 p-2.5 space-y-1.5">
                      <span className="inline-block rounded-full bg-violet-100 border border-violet-200/60 px-2 py-0.5 text-xs font-medium text-violet-800">
                        {insight.domain}
                      </span>
                      <p className="text-xs text-ink leading-relaxed">{insight.connection}</p>
                      <div className="flex items-start gap-1.5">
                        <p className="text-xs text-primary flex-1 italic leading-relaxed">{insight.postAngle}</p>
                        <CopyButton text={insight.postAngle} />
                      </div>
                    </div>
                  ))
                )}
                {!crossDomainLoading && !crossDomainError && crossDomain.length === 0 && (
                  <p className="text-xs text-muted text-center py-4">No cross-domain insights yet.</p>
                )}
              </div>
            )}

            {activeContextTab === 'r' && (
              <div className="space-y-2">
                {opinionLeadersLoading && (
                  <div className="space-y-2">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                )}
                {opinionLeadersError && (
                  <div className="rounded-lg border border-red-200/60 bg-red-50/60 p-3 text-xs text-red-700 flex items-center justify-between gap-2">
                    <span>{opinionLeadersError}</span>
                    <button
                      type="button"
                      onClick={() => { setOpinionLeaders([]); setOpinionLeadersError(null); setOpinionLeadersTrigger(t => t + 1); }}
                      className="shrink-0 underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!opinionLeadersLoading && !opinionLeadersError && opinionLeaders.length > 0 && (
                  opinionLeaders.map((leader, i) => (
                    <div key={i} className="rounded-lg border border-border/30 bg-white/70 p-2.5 space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-semibold text-ink">{leader.name}</span>
                        <span className="text-xs text-muted">· {leader.role}</span>
                      </div>
                      <p className="text-xs text-ink/80 leading-relaxed">{leader.perspective}</p>
                      <div className="flex items-start gap-1.5">
                        <p className="text-xs text-primary flex-1 italic leading-relaxed">{leader.postAngle}</p>
                        <CopyButton text={leader.postAngle} />
                      </div>
                    </div>
                  ))
                )}
                {!opinionLeadersLoading && !opinionLeadersError && opinionLeaders.length === 0 && (
                  <p className="text-xs text-muted text-center py-4">No opinion leader insights yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mini dock — pinned to bottom */}
        {assignedClips.length > 0 && (
          <div className="shrink-0 border-t border-border/30 bg-white/70 backdrop-blur-sm px-3 py-2">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">Assigned clips</p>
            <div className="flex items-end gap-1.5 overflow-x-auto pb-0.5">
              {assignedClips.map((clip, i) => (
                <div
                  key={clip.id}
                  className="relative shrink-0 cursor-pointer group/mini"
                  style={{
                    transform: `scale(${getMiniDockScale(i, miniDockHovered)})`,
                    transition: 'transform 200ms ease',
                    transformOrigin: 'bottom center',
                  }}
                  onMouseEnter={() => setMiniDockHovered(i)}
                  onMouseLeave={() => setMiniDockHovered(null)}
                  onClick={() => onUnassignClip(clip.id, row.topicId ?? '')}
                  title={`Click to unassign: ${clip.articleTitle}`}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/60 shadow-sm bg-gradient-to-br from-primary/10 to-primary/30">
                    {clip.thumbnailUrl ? (
                      <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-primary font-bold text-xs">
                          {clip.source[0]?.toUpperCase() ?? 'C'}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Tooltip above */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/mini:block z-50 w-32 rounded-lg bg-ink/90 text-white p-1.5 text-[10px] shadow-xl pointer-events-none text-center">
                    <p className="line-clamp-2 leading-tight">{clip.articleTitle}</p>
                    <p className="text-white/60 mt-0.5 text-[9px]">Click to unassign</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
