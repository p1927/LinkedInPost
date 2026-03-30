import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { NewsProviderKeys, NewsResearchFeedEntry, NewsResearchStored } from '../../services/configService';

function ApiRow({
  label,
  description,
  enabled,
  onEnabled,
  keyOk,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  keyOk: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200/50 bg-white/60 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-muted">{description}</p>
        <p className={`mt-1 text-[0.65rem] font-medium ${keyOk ? 'text-emerald-800' : 'text-amber-800'}`}>
          {keyOk ? 'Worker API key present' : 'No key in Worker env — provider will be skipped'}
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-ink shrink-0">
        <input type="checkbox" checked={enabled} onChange={(e) => onEnabled(e.target.checked)} />
        Use
      </label>
    </div>
  );
}

export function NewsResearchSettingsSection({
  value,
  onChange,
  newsProviderKeys,
}: {
  value: NewsResearchStored;
  onChange: (next: NewsResearchStored) => void;
  newsProviderKeys: NewsProviderKeys;
}) {
  const setApis = (patch: Partial<NewsResearchStored['apis']>) => {
    onChange({ ...value, apis: { ...value.apis, ...patch } });
  };

  const addFeed = () => {
    const url = window.prompt('RSS or Atom feed URL');
    if (!url?.trim()) return;
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `feed-${Date.now()}`;
    const next: NewsResearchFeedEntry[] = [...value.rssFeeds, { id, url: url.trim(), enabled: true }];
    onChange({ ...value, rssFeeds: next });
  };

  const updateFeed = (id: string, patch: Partial<NewsResearchFeedEntry>) => {
    onChange({
      ...value,
      rssFeeds: value.rssFeeds.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const removeFeed = (id: string) => {
    onChange({ ...value, rssFeeds: value.rssFeeds.filter((f) => f.id !== id) });
  };

  return (
    <section className="mt-0 space-y-4 border-t border-violet-200/50 pt-6">
      <div>
        <h2 className="font-heading text-lg font-semibold text-ink">News</h2>
        <p className="mt-1 text-sm text-muted">
          Choose news APIs and RSS feeds for the draft <strong className="text-ink">News research</strong> panel. API keys are set as Worker secrets (
          <code className="text-xs">NEWSAPI_KEY</code>, <code className="text-xs">GNEWS_API_KEY</code>,{' '}
          <code className="text-xs">NEWSDATA_API_KEY</code>, <code className="text-xs">SERPAPI_API_KEY</code>).
        </p>
        <p className="mt-2 text-xs text-amber-900/90">
          NewsAPI developer tier is not for commercial use; free tiers may delay headlines. Respect each provider&apos;s terms.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Enable news research in the editor
      </label>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">APIs</h3>
        <ApiRow
          label="NewsAPI.org"
          description="Everything search within the date window (100 req/day typical on free tier)."
          enabled={value.apis.newsapi}
          onEnabled={(v) => setApis({ newsapi: v })}
          keyOk={newsProviderKeys.newsapi}
        />
        <ApiRow
          label="GNews"
          description="GNews search API (free tier limits apply)."
          enabled={value.apis.gnews}
          onEnabled={(v) => setApis({ gnews: v })}
          keyOk={newsProviderKeys.gnews}
        />
        <ApiRow
          label="NewsData.io"
          description="Optional paid-tier news index."
          enabled={value.apis.newsdata}
          onEnabled={(v) => setApis({ newsdata: v })}
          keyOk={newsProviderKeys.newsdata}
        />
        <ApiRow
          label="SerpApi Google News"
          description="Uses the same SerpApi quota as image search."
          enabled={value.apis.serpapiNews}
          onEnabled={(v) => setApis({ serpapiNews: v })}
          keyOk={newsProviderKeys.serpapi}
        />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">RSS feeds</h3>
          <Button type="button" size="sm" variant="outline" className="text-xs" onClick={addFeed}>
            Add feed URL
          </Button>
        </div>
        {value.rssFeeds.length === 0 ? (
          <p className="text-xs text-muted">No custom feeds. You can still set <code className="text-[0.65rem]">RESEARCHER_RSS_FEEDS</code> on the Worker.</p>
        ) : (
          <ul className="space-y-2">
            {value.rssFeeds.map((f) => (
              <li key={f.id} className="rounded-lg border border-violet-200/50 bg-white/70 p-2 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input type="checkbox" checked={f.enabled} onChange={(e) => updateFeed(f.id, { enabled: e.target.checked })} />
                    Enabled
                  </label>
                  <Button type="button" size="sm" variant="ghost" className="text-xs text-red-700 h-7" onClick={() => removeFeed(f.id)}>
                    Remove
                  </Button>
                </div>
                <Input
                  className="h-8 text-xs font-mono"
                  value={f.url}
                  onChange={(e) => updateFeed(f.id, { url: e.target.value })}
                  placeholder="https://example.com/feed.xml"
                />
                <Input
                  className="h-8 text-xs"
                  value={f.label || ''}
                  onChange={(e) => updateFeed(f.id, { label: e.target.value || undefined })}
                  placeholder="Label (optional)"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
