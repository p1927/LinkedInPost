import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { GenerationScope } from '../../services/backendApi';
import { Button } from '@/components/ui/button';

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
      ? 'border border-success-border bg-success-surface text-success-ink'
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/25 px-4 py-6 backdrop-blur-xl">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-dialog-title"
        className="glass-panel-strong w-full max-w-6xl rounded-3xl shadow-2xl ring-1 ring-white/30 overflow-hidden bg-gradient-to-br from-white/95 to-indigo-50/80 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-indigo-200/30 px-8 py-6 bg-gradient-to-r from-indigo-50/50 to-white/50 backdrop-blur-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600/80">Compare before apply</p>
            <h3 id="compare-dialog-title" className="mt-3 font-heading text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-700">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {scope === 'selection'
                ? 'Only the selected passage will change if you apply this preview.'
                : 'Applying this preview will replace the full editor draft.'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            onClick={onCancel}
            className="size-10 shrink-0 rounded-full text-muted hover:bg-violet-100/70 hover:text-ink"
            aria-label="Close compare dialog"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-6 px-8 py-6 lg:grid-cols-2">
          <section className="rounded-2xl p-6 border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white/60 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-700/80">Current target</p>
            <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-900 max-h-[300px] overflow-y-auto">
              {renderSegments(beforeSegments)}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-white/60 p-6 backdrop-blur-sm shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700/80">Proposed target</p>
            <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-900 max-h-[300px] overflow-y-auto">
              {renderSegments(afterSegments)}
            </div>
          </section>
        </div>

        <div className="px-8 pb-4">
          <section className="glass-panel rounded-2xl p-6 border border-indigo-200/40 bg-gradient-to-br from-indigo-50/50 to-white/50 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-700/80">Resulting editor draft</p>
            <div className="mt-4 max-h-[240px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl px-5 py-4 text-sm leading-7 text-slate-900 border border-indigo-200/30 bg-white/60 backdrop-blur-sm">
              {resultingText}
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 px-8 py-6 sm:flex-row sm:justify-end border-t border-indigo-200/30 bg-gradient-to-r from-indigo-50/30 to-white/30 backdrop-blur-sm">
          <Button type="button" variant="secondary" size="md" onClick={onCancel} className="rounded-xl">
            Cancel
          </Button>
          <Button type="button" variant="primary" size="md" onClick={onConfirm} className="rounded-xl">
            Apply to editor
          </Button>
        </div>
      </div>
    </div>
  );
}