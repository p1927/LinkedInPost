import { Input } from '@/components/ui/input';
import type { ContentReviewNewsMode, ContentReviewStored } from '../../services/configService';

interface ContentReviewSettingsProps {
  value: ContentReviewStored;
  onChange: (next: ContentReviewStored) => void;
  newsResearchEnabled: boolean;
}

export function ContentReviewSettings({ value, onChange, newsResearchEnabled }: ContentReviewSettingsProps) {
  const setNewsMode = (newsMode: ContentReviewNewsMode) => {
    onChange({ ...value, newsMode });
  };

  return (
    <section className="mt-0 space-y-4 border-t border-violet-200/50 pt-6">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">Content Review Models</h3>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Text review model
          <Input
            className="mt-0.5 h-8 text-xs font-mono"
            value={value.textModelId}
            onChange={(e) => onChange({ ...value, textModelId: e.target.value })}
            placeholder="gemini-2.5-flash"
          />
        </label>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Vision review model
          <Input
            className="mt-0.5 h-8 text-xs font-mono"
            value={value.visionModelId}
            onChange={(e) => onChange({ ...value, visionModelId: e.target.value })}
            placeholder="gemini-2.5-flash"
          />
        </label>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">News mode</h3>
        <p className="text-[0.65rem] text-muted">
          Choose how news context is sourced during content review.
        </p>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="radio"
              name="content-review-news-mode"
              value="existing"
              checked={value.newsMode === 'existing'}
              onChange={() => setNewsMode('existing')}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-ink">Existing</span>
              <span className="ml-1 text-muted">— use already-fetched news from the research panel</span>
            </span>
          </label>

          <label className={`flex items-start gap-2 text-xs ${newsResearchEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
            <input
              type="radio"
              name="content-review-news-mode"
              value="fresh"
              checked={value.newsMode === 'fresh'}
              onChange={() => {
                if (newsResearchEnabled) setNewsMode('fresh');
              }}
              disabled={!newsResearchEnabled}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-ink">Fresh</span>
              <span className="ml-1 text-muted">— fetch new articles at review time</span>
              {!newsResearchEnabled ? (
                <span className="ml-1 text-amber-700">(enable News research in Settings → News)</span>
              ) : null}
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
