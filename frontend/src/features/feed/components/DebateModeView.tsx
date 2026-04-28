import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Scale, ExternalLink, Scissors, AlertTriangle, RefreshCw } from 'lucide-react';
import type { NewsArticle } from '../../trending/types';
import type { BackendApi } from '@/services/backendApi';
import type { DebateArticle } from '../types';

interface DebateModeViewProps {
  article: NewsArticle;
  idToken: string;
  api: BackendApi;
  onBack: () => void;
  onClip: (article: NewsArticle) => void;
  isClipped: boolean;
}

function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <div className={`h-3 rounded bg-amber-100 animate-pulse ${width}`} />;
}

export function DebateModeView({
  article,
  idToken,
  api,
  onBack,
  onClip,
  isClipped,
}: DebateModeViewProps) {
  const [debate, setDebate] = useState<DebateArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebate = useCallback(() => {
    setLoading(true);
    setError(null);
    setDebate(null);
    let active = true;
    api
      .findDebateArticle(idToken, {
        title: article.title,
        description: article.description ?? '',
      })
      .then(d => { if (active) setDebate(d); })
      .catch((e: unknown) => {
        if (active) setError((e instanceof Error ? e.message : null) || 'Could not find opposing article.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, idToken, article.title, article.description]);

  useEffect(() => {
    const cleanup = fetchDebate();
    return cleanup;
  }, [fetchDebate]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to Feed
        </button>
        <div className="flex items-center gap-1.5 ml-2">
          <Scale size={15} className="text-amber-500" />
          <span className="text-sm font-semibold text-ink">Debate Mode</span>
        </div>
        <span className="ml-auto text-xs text-muted italic">Two sides of the same topic</span>
      </div>

      {/* Split panels */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* LEFT: Original article */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-blue-200/60 bg-blue-50/30 backdrop-blur-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="rounded-full bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wide">
              Original
            </span>
            {article.source && (
              <span className="text-[11px] text-muted">{article.source}</span>
            )}
          </div>

          {article.imageUrl && (
            <div className="w-full overflow-hidden rounded-xl">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full max-h-36 object-cover"
              />
            </div>
          )}

          <h2 className="text-base font-bold text-ink leading-snug">{article.title}</h2>

          {article.description && (
            <p className="text-sm text-ink/80 leading-relaxed">{article.description}</p>
          )}

          <div className="flex items-center gap-2 pt-1 mt-auto">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Read Full <ExternalLink size={12} />
            </a>
            <button
              type="button"
              onClick={() => onClip(article)}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                isClipped
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted hover:border-primary/50 hover:text-primary',
              ].join(' ')}
            >
              <Scissors size={12} />
              {isClipped ? 'Clipped' : 'Clip'}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center justify-center gap-2 shrink-0">
          <div className="w-px flex-1 bg-amber-200/60" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 border border-amber-200">
            <Scale size={14} className="text-amber-600" aria-hidden="true" />
          </div>
          <div className="w-px flex-1 bg-amber-200/60" />
        </div>

        {/* RIGHT: Opposing article */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-amber-200/60 bg-amber-50/30 backdrop-blur-sm p-5 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
              Opposing View
            </span>
            {debate?.source && (
              <span className="text-[11px] text-muted">{debate.source}</span>
            )}
            <button
              type="button"
              onClick={fetchDebate}
              disabled={loading}
              className={[
                'ml-auto flex items-center gap-1 text-[11px] transition-colors cursor-pointer',
                loading ? 'text-muted opacity-50' : 'text-muted hover:text-ink',
              ].join(' ')}
              title="Regenerate opposing view"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading…' : 'Regenerate'}
            </button>
          </div>

          {loading && (
            <div className="space-y-2 flex-1">
              <SkeletonLine />
              <SkeletonLine width="w-5/6" />
              <SkeletonLine width="w-4/5" />
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2 space-y-1.5">
                <SkeletonLine width="w-1/3" />
                <SkeletonLine width="w-full" />
                <SkeletonLine width="w-4/5" />
              </div>
              <SkeletonLine width="w-3/4" />
              <SkeletonLine width="w-full" />
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertTriangle size={13} />
                {error}
              </div>
              <button
                type="button"
                onClick={fetchDebate}
                className="text-xs font-semibold text-primary hover:underline w-fit cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {debate && !loading && (
            <>
              <h2 className="text-base font-bold text-ink leading-snug">{debate.title}</h2>

              <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 px-3 py-2">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Core argument</p>
                <p className="text-xs text-ink/80 italic leading-relaxed">{debate.opposingAngle}</p>
              </div>

              <p className="text-sm text-ink/80 leading-relaxed">{debate.summary}</p>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide">Key arguments</p>
                {debate.keyArguments.map((arg, i) => (
                  <div key={`${i}-${arg.slice(0, 20)}`} className="flex items-start gap-2 text-xs text-ink/80">
                    <span className="shrink-0 font-bold text-amber-600">{i + 1}.</span>
                    {arg}
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted italic mt-auto pt-2 border-t border-amber-200/40">
                AI-generated opposing perspective. Use as a thinking tool, not a factual source.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
