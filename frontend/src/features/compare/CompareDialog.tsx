import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { GenerationScope } from '../../services/backendApi';

interface CompareDialogProps {
  open: boolean;
  scope: GenerationScope;
  title: string;
  currentText: string;
  proposedText: string;
  resultingText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface DiffSegment {
  value: string;
  status: 'same' | 'added' | 'removed';
}

function tokenize(value: string): string[] {
  return value.match(/\S+\s*|\n/g) || [];
}

function buildDiff(before: string, after: string): { beforeSegments: DiffSegment[]; afterSegments: DiffSegment[] } {
  const beforeTokens = tokenize(before);
  const afterTokens = tokenize(after);
  const matrix = Array.from({ length: beforeTokens.length + 1 }, () => Array(afterTokens.length + 1).fill(0));

  for (let i = beforeTokens.length - 1; i >= 0; i -= 1) {
    for (let j = afterTokens.length - 1; j >= 0; j -= 1) {
      if (beforeTokens[i] === afterTokens[j]) {
        matrix[i][j] = matrix[i + 1][j + 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  const beforeSegments: DiffSegment[] = [];
  const afterSegments: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  while (i < beforeTokens.length && j < afterTokens.length) {
    if (beforeTokens[i] === afterTokens[j]) {
      beforeSegments.push({ value: beforeTokens[i], status: 'same' });
      afterSegments.push({ value: afterTokens[j], status: 'same' });
      i += 1;
      j += 1;
      continue;
    }

    if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      beforeSegments.push({ value: beforeTokens[i], status: 'removed' });
      i += 1;
      continue;
    }

    afterSegments.push({ value: afterTokens[j], status: 'added' });
    j += 1;
  }

  while (i < beforeTokens.length) {
    beforeSegments.push({ value: beforeTokens[i], status: 'removed' });
    i += 1;
  }

  while (j < afterTokens.length) {
    afterSegments.push({ value: afterTokens[j], status: 'added' });
    j += 1;
  }

  return { beforeSegments, afterSegments };
}

function renderSegments(segments: DiffSegment[]) {
  return segments.map((segment, index) => {
    const className = segment.status === 'added'
      ? 'bg-emerald-100 text-emerald-900'
      : segment.status === 'removed'
        ? 'bg-rose-100 text-rose-900 line-through'
        : '';

    return (
      <span key={`${segment.status}-${index}`} className={className}>
        {segment.value}
      </span>
    );
  });
}

export function CompareDialog({
  open,
  scope,
  title,
  currentText,
  proposedText,
  resultingText,
  onConfirm,
  onCancel,
}: CompareDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  const { beforeSegments, afterSegments } = buildDiff(currentText, proposedText);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-dialog-title"
        className="w-full max-w-6xl rounded-[30px] border border-white/40 bg-white/95 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Compare before apply</p>
            <h3 id="compare-dialog-title" className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {scope === 'selection'
                ? 'Only the selected passage will change if you apply this preview.'
                : 'Applying this preview will replace the full editor draft.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
            aria-label="Close compare dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-6 lg:grid-cols-2">
          <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Current target</p>
            <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
              {renderSegments(beforeSegments)}
            </div>
          </section>

          <section className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Proposed target</p>
            <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
              {renderSegments(afterSegments)}
            </div>
          </section>
        </div>

        <div className="px-6 pb-2">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resulting editor draft</p>
            <div className="mt-3 max-h-[220px] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700">
              {resultingText}
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Apply to editor
          </button>
        </div>
      </div>
    </div>
  );
}