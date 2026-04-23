import { useState, useEffect } from 'react';
import { ExternalLink, Newspaper, Lightbulb, SearchX, RefreshCw } from 'lucide-react';
import { useTrending } from '../trending/hooks/useTrending';

export function TrendingSidebar({ topic, onRefresh }: { topic: string; onRefresh?: () => void }) {
  const [fetchedTopic, setFetchedTopic] = useState('');
  const { data, loading, error, refetch } = useTrending(fetchedTopic);

  // Fetch on mount if topic is non-empty and we haven't fetched yet
  useEffect(() => {
    if (topic.trim() && !fetchedTopic) {
      setFetchedTopic(topic);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    if (topic.trim()) {
      setFetchedTopic(topic);
      void refetch();
      onRefresh?.();
    }
  };

  // Topic changed since last fetch — show placeholder asking for refresh
  const needsRefresh = topic.trim() && topic !== fetchedTopic;

  const news = data?.news ?? [];
  const recommended = data?.recommendedTopics ?? [];

  if (!topic.trim()) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted">
        <Newspaper className="h-8 w-8 opacity-40" />
        <p className="text-sm">Type a topic to see related news and trends</p>
      </div>
    );
  }

  if (needsRefresh && !loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted">
        <RefreshCw className="h-8 w-8 opacity-40" />
        <p className="text-sm">Click refresh to load research for "{topic}"</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-full border border-white/40 bg-white/30 px-4 py-2 text-xs font-medium text-ink backdrop-blur-sm transition-colors hover:bg-white/50"
        >
          Refresh
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-xl border border-white/40 bg-white/30 p-3 backdrop-blur-sm">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted/30" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/20" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-white/40 bg-white/30 p-3 text-xs text-muted backdrop-blur-sm">
        Could not load trending data.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Live Research header with refresh button */}
      <div className="mb-3 flex items-center gap-2">
        <Newspaper className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted/60">Live Research</span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded p-1 text-muted transition-colors hover:bg-white/40 hover:text-ink disabled:opacity-50"
          aria-label="Refresh research"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {news.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Newspaper className="h-3.5 w-3.5" />
            Related News
          </div>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {news.slice(0, 8).map((article) => (
              <li key={article.id}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-0.5 rounded-xl border border-white/40 bg-white/30 p-3 no-underline backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-white/50"
                >
                  <span className="text-xs font-semibold leading-snug text-ink group-hover:text-primary line-clamp-2">
                    {article.title}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-muted">
                    <span className="truncate">{article.source}</span>
                    <span>·</span>
                    <span className="shrink-0">{article.publishedAt}</span>
                    <ExternalLink className="ml-auto h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recommended.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Lightbulb className="h-3.5 w-3.5" />
            Related Topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recommended.slice(0, 10).map((t, i) => (
              <span
                key={i}
                className="rounded-full border border-white/50 bg-white/40 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {news.length === 0 && recommended.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted">
          <SearchX className="h-5 w-5 opacity-40" />
          <p className="text-xs">No results found for this topic</p>
        </div>
      )}
    </div>
  );
}
