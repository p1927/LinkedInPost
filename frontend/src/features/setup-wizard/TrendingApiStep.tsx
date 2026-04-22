import { useState } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import type { SetupConfig } from './SetupWizard';

interface TrendingApiStepProps {
  config: SetupConfig;
  onUpdate: (updates: Partial<SetupConfig>) => void;
  onComplete: (apiKeys: SetupConfig['trendingApis']) => void;
  onBack: () => void;
}

const YOUTUBE_APIS = [
  { id: 'youtube-official' as const, name: 'YouTube Data API v3', description: 'Official Google API. 10,000 units/day free.' },
  { id: 'apify-youtube' as const, name: 'Apify YouTube Scraper', description: 'Third-party scraper. No API limits.' },
];

const INSTAGRAM_APIS = [
  { id: 'instagram-official' as const, name: 'Instagram Graph API', description: 'Official Meta API. 200 req/hour. Business accounts only.' },
  { id: 'sociavault' as const, name: 'SociaVault', description: 'All-in-one social API. Generous free tier.' },
];

const LINKEDIN_APIS = [
  { id: 'linkedin-official' as const, name: 'LinkedIn Posts API', description: 'Official API. Restricted access for company pages.' },
  { id: 'apify-linkedin' as const, name: 'Apify LinkedIn Scraper', description: 'Third-party scraper. No API limits.' },
  { id: 'sociavault' as const, name: 'SociaVault', description: 'All-in-one social API. Works with personal accounts.' },
  { id: 'phantombuster' as const, name: 'PhantomBuster', description: 'Browser automation. Good for personal scraping.' },
];

const NEWS_APIS = [
  { id: 'newsdata' as const, name: 'NewsData.io', description: '200 credits/day free. Commercial use allowed.' },
  { id: 'guardian' as const, name: 'The Guardian API', description: 'Free. Open access to Guardian content.' },
  { id: 'gnews' as const, name: 'GNews API', description: '100 requests/day free. Good general news coverage.' },
];

export function TrendingApiStep({ config, onUpdate, onComplete, onBack }: TrendingApiStepProps) {
  const [selectedYoutube, setSelectedYoutube] = useState(config.trendingApis.youtube.adapter);
  const [selectedInstagram, setSelectedInstagram] = useState(config.trendingApis.instagram.adapter);
  const [selectedLinkedIn, setSelectedLinkedIn] = useState(config.trendingApis.linkedin.adapter);
  const [selectedNews, setSelectedNews] = useState(config.trendingApis.news.adapter);

  const handleComplete = () => {
    const apiKeys: SetupConfig['trendingApis'] = {
      youtube: { ...config.trendingApis.youtube, adapter: selectedYoutube },
      instagram: { ...config.trendingApis.instagram, adapter: selectedInstagram },
      linkedin: { ...config.trendingApis.linkedin, adapter: selectedLinkedIn },
      news: { ...config.trendingApis.news, adapter: selectedNews },
    };
    onUpdate({ trendingApis: apiKeys });
    onComplete(apiKeys);
  };

  const renderAdapterSelector = <T extends string>(
    adapters: { id: T; name: string; description: string }[],
    selected: T,
    onSelect: (id: T) => void
  ) => (
    <div className="space-y-2">
      {adapters.map(adapter => (
        <button
          key={adapter.id}
          onClick={() => onSelect(adapter.id)}
          className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
            selected === adapter.id
              ? 'border-violet-500 bg-violet-50/50'
              : 'border-border bg-white hover:border-violet-200'
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
            selected === adapter.id ? 'bg-violet-600 border-violet-600' : 'border-muted'
          }`}>
            {selected === adapter.id && <Check className="w-3 h-3 text-white" />}
          </div>
          <div>
            <div className="font-medium text-sm text-ink">{adapter.name}</div>
            <div className="text-xs text-muted">{adapter.description}</div>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="glass-panel-strong rounded-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <h2 className="font-heading text-xl font-semibold text-ink mb-1">
        Trending APIs
      </h2>
      <p className="text-sm text-muted mb-5">
        Configure APIs for discovering trending content. You can skip or configure later in settings.
      </p>

      <div className="space-y-6">
        {/* YouTube */}
        <div>
          <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            YouTube
          </h3>
          {renderAdapterSelector(YOUTUBE_APIS, selectedYoutube, setSelectedYoutube)}
        </div>

        {/* Instagram */}
        <div>
          <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-600 to-pink-500" />
            Instagram
          </h3>
          {renderAdapterSelector(INSTAGRAM_APIS, selectedInstagram, setSelectedInstagram)}
        </div>

        {/* LinkedIn */}
        <div>
          <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            LinkedIn
          </h3>
          {renderAdapterSelector(LINKEDIN_APIS, selectedLinkedIn, setSelectedLinkedIn)}
        </div>

        {/* News */}
        <div>
          <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            News
          </h3>
          {renderAdapterSelector(NEWS_APIS, selectedNews, setSelectedNews)}
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted hover:text-ink transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
