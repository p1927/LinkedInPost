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
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
        >
          Prev
        </button>
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <button
          type="button"
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-400 cursor-pointer"
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
        >
          Next
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
        {WEEK_LABELS.map((w) => (
          <div key={w} className="px-1 py-2 text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-7 gap-0.5">
        {cells.map((cell, idx) => {
          if (!cell.date) {
            return <div key={`empty-${idx}`} className="min-h-[3.25rem] rounded-lg bg-gray-100" />;
          }
          const iso = isoDate(cell.date);
          const dayPosts = byDate.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={clsx(
                'group relative min-h-[3.25rem] rounded-lg border p-1.5 text-left transition-colors cursor-pointer',
                dayPosts.length
                  ? 'border-indigo-400 bg-indigo-50 hover:bg-indigo-100'
                  : 'border-gray-200 bg-white hover:bg-gray-50',
              )}
              onMouseEnter={() => setHoverIso(iso)}
              onMouseLeave={() => setHoverIso(null)}
            >
              <span className="text-[12px] font-bold text-gray-900 block">{cell.date.getDate()}</span>
              {dayPosts.length ? (
                <ul className="mt-1 list-none space-y-0.5 p-0">
                  {dayPosts.slice(0, 2).map((p, i) => (
                    <li key={`${p.topic}-${i}`} className="truncate text-[10px] leading-snug text-gray-700 font-medium">
                      {p.topic}
                    </li>
                  ))}
                  {dayPosts.length > 2 ? (
                    <li className="text-[10px] font-semibold text-indigo-600">+{dayPosts.length - 2} more</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          );
        })}

        {hoverIso && hoverPosts.length > 0 ? (
          <div
            className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-[min(100%,20rem)] -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-xl"
            role="tooltip"
          >
            <p className="mb-2 font-semibold text-gray-900">{hoverIso}</p>
            <ul className="max-h-48 list-none space-y-2 overflow-y-auto p-0">
              {hoverPosts.map((p, i) => (
                <li key={`${p.topic}-${i}`} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <p className="font-semibold text-gray-900">{p.topic}</p>
                  {p.channels?.length ? (
                    <p className="text-[10px] text-gray-600">{p.channels.join(', ')}</p>
                  ) : null}
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-gray-700 text-[10px]">{previewBody(p) || '—'}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
