import { useNavigate } from 'react-router-dom';
import { Edit2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SheetRow } from '@/services/sheets';
import { CSC_TOKENS as T } from '@/features/content-schedule-calendar/tokens';

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
    const hasAnyMeta = meta && (
      meta.about || meta.meaning || meta.audience || meta.style || meta.notes ||
      (meta.pros && meta.pros.length > 0) || (meta.cons && meta.cons.length > 0)
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Topic title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.5, margin: 0 }}>
            {row.topic}
          </p>
          <button
            type="button"
            onClick={handleEdit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              color: T.accent, background: T.accentSoft, border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              fontFamily: 'inherit',
            }}
          >
            <Edit2 style={{ width: 11, height: 11 }} />
            Edit
          </button>
        </div>

        {hasAnyMeta ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {meta!.about && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mutedSoft, marginBottom: 3 }}>
                  About this post
                </p>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: T.ink, margin: 0 }}>{meta!.about}</p>
              </div>
            )}
            {meta!.meaning && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mutedSoft, marginBottom: 3 }}>
                  Message to convey
                </p>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: T.ink, margin: 0 }}>{meta!.meaning}</p>
              </div>
            )}
            {meta!.audience && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mutedSoft, marginBottom: 4 }}>
                  Target audience
                </p>
                <span style={{
                  display: 'inline-block', borderRadius: 20, padding: '2px 10px',
                  fontSize: 11, fontWeight: 500,
                  background: T.tint, color: T.accent,
                  border: `1px solid ${T.line}`,
                }}>
                  {formatAudienceLabel(meta!.audience)}
                </span>
              </div>
            )}
            {meta!.style && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mutedSoft, marginBottom: 4 }}>
                  Content style
                </p>
                <span style={{
                  display: 'inline-block', borderRadius: 20, padding: '2px 10px',
                  fontSize: 11, fontWeight: 500,
                  background: T.accentSoft, color: T.accent,
                  border: `1px solid ${T.lineStrong}`,
                }}>
                  {meta!.style}
                </span>
              </div>
            )}
            {((meta!.pros && meta!.pros.length > 0) || (meta!.cons && meta!.cons.length > 0)) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {meta!.pros && meta!.pros.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#16a34a', marginBottom: 5 }}>
                      <ThumbsUp style={{ width: 10, height: 10 }} />
                      For
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {meta!.pros.map((p, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 11, color: T.ink, lineHeight: 1.5 }}>
                          <span style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }}>✓</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {meta!.cons && meta!.cons.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#d97706', marginBottom: 5 }}>
                      <ThumbsDown style={{ width: 10, height: 10 }} />
                      Watch out
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {meta!.cons.map((c, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 11, color: T.ink, lineHeight: 1.5 }}>
                          <span style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }}>!</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {meta!.notes && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.mutedSoft, marginBottom: 3 }}>
                  Research notes
                </p>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: T.ink, whiteSpace: 'pre-wrap', margin: 0 }}>{meta!.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '12px 14px', background: T.tint, borderRadius: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: T.muted, margin: '0 0 8px' }}>
              No details added yet.
            </p>
            <button
              type="button"
              onClick={handleEdit}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                color: T.accent, background: T.accentSoft, border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Edit2 style={{ width: 11, height: 11 }} />
              Add topic details
            </button>
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
