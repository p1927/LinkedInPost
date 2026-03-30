import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SheetRow } from '../../services/sheets';
import type { NewsResearchStored } from '../../services/configService';
import type {
  NewsApiProviderId,
  NewsResearchHistoryItem,
  NewsResearchSearchPayload,
  NewsResearchSearchResult,
  NewsResearchSnapshotDetail,
  ResearchArticleHit,
  ResearchArticleRef,
} from '../../services/backendApi';

function normalizeSnapshotArticles(raw: unknown[]): ResearchArticleHit[] {
  const out: ResearchArticleHit[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const url = String(o.url || '').trim();
    if (!url) continue;
    const providerRaw = String(o.provider || 'rss').trim();
    const provider = (['rss', 'newsapi', 'gnews', 'newsdata', 'serpapi_news'].includes(providerRaw)
      ? providerRaw
      : 'rss') as NewsApiProviderId;
    out.push({
      title: String(o.title || ''),
      url,
      source: String(o.source || ''),
      publishedAt: String(o.publishedAt || ''),
      snippet: String(o.snippet || ''),
      provider,
    });
  }
  return out;
}

function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function datetimeLocalToIso(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function defaultWindow(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function ResearcherPanel({
  row,
  newsResearch,
  onSearch,
  onListHistory,
  onLoadSnapshot,
  selectedRefs,
  onSelectedRefsChange,
}: {
  row: SheetRow;
  newsResearch: NewsResearchStored;
  onSearch: (payload: NewsResearchSearchPayload) => Promise<NewsResearchSearchResult>;
  onListHistory?: () => Promise<NewsResearchHistoryItem[]>;
  onLoadSnapshot?: (id: string) => Promise<NewsResearchSnapshotDetail>;
  selectedRefs: ResearchArticleRef[];
  onSelectedRefsChange: (refs: ResearchArticleRef[]) => void;
}) {
  const initial = useMemo(() => defaultWindow(), []);
  const [windowStart, setWindowStart] = useState(() => isoToDatetimeLocalValue(initial.start));
  const [windowEnd, setWindowEnd] = useState(() => isoToDatetimeLocalValue(initial.end));
  const [customQuery, setCustomQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResearchArticleHit[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(() => new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<NewsResearchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [snapshotLoadingId, setSnapshotLoadingId] = useState<string | null>(null);

  if (!newsResearch.enabled) {
    return (
      <section className="rounded-xl border border-dashed border-violet-200/60 bg-white/50 p-3 text-xs text-muted">
        Turn on <strong className="text-ink">News research</strong> in Settings → News to fetch articles here.
      </section>
    );
  }

  const toggleUrl = (article: ResearchArticleHit, on: boolean) => {
    const next = new Set(selectedUrls);
    if (on) next.add(article.url);
    else next.delete(article.url);
    setSelectedUrls(next);
    const refs: ResearchArticleRef[] = results
      .filter((a) => next.has(a.url))
      .map((a) => ({
        title: a.title,
        url: a.url,
        source: a.source,
        publishedAt: a.publishedAt,
        snippet: a.snippet,
      }));
    onSelectedRefsChange(refs);
  };

  const handleSearch = async () => {
    setLoading(true);
    setWarnings([]);
    try {
      const payload: NewsResearchSearchPayload = {
        topicId: row.topicId,
        topic: row.topic,
        date: row.date,
        windowStart: datetimeLocalToIso(windowStart),
        windowEnd: datetimeLocalToIso(windowEnd),
        customQuery: customQuery.trim() || undefined,
      };
      const res = await onSearch(payload);
      setResults(res.articles);
      setWarnings(res.warnings || []);
      setSelectedUrls(new Set());
      onSelectedRefsChange([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHistory = async () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && onListHistory && historyItems.length === 0 && !historyLoading) {
      setHistoryLoading(true);
      try {
        setHistoryItems(await onListHistory());
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const handleLoadSnapshot = async (id: string) => {
    if (!onLoadSnapshot) return;
    setSnapshotLoadingId(id);
    setWarnings([]);
    try {
      const snap = await onLoadSnapshot(id);
      const hits = normalizeSnapshotArticles(snap.articles);
      setResults(hits.slice(0, 60));
      setSelectedUrls(new Set());
      onSelectedRefsChange([]);
    } finally {
      setSnapshotLoadingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-white p-3 shadow-sm space-y-3" aria-label="News research">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/80">News research</h3>
      <p className="text-[0.65rem] leading-snug text-muted">
        Fetch articles for this topic, select sources, then run Quick Change or 4 Variants to fold them into the prompt.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[0.65rem] font-semibold text-ink">
          From
          <Input type="datetime-local" className="mt-0.5 h-8 text-xs" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
        </label>
        <label className="block text-[0.65rem] font-semibold text-ink">
          To
          <Input type="datetime-local" className="mt-0.5 h-8 text-xs" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
        </label>
      </div>
      <label className="block text-[0.65rem] font-semibold text-ink">
        Custom search (optional)
        <Input
          className="mt-0.5 h-8 text-xs"
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          placeholder="e.g. semiconductor earnings"
        />
      </label>
      <Button type="button" size="sm" variant="outline" className="w-full text-xs font-semibold" disabled={loading} onClick={() => void handleSearch()}>
        {loading ? 'Searching…' : 'Search news'}
      </Button>
      {onListHistory ? (
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-full text-[0.65rem] font-semibold text-muted"
            disabled={historyLoading}
            onClick={() => void handleToggleHistory()}
          >
            {historyLoading ? 'Loading history…' : historyOpen ? 'Hide past searches' : 'Past searches'}
          </Button>
          {historyOpen ? (
            historyItems.length === 0 && !historyLoading ? (
              <p className="text-[0.65rem] text-muted">No saved runs for this topic yet.</p>
            ) : (
              <ul className="max-h-32 space-y-1 overflow-y-auto text-[0.65rem]">
                {historyItems.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 rounded border border-border/60 bg-white/80 px-2 py-1">
                    <span className="min-w-0 truncate text-muted">
                      {new Date(h.fetchedAt).toLocaleString()} · {h.articleCount} articles
                    </span>
                    {onLoadSnapshot ? (
                      <Button
                        type="button"
                        size="inline"
                        variant="outline"
                        className="h-6 shrink-0 px-2 text-[0.6rem]"
                        disabled={snapshotLoadingId === h.id}
                        onClick={() => void handleLoadSnapshot(h.id)}
                      >
                        {snapshotLoadingId === h.id ? '…' : 'Load'}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-[0.65rem] text-amber-900/90">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {results.length > 0 ? (
        <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
          {results.map((a) => (
            <li key={a.url} className="rounded-lg border border-violet-100/80 bg-violet-50/40 p-2">
              <label className="flex cursor-pointer gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedUrls.has(a.url)}
                  onChange={(e) => toggleUrl(a, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{a.title}</span>
                  <span className="mt-0.5 block text-[0.65rem] text-muted">
                    {a.source} · {a.provider}
                  </span>
                  <a href={a.url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-primary underline-offset-2 hover:underline">
                    {a.url}
                  </a>
                  {a.snippet ? <p className="mt-1 text-[0.65rem] leading-snug text-muted">{a.snippet}</p> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      {selectedRefs.length > 0 ? (
        <p className="text-[0.65rem] font-semibold text-ink">{selectedRefs.length} source(s) will be sent to the model with the next generation.</p>
      ) : null}
    </section>
  );
}
