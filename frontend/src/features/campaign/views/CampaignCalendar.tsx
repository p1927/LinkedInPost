import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { CampaignPostV1 } from '../schema/types';

function previewBody(p: CampaignPostV1): string {
  const v = p.variants?.find((s) => s?.trim())?.trim();
  if (v) return v;
  return (
    p.variant1?.trim() ||
    p.variant2?.trim() ||
    p.variant3?.trim() ||
    p.variant4?.trim() ||
    p.body?.trim() ||
    ''
  );
}

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function useMonthGrid(anchor: Date) {
  return useMemo(() => {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { date: Date | null; inMonth: boolean }[] = [];
    for (let i = 0; i < startPad; i++) {
      cells.push({ date: null, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(y, m, d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, inMonth: false });
    }
    return { cells, label: first.toLocaleString(undefined, { month: 'long', year: 'numeric' }) };
  }, [anchor]);
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function CampaignCalendar({ posts }: { posts: CampaignPostV1[] }) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const { cells, label } = useMonthGrid(anchor);

  const byDate = useMemo(() => {
    const m = new Map<string, CampaignPostV1[]>();
    for (const p of posts) {
      const k = p.date.trim();
      if (!k) continue;
      const list = m.get(k) ?? [];
      list.push(p);
      m.set(k, list);
    }
    return m;
  }, [posts]);

  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const hoverPosts = hoverIso ? (byDate.get(hoverIso) ?? []) : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg border border-white/50 bg-white/50 px-2 py-1 text-xs font-semibold text-ink shadow-sm hover:bg-white/80"
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
        >
          Prev
        </button>
        <span className="text-sm font-semibold text-ink">{label}</span>
        <button
          type="button"
          className="rounded-lg border border-white/50 bg-white/50 px-2 py-1 text-xs font-semibold text-ink shadow-sm hover:bg-white/80"
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
        {WEEK_LABELS.map((w) => (
          <div key={w} className="px-0.5 py-1 text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-7 gap-0.5">
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return <div key={`empty-${idx}`} className="min-h-[3.25rem] rounded-lg bg-white/10" />;
          }
          const iso = isoDate(cell.date);
          const dayPosts = byDate.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={clsx(
                'group relative min-h-[3.25rem] rounded-lg border p-1 text-left transition-colors',
                dayPosts.length
                  ? 'border-primary/30 bg-primary/10 hover:bg-primary/15'
                  : 'border-white/40 bg-white/25 hover:bg-white/40',
              )}
              onMouseEnter={() => setHoverIso(iso)}
              onMouseLeave={() => setHoverIso(null)}
            >
              <span className="text-[11px] font-bold text-ink">{cell.date.getDate()}</span>
              {dayPosts.length ? (
                <ul className="mt-0.5 list-none space-y-0.5 p-0">
                  {dayPosts.slice(0, 2).map((p, i) => (
                    <li key={`${p.topic}-${i}`} className="truncate text-[10px] leading-tight text-muted">
                      {p.topic}
                    </li>
                  ))}
                  {dayPosts.length > 2 ? (
                    <li className="text-[10px] font-medium text-primary">+{dayPosts.length - 2} more</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          );
        })}

        {hoverIso && hoverPosts.length > 0 ? (
          <div
            className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-[min(100%,18rem)] -translate-x-1/2 rounded-xl border border-white/60 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-md"
            role="tooltip"
          >
            <p className="mb-2 font-semibold text-ink">{hoverIso}</p>
            <ul className="max-h-48 list-none space-y-2 overflow-y-auto p-0">
              {hoverPosts.map((p, i) => (
                <li key={`${p.topic}-${i}`} className="border-b border-ink/10 pb-2 last:border-0 last:pb-0">
                  <p className="font-medium text-ink">{p.topic}</p>
                  {p.channels?.length ? (
                    <p className="text-[10px] text-muted">{p.channels.join(', ')}</p>
                  ) : null}
                  <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-muted">{previewBody(p) || '—'}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
