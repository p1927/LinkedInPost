import { useMemo } from 'react';
import { LLM_PROVIDER_IDS, getProviderLabel } from '@repo/llm-core';
import type { LlmProviderId, LlmModelOption } from '@repo/llm-core';
import type { ContentReviewNewsMode, ContentReviewStored } from '../../services/configService';
import { LlmProviderSelect, LlmModelCombobox } from '@/components/llm';

interface ContentReviewSettingsProps {
  value: ContentReviewStored;
  onChange: (next: ContentReviewStored) => void;
  newsResearchEnabled: boolean;
  llmCatalog?: Array<{ id: LlmProviderId; name: string; models: LlmModelOption[] }> | null;
}

function modelsForProvider(provider: LlmProviderId, catalog?: Array<{ id: LlmProviderId; name: string; models: LlmModelOption[] }> | null): LlmModelOption[] {
  if (!catalog || catalog.length === 0) return [];
  const providerData = catalog.find((p) => p.id === provider);
  return providerData?.models ?? [];
}

function ensureModelInList(
  models: LlmModelOption[],
  modelId: string,
  provider: LlmProviderId,
): LlmModelOption[] {
  if (modelId && !models.some((m) => m.value === modelId)) {
    return [{ value: modelId, label: modelId, provider }, ...models];
  }
  return models;
}

const ALL_PROVIDERS = LLM_PROVIDER_IDS.map((id) => ({
  id,
  name: getProviderLabel(id),
}));

export function ContentReviewSettings({
  value,
  onChange,
  newsResearchEnabled,
  llmCatalog,
}: ContentReviewSettingsProps) {
  const textProvider: LlmProviderId = value.textRef.provider;
  const textModel: string = value.textRef.model;
  const visionProvider: LlmProviderId = value.visionRef.provider;
  const visionModel: string = value.visionRef.model;

  const textModels = useMemo(
    () => ensureModelInList(modelsForProvider(textProvider, llmCatalog), textModel, textProvider),
    [textProvider, textModel, llmCatalog],
  );

  const visionModels = useMemo(
    () =>
      ensureModelInList(modelsForProvider(visionProvider, llmCatalog), visionModel, visionProvider),
    [visionProvider, visionModel, llmCatalog],
  );

  const handleTextProviderChange = (provider: LlmProviderId) => {
    if (!llmCatalog || llmCatalog.length === 0) return;
    const models = modelsForProvider(provider, llmCatalog);
    const firstModel = models[0]?.value ?? '';
    onChange({ ...value, textRef: { provider, model: firstModel } });
  };

  const handleVisionProviderChange = (provider: LlmProviderId) => {
    if (!llmCatalog || llmCatalog.length === 0) return;
    const models = modelsForProvider(provider, llmCatalog);
    const firstModel = models[0]?.value ?? '';
    onChange({ ...value, visionRef: { provider, model: firstModel } });
  };

  const setNewsMode = (newsMode: ContentReviewNewsMode) => {
    onChange({ ...value, newsMode });
  };

  return (
    <section className="mt-0 space-y-4 border-t border-violet-200/50 pt-6">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">Text Review</h3>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Provider
          <div className="mt-0.5">
            <LlmProviderSelect
              providers={ALL_PROVIDERS}
              value={textProvider}
              onChange={handleTextProviderChange}
              size="sm"
            />
          </div>
        </label>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Model
          <div className="mt-0.5">
            <LlmModelCombobox
              models={textModels}
              value={textModel}
              onChange={(model) => onChange({ ...value, textRef: { provider: textProvider, model } })}
              size="sm"
            />
          </div>
        </label>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/75">Vision Review</h3>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Provider
          <div className="mt-0.5">
            <LlmProviderSelect
              providers={ALL_PROVIDERS}
              value={visionProvider}
              onChange={handleVisionProviderChange}
              size="sm"
            />
          </div>
        </label>

        <label className="block text-[0.65rem] font-semibold text-ink">
          Model
          <div className="mt-0.5">
            <LlmModelCombobox
              models={visionModels}
              value={visionModel}
              onChange={(model) =>
                onChange({ ...value, visionRef: { provider: visionProvider, model } })
              }
              size="sm"
            />
          </div>
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

          <label
            className={`flex items-start gap-2 text-xs ${newsResearchEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          >
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
                <span className="ml-1 text-amber-700">
                  (enable News research in Settings → News)
                </span>
              ) : null}
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
