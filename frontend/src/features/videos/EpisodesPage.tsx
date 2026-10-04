import { useState, useEffect, useMemo } from 'react';
import { ExternalLink, Film, Search, Video, X } from 'lucide-react';
import type { BackendApi } from '../../services/backendApi';
import type { Episode, EpisodeStatus } from './types';
import { EPISODE_STATUSES } from './types';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

interface EpisodeStatusStyle {
  label: string;
  dot: string;
  container: string;
  onContainer: string;
}

const EPISODE_STATUS_STYLES: Record<string, EpisodeStatusStyle> = {
  idea:      { label: 'Idea',      dot: '#94A3B8', container: '#F8FAFC', onContainer: '#334155' },
  scripted:  { label: 'Scripted',  dot: '#6366F1', container: '#EEF2FF', onContainer: '#3730A3' },
  approved:  { label: 'Approved',  dot: '#F97316', container: '#FFF7ED', onContainer: '#9A3412' },
  rendered:  { label: 'Rendered',  dot: '#A855F7', container: '#FAF5FF', onContainer: '#581C87' },
  reviewed:  { label: 'Reviewed',  dot: '#0EA5E9', container: '#F0F9FF', onContainer: '#0C4A6E' },
  scheduled: { label: 'Scheduled', dot: '#EAB308', container: '#FEFCE8', onContainer: '#713F12' },
  posted:    { label: 'Posted',    dot: '#22C55E', container: '#F0FDF4', onContainer: '#14532D' },
};

function episodeStatusStyle(status: string): EpisodeStatusStyle {
  return EPISODE_STATUS_STYLES[status.toLowerCase()] ?? {
    label: status || 'Unknown',
    dot: '#94A3B8',
    container: '#F8FAFC',
    onContainer: '#334155',
  };
}

function StatusBadge({ status }: { status: string }) {
  const s = episodeStatusStyle(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.container, color: s.onContainer }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: s.dot }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// URL link helper
// ---------------------------------------------------------------------------

function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-primary/80 hover:text-primary hover:underline"
      title={label}
    >
      <ExternalLink className="h-3 w-3" aria-hidden />
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  topicAreaFilter: string;
  onTopicAreaChange: (v: string) => void;
  seriesFilter: string;
  onSeriesChange: (v: string) => void;
  topicAreas: string[];
  seriesList: string[];
}

function FilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  topicAreaFilter,
  onTopicAreaChange,
  seriesFilter,
  onSeriesChange,
  topicAreas,
  seriesList,
}: FilterBarProps) {
  const hasFilters = search || statusFilter || topicAreaFilter || seriesFilter;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Text search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted pointer-events-none" aria-hidden />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search episodes…"
          className="h-8 w-full rounded-lg border border-white/50 bg-white/60 pl-8 pr-3 text-xs text-ink shadow-sm backdrop-blur-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200"
        />
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="h-8 rounded-lg border border-white/50 bg-white/60 px-2 text-xs text-ink shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-200"
      >
        <option value="">All statuses</option>
        {EPISODE_STATUSES.map((s) => (
          <option key={s} value={s}>{episodeStatusStyle(s).label}</option>
        ))}
      </select>

      {/* Topic area filter */}
      {topicAreas.length > 0 && (
        <select
          value={topicAreaFilter}
          onChange={(e) => onTopicAreaChange(e.target.value)}
          className="h-8 rounded-lg border border-white/50 bg-white/60 px-2 text-xs text-ink shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All topics</option>
          {topicAreas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}

      {/* Series filter */}
      {seriesList.length > 0 && (
        <select
          value={seriesFilter}
          onChange={(e) => onSeriesChange(e.target.value)}
          className="h-8 rounded-lg border border-white/50 bg-white/60 px-2 text-xs text-ink shadow-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="">All series</option>
          {seriesList.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchChange('');
            onStatusChange('');
            onTopicAreaChange('');
            onSeriesChange('');
          }}
          className="h-8 gap-1 px-2 text-xs text-muted"
        >
          <X className="h-3 w-3" aria-hidden />
          Clear
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function EpisodesPage({
  idToken,
  api,
}: {
  idToken: string;
  api: BackendApi;
}) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [hint, setHint] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [topicAreaFilter, setTopicAreaFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listEpisodes(idToken)
      .then((result) => {
        if (cancelled) return;
        setEpisodes(result.episodes);
        setHint(result.hint);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load episodes.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [idToken, api]);

  const topicAreas = useMemo(() => uniqueSorted(episodes.map((e) => e.topicArea)), [episodes]);
  const seriesList = useMemo(() => uniqueSorted(episodes.map((e) => e.series)), [episodes]);

  const filtered = useMemo(() => {
    let list = episodes;
    if (statusFilter) list = list.filter((e) => e.status.toLowerCase() === statusFilter);
    if (topicAreaFilter) list = list.filter((e) => e.topicArea === topicAreaFilter);
    if (seriesFilter) list = list.filter((e) => e.series === seriesFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.series.toLowerCase().includes(q) ||
          e.topicArea.toLowerCase().includes(q) ||
          e.format.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q),
      );
    }
    return list;
  }, [episodes, statusFilter, topicAreaFilter, seriesFilter, search]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-12 pt-4 md:px-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15">
          <Video className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold text-ink dark:text-slate-100">Videos</h1>
          <p className="text-sm text-muted">Episodes from the video pipeline</p>
        </div>
      </div>

      {/* Filters */}
      {!loading && !error && episodes.length > 0 && (
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          topicAreaFilter={topicAreaFilter}
          onTopicAreaChange={setTopicAreaFilter}
          seriesFilter={seriesFilter}
          onSeriesChange={setSeriesFilter}
          topicAreas={topicAreas}
          seriesList={seriesList}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted text-sm">
          Loading episodes…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Empty / hint state */}
      {!loading && !error && episodes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/50 bg-white/40 px-6 py-12 text-center shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
          <Film className="h-10 w-10 text-muted/60" aria-hidden />
          <p className="text-sm font-semibold text-ink dark:text-slate-200">No episodes yet</p>
          {hint ? (
            <p className="max-w-md text-xs text-muted">{hint}</p>
          ) : (
            <p className="max-w-md text-xs text-muted">
              Add an Episodes tab to your Google Sheet, or run{' '}
              <code className="rounded bg-black/5 px-1 font-mono text-[11px] dark:bg-white/10">python run.py sync</code>{' '}
              in the video-pipeline directory.
            </p>
          )}
        </div>
      )}

      {/* No results after filter */}
      {!loading && !error && episodes.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-white/50 bg-white/40 px-6 py-10 text-center text-sm text-muted shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
          No episodes match the current filters.
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/50 bg-white/40 shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.03]">
          <table className="min-w-full divide-y divide-black/5 text-sm dark:divide-white/[0.06]">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Series</th>
                <th className="px-4 py-3">Topic Area</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Links</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {filtered.map((ep) => (
                <tr
                  key={ep.id}
                  className="group transition-colors hover:bg-primary/[0.03] dark:hover:bg-white/[0.03]"
                >
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="font-medium text-ink dark:text-slate-200 truncate" title={ep.title}>
                      {ep.title || <span className="text-muted italic">Untitled</span>}
                    </div>
                    {ep.notes && (
                      <div className="mt-0.5 truncate text-xs text-muted" title={ep.notes}>
                        {ep.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {ep.series || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {ep.topicArea || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {ep.format || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ep.status ? <StatusBadge status={ep.status} /> : <span className="text-xs text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {ep.videoUrl && (
                        <ExternalLinkButton href={ep.videoUrl} label="Video" />
                      )}
                      {ep.youtubeUrl && (
                        <ExternalLinkButton href={ep.youtubeUrl} label="YouTube" />
                      )}
                      {ep.instagramUrl && (
                        <ExternalLinkButton href={ep.instagramUrl} label="Instagram" />
                      )}
                      {ep.coverUrl && (
                        <ExternalLinkButton href={ep.coverUrl} label="Cover" />
                      )}
                      {ep.carouselUrlsJson && ep.carouselUrlsJson !== '[]' && ep.carouselUrlsJson !== '' && (
                        <span className="inline-flex items-center rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted dark:bg-white/[0.06]">
                          Carousel
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {ep.updatedAt || ep.postedAt || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-black/[0.04] px-4 py-2 text-right text-xs text-muted dark:border-white/[0.04]">
            {filtered.length} of {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
