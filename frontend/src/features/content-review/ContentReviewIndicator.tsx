import { useState } from 'react';
import type { ContentReviewReport } from './types';

interface ContentReviewIndicatorProps {
  reviewJson?: string;
  onClick?: () => void;
}

export function ContentReviewIndicator({ reviewJson, onClick }: ContentReviewIndicatorProps) {
  const [hovered, setHovered] = useState(false);

  if (!reviewJson) return null;

  let report: ContentReviewReport;
  try {
    report = JSON.parse(reviewJson) as ContentReviewReport;
  } catch {
    return null;
  }

  const { overallVerdict } = report;
  const summary = report.textResult?.summary ?? '';

  let icon: string;
  let colorClass: string;
  let ariaLabel: string;

  if (overallVerdict === 'pass') {
    icon = '✓';
    colorClass = 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
    ariaLabel = 'Content review: pass';
  } else if (overallVerdict === 'flag') {
    icon = '⚠';
    colorClass = 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100';
    ariaLabel = 'Content review: flag';
  } else {
    icon = '✕';
    colorClass = 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100';
    ariaLabel = 'Content review: block';
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[0.6rem] font-bold leading-none transition-colors ${colorClass}`}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {icon}
      </button>
      {hovered && summary ? (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[0.65rem] leading-snug text-slate-700 shadow-md">
          {summary}
        </span>
      ) : null}
    </span>
  );
}
