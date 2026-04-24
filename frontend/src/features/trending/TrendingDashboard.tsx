import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingSearchBar } from './components/TrendingSearchBar';
import { YouTubePanel } from './components/YouTubePanel';
import { InstagramPanel } from './components/InstagramPanel';
import { NewsPanel } from './components/NewsPanel';
import { LinkedInPanel } from './components/LinkedInPanel';
import { RecommendationsPanel } from './components/RecommendationsPanel';
import { TrendingGraph } from './components/TrendingGraph';
import { PanelToggle, type PanelConfig } from './components/PanelToggle';
import { useTrending, type TrendingCapabilities } from './hooks/useTrending';
import { useTrendingSearch } from './hooks/useTrendingSearch';
import { TrendingFilters, readFilterDefaults } from './components/TrendingFilters';
import { TrendingWordsWidget } from './components/TrendingWordsWidget';
import { Sparkles, Settings, PlugZap } from 'lucide-react';
import type { GraphNode } from './types';
import type { BackendApi } from '@/services/backendApi';
import type { NewsProviderKeys } from '@/services/configService';

const ALL_PANELS: PanelConfig[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'news', label: 'News' },
];

const DEFAULT_ENABLED = ['youtube', 'instagram', 'news'];

export function TrendingDashboard({
  idToken,
  api,
  newsProviderKeys,
  capabilities,
}: {
  idToken?: string;
  api?: BackendApi;
  newsProviderKeys?: NewsProviderKeys | null;
  capabilities?: TrendingCapabilities;
} = {}) {
  const [topic, setTopic] = useState('');
  const [searchTopic, setSearchTopic] = useState('');
  const [enabledPanels, setEnabledPanels] = useState<string[]>(DEFAULT_ENABLED);
  const [showSettings, setShowSettings] = useState(false);

  const [region, setRegion] = useState(() => readFilterDefaults().region);
  const [genre, setGenre] = useState(() => readFilterDefaults().genre);
  const [windowDays, setWindowDays] = useState(() => readFilterDefaults().windowDays);

  const { data, loading, error, config, enabledPlatforms } = useTrending(searchTopic, idToken, api, capabilities);
  const trendingSearch = useTrendingSearch(searchTopic, region, genre, windowDays, idToken, api);

  const hasNewsApis = Boolean(
    newsProviderKeys?.newsapi ||
    newsProviderKeys?.gnews ||
    newsProviderKeys?.newsdata ||
    newsProviderKeys?.serpapi
  );

  const handleSearch = () => {
    setSearchTopic(topic);
  };

  const handleNodeClick = (node: GraphNode) => {
    let newTopic = '';
    if (node.type === 'youtube') {
      const video = node.data as { title: string };
      newTopic = video.title.split(' ').slice(0, 3).join(' ');
    } else if (node.type === 'news') {
      const article = node.data as { title: string };
      newTopic = article.title.split(' ').slice(0, 3).join(' ');
    } else if (node.type === 'instagram') {
      const post = node.data as { caption: string };
      const hashtagMatch = post.caption.match(/#[a-zA-Z]+/);
      if (hashtagMatch) {
        newTopic = hashtagMatch[0].slice(1);
      }
    }

    if (newTopic) {
      setTopic(newTopic);
      setSearchTopic(newTopic);
    }
  };

  const handleTogglePanel = (id: string, enabled: boolean) => {
    setEnabledPanels(prev =>
      enabled ? [...prev, id] : prev.filter(p => p !== id)
    );
  };

  const availablePanels = ALL_PANELS;

  // Filter to only show panels with data
  const visiblePanels = useMemo(() => {
    if (!data) return [];
    return enabledPanels.filter(id => {
      if (id === 'youtube') return data.youtube.length > 0;
      if (id === 'instagram') return data.instagram.length > 0;
      if (id === 'linkedin') return data.linkedin && data.linkedin.length > 0;
      if (id === 'news') {
        const newsArticles = trendingSearch.data?.articles ?? data.news;
        return newsArticles.length > 0;
      }
      return false;
    });
  }, [data, enabledPanels, trendingSearch.data]);

  return (
    <div className="h-full overflow-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Trending Topics</h1>
            <p className="text-muted mt-1">
              Discover what's viral across platforms
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="API Settings"
          >
            <Settings className="text-muted" size={20} />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-xl border border-border p-4 space-y-4">
            <h3 className="font-medium text-ink">API Configuration</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${enabledPlatforms.youtube ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>YouTube ({config.youtube.adapter})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${enabledPlatforms.instagram ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Instagram ({config.instagram.adapter})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${enabledPlatforms.linkedin ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>LinkedIn ({config.linkedin.adapter})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${enabledPlatforms.news ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>News ({config.news.adapter})</span>
              </div>
            </div>
            <p className="text-xs text-muted">
              API keys are configured via environment variables. Update the backend to enable different APIs.
            </p>
          </div>
        )}

        {/* No news APIs banner */}
        {!hasNewsApis && (
          <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-4 flex items-start gap-3">
            <PlugZap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">No news APIs connected</p>
              <p className="text-xs text-amber-700 mt-1">
                Connect NewsAPI, GNews, or other providers in{' '}
                <strong>Settings → News</strong> to see real trending articles.
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <TrendingSearchBar value={topic} onChange={setTopic} onSearch={handleSearch} />

        <TrendingFilters
          region={region}
          genre={genre}
          windowDays={windowDays}
          onRegionChange={setRegion}
          onGenreChange={setGenre}
          onWindowChange={setWindowDays}
        />

        {trendingSearch.data?.trendingWords && trendingSearch.data.trendingWords.length > 0 && (
          <TrendingWordsWidget
            words={trendingSearch.data.trendingWords}
            onSelectWord={(word) => {
              setTopic(word);
              setSearchTopic(word);
            }}
          />
        )}

        {/* Panel Toggle */}
        <PanelToggle
          panels={availablePanels}
          enabled={enabledPanels}
          onToggle={handleTogglePanel}
        />

        {/* Loading State */}
        {(loading || trendingSearch.loading) && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {/* Error State */}
        {(error || trendingSearch.error) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600">{error || trendingSearch.error}</p>
          </div>
        )}

        {/* Data Display */}
        {data && !loading && (
          <>
            {/* Recommendations */}
            {(() => {
              const relatedTopics = trendingSearch.data?.relatedTopics ?? [];
              const allTopics = [
                ...relatedTopics,
                ...data.recommendedTopics,
                ...data.relatedNewsTopics,
              ];
              const uniqueTopics = [...new Set(allTopics)].slice(0, 10);
              return uniqueTopics.length > 0 ? (
                <RecommendationsPanel
                  topics={uniqueTopics}
                  onSelectTopic={(t) => {
                    setTopic(t);
                    setSearchTopic(t);
                  }}
                />
              ) : null;
            })()}

            {/* Platform Panels Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {visiblePanels.includes('youtube') && data.youtube.length > 0 && (
                <div>
                  <YouTubePanel videos={data.youtube} />
                </div>
              )}

              {visiblePanels.includes('instagram') && data.instagram.length > 0 && (
                <div>
                  <InstagramPanel posts={data.instagram} />
                </div>
              )}

              {visiblePanels.includes('linkedin') && data.linkedin && data.linkedin.length > 0 && (
                <div>
                  <LinkedInPanel posts={data.linkedin} />
                </div>
              )}

              {visiblePanels.includes('news') && (() => {
                const newsArticles = trendingSearch.data?.articles ?? data.news;
                return newsArticles.length > 0 ? (
                  <div className={visiblePanels.length === 1 ? 'xl:col-span-2' : ''}>
                    <NewsPanel articles={newsArticles} />
                  </div>
                ) : null;
              })()}
            </div>

            {/* Graph - show if we have multiple platforms */}
            {visiblePanels.length > 1 && (
              <TrendingGraph data={data} onNodeClick={handleNodeClick} />
            )}
          </>
        )}

        {/* Empty State */}
        {!data && !loading && !error && !searchTopic && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
              <Sparkles className="text-primary" size={32} />
            </div>
            <h3 className="text-ink text-lg font-medium mb-2">
              Explore Trending Content
            </h3>
            <p className="text-muted max-w-md mx-auto">
              Enter a topic above to discover viral videos, posts, and news
              articles across multiple platforms.
            </p>
          </div>
        )}

        {/* No Results State */}
        {!data && !loading && !error && searchTopic && (
          <div className="text-center py-12">
            <p className="text-muted">
              No trending data found for &quot;{searchTopic}&quot;. Try a
              different topic.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
