import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentReviewReport } from './types';

interface ContentReviewReportProps {
  report: ContentReviewReport;
  onClose: () => void;
}

function VerdictBadge({ verdict }: { verdict: ContentReviewReport['overallVerdict'] }) {
  if (verdict === 'pass') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        ✓ Pass
      </span>
    );
  }
  if (verdict === 'flag') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        ⚠ Flag
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      ✕ Block
    </span>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  none: 'text-emerald-700',
  low: 'text-amber-600',
  medium: 'text-orange-600',
  high: 'text-red-600',
};

export function ContentReviewReport({ report, onClose }: ContentReviewReportProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { textResult, imageResults, newsModeUsed, newsSnippet, reviewedAt, overallVerdict } = report;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-900/25 px-4 py-6 backdrop-blur-xl">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-review-report-title"
        className="my-auto flex w-full max-h-[min(92dvh,calc(100dvh-3rem))] max-w-2xl flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-white/95 to-indigo-50/80 shadow-2xl ring-1 ring-white/30 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-indigo-200/30 bg-gradient-to-r from-indigo-50/50 to-white/50 px-6 py-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600/80">Content Review</p>
              <h3 id="content-review-report-title" className="mt-1 text-lg font-bold text-slate-800">Review Report</h3>
            </div>
            <VerdictBadge verdict={overallVerdict} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={onClose}
            className="size-9 shrink-0 rounded-full text-muted hover:bg-violet-100/70 hover:text-ink"
            aria-label="Close review report"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Text review */}
          <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white/70 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-700/90 mb-3">Text Review</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink/70 w-24 shrink-0">Guardrails</span>
                <span className={`text-xs font-semibold ${textResult.guardrailsOk ? 'text-emerald-700' : 'text-red-600'}`}>
                  {textResult.guardrailsOk ? 'OK' : 'Failed'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink/70 w-24 shrink-0">Severity</span>
                <span className={`text-xs font-semibold capitalize ${SEVERITY_COLORS[textResult.severityTier] ?? 'text-slate-600'}`}>
                  {textResult.severityTier}
                </span>
              </div>
              {textResult.doubleMeanings.length > 0 ? (
                <div>
                  <span className="text-xs font-semibold text-ink/70">Double meanings</span>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">
                    {textResult.doubleMeanings.map((m) => (
                      <li key={m} className="text-xs text-slate-600">{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {textResult.summary ? (
                <div>
                  <span className="text-xs font-semibold text-ink/70">Summary</span>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{textResult.summary}</p>
                </div>
              ) : null}
            </div>
          </section>

          {/* Image results */}
          {imageResults.length > 0 ? (
            <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white/70 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-700/90 mb-3">
                Image Review ({imageResults.length})
              </p>
              <div className="space-y-3">
                {imageResults.map((img, i) => (
                  <div key={img.imageUrl || i} className="rounded-xl border border-violet-100/80 bg-violet-50/40 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <a
                        href={img.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate text-[0.65rem] text-primary underline-offset-2 hover:underline"
                      >
                        {img.imageUrl}
                      </a>
                      <VerdictBadge verdict={img.verdict} />
                    </div>
                    <div className="space-y-1 text-xs">
                      {img.meaning ? (
                        <p className="text-slate-600 leading-snug"><span className="font-semibold text-ink/70">Meaning: </span>{img.meaning}</p>
                      ) : null}
                      <p className="text-slate-600">
                        <span className="font-semibold text-ink/70">Relevant: </span>
                        <span className={img.relevant ? 'text-emerald-700' : 'text-slate-500'}>{img.relevant ? 'Yes' : 'No'}</span>
                      </p>
                      {img.visibleText ? (
                        <p className="text-slate-600 leading-snug"><span className="font-semibold text-ink/70">Visible text: </span>{img.visibleText}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* News context */}
          {newsModeUsed ? (
            <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white/70 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-700/90 mb-3">News Context</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink/70 w-16 shrink-0">Mode</span>
                  <span className="capitalize text-slate-600">{newsModeUsed}</span>
                </div>
                {newsSnippet ? (
                  <div>
                    <span className="font-semibold text-ink/70">Snippet</span>
                    <p className="mt-0.5 leading-relaxed text-slate-600 line-clamp-4">{newsSnippet}</p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-indigo-200/30 bg-gradient-to-r from-indigo-50/30 to-white/30 px-6 py-4 backdrop-blur-sm">
          <p className="text-[0.65rem] text-muted">
            Reviewed {new Date(reviewedAt).toLocaleString()}
          </p>
          <Button type="button" variant="secondary" size="md" onClick={onClose} className="rounded-xl">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
