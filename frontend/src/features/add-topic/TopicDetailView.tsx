import { useNavigate } from 'react-router-dom';
import { Edit2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SheetRow } from '@/services/sheets';

interface TopicMeta {
  about?: string;
  meaning?: string;
  style?: string;
  pros?: string[];
  cons?: string[];
  notes?: string;
  audience?: string;
}

function parseTopicMeta(raw: string | undefined): TopicMeta | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as TopicMeta;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

function formatAudienceLabel(id: string): string {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function TopicDetailView({
  row,
  editPath,
  compact = false,
}: {
  row: SheetRow;
  editPath: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();

  const meta = parseTopicMeta(row.topicGenerationRules);

  const handleEdit = () => {
    navigate(`${editPath}?edit=${encodeURIComponent(row.topicId)}`);
  };

  if (compact) {
    return (
      <div className="rounded-xl border border-white/40 bg-white/30 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
            Topic details
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            className="h-6 gap-1 px-2 text-xs"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </Button>
        </div>

        {meta ? (
          <div className="flex flex-col gap-3">
            {meta.about && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  About this post
                </p>
                <p className="text-xs leading-relaxed text-ink/80">{meta.about}</p>
              </div>
            )}
            {meta.meaning && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  Message to convey
                </p>
                <p className="text-xs leading-relaxed text-ink/80">{meta.meaning}</p>
              </div>
            )}
            {meta.audience && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  Target audience
                </p>
                <span className="inline-block rounded-full border border-violet-300/50 bg-violet-100/40 px-2 py-0.5 text-xs font-medium text-violet-700">
                  {formatAudienceLabel(meta.audience)}
                </span>
              </div>
            )}
            {meta.style && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  Content style
                </p>
                <span className="inline-block rounded-full border border-primary/50 bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  {meta.style}
                </span>
              </div>
            )}
            {((meta.pros && meta.pros.length > 0) || (meta.cons && meta.cons.length > 0)) && (
              <div className="grid grid-cols-2 gap-3">
                {meta.pros && meta.pros.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600/70">
                      <ThumbsUp className="h-2.5 w-2.5" />
                      For
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {meta.pros.map((p, i) => (
                        <li key={i} className="flex items-start gap-1 text-xs text-ink/80">
                          <span className="mt-0.5 shrink-0 text-emerald-500">&#x2713;</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {meta.cons && meta.cons.length > 0 && (
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600/70">
                      <ThumbsDown className="h-2.5 w-2.5" />
                      Watch out
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {meta.cons.map((c, i) => (
                        <li key={i} className="flex items-start gap-1 text-xs text-ink/80">
                          <span className="mt-0.5 shrink-0 text-amber-500">!</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {meta.notes && (
              <div>
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  Research notes
                </p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink/80">{meta.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-xs text-muted">No details saved for this topic yet.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              className="mt-2 gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Add details
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="custom-scrollbar flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-8 py-10">
        <div className="mb-8 flex items-start gap-3">
          <h1 className="flex-1 font-heading text-3xl font-bold text-ink">{row.topic}</h1>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleEdit}
            className="mt-1 shrink-0 gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {meta ? (
          <div className="flex flex-col gap-6">
            {meta.about && (
              <section>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  About this post
                </p>
                <p className="text-sm leading-relaxed text-ink/80">{meta.about}</p>
              </section>
            )}
            {meta.meaning && (
              <section>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  Message to convey
                </p>
                <p className="text-sm leading-relaxed text-ink/80">{meta.meaning}</p>
              </section>
            )}
            {meta.audience && (
              <section>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  Target audience
                </p>
                <span className="inline-block rounded-full border border-violet-300/50 bg-violet-100/40 px-3 py-1 text-xs font-medium text-violet-700">
                  {formatAudienceLabel(meta.audience)}
                </span>
              </section>
            )}
            {meta.style && (
              <section>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  Content style
                </p>
                <span className="inline-block rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                  {meta.style}
                </span>
              </section>
            )}
            {((meta.pros && meta.pros.length > 0) || (meta.cons && meta.cons.length > 0)) && (
              <section className="grid grid-cols-2 gap-4">
                {meta.pros && meta.pros.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600/70">
                      <ThumbsUp className="h-3 w-3" />
                      For
                    </div>
                    <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                      {meta.pros.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-ink/80">
                          <span className="mt-0.5 shrink-0 text-emerald-500">&#x2713;</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {meta.cons && meta.cons.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600/70">
                      <ThumbsDown className="h-3 w-3" />
                      Watch out
                    </div>
                    <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
                      {meta.cons.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-ink/80">
                          <span className="mt-0.5 shrink-0 text-amber-500">!</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
            {meta.notes && (
              <section>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/50">
                  Research notes
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{meta.notes}</p>
              </section>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/40 bg-white/30 p-6 text-center backdrop-blur-sm">
            <p className="text-sm text-muted">No additional details saved for this topic.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              className="mt-3 gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit topic
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
