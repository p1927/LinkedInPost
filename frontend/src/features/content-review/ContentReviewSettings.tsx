import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ContentReviewSettings, ContentReviewNewsMode } from './types';

interface ContentReviewSettingsProps {
  settings: ContentReviewSettings;
  newsResearchEnabled: boolean;
  onSave: (updated: ContentReviewSettings) => Promise<void>;
}

export function ContentReviewSettings({ settings, newsResearchEnabled, onSave }: ContentReviewSettingsProps) {
  const [textModelId, setTextModelId] = useState(settings.textModelId ?? 'gemini-2.5-flash');
  const [visionModelId, setVisionModelId] = useState(settings.visionModelId ?? 'gemini-2.5-flash');
  const [newsMode, setNewsMode] = useState<ContentReviewNewsMode>(settings.newsMode ?? 'existing');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        textModelId: textModelId.trim() || undefined,
        visionModelId: visionModelId.trim() || undefined,
        newsMode,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-0 space-y-4 border-t border-violet-200/50 pt-6">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">Content Review Models</h3>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Text review model
          <Input
            className="mt-0.5 h-8 text-xs font-mono"
            value={textModelId}
            onChange={(e) => setTextModelId(e.target.value)}
            placeholder="gemini-2.5-flash"
          />
        </label>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Vision review model
          <Input
            className="mt-0.5 h-8 text-xs font-mono"
            value={visionModelId}
            onChange={(e) => setVisionModelId(e.target.value)}
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
              checked={newsMode === 'existing'}
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
              checked={newsMode === 'fresh'}
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

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-xs font-semibold"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </section>
  );
}
