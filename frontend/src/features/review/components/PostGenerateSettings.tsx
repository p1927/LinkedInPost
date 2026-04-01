import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { LlmProviderId, LlmModelOption } from '@repo/llm-core';

interface CatalogProvider {
  id: LlmProviderId;
  name: string;
  models: LlmModelOption[];
}

interface GenerationSettings {
  provider: LlmProviderId;
  model: string;
}

interface PostGenerateSettingsProps {
  /** When set, provider/model are driven by the parent (e.g. workspace settings). */
  value?: GenerationSettings;
  onSettingsChange?: (settings: GenerationSettings) => void;
  disabled?: boolean;
  className?: string;
  /** Cached LLM provider catalog from app load. */
  llmCatalog?: any[] | null;
}

export function PostGenerateSettings({
  value,
  onSettingsChange,
  disabled = false,
  className,
  llmCatalog,
}: PostGenerateSettingsProps) {
  const [internalSettings, setInternalSettings] = useState<GenerationSettings>({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });

  const settings = value ?? internalSettings;
  const isControlledRef = useRef(value !== undefined);
  isControlledRef.current = value !== undefined;

  // Use cached catalog from app load
  const providers: CatalogProvider[] = useMemo(() => {
    if (!llmCatalog || llmCatalog.length === 0) {
      return [];
    }
    return llmCatalog as CatalogProvider[];
  }, [llmCatalog]);

  // On first render with catalog, default to first provider if uncontrolled
  useEffect(() => {
    if (!isControlledRef.current && providers.length > 0 && internalSettings.provider === 'gemini' && internalSettings.model === 'gemini-2.5-flash') {
      const firstProvider = providers[0];
      if (firstProvider.models && firstProvider.models.length > 0) {
        setInternalSettings({
          provider: firstProvider.id,
          model: firstProvider.models[0].value,
        });
      }
    }
  }, [providers]);

  const currentProvider = providers.find((p) => p.id === settings.provider);
  const catalogModels = currentProvider?.models || [];
  const modelOptions = useMemo(() => {
    if (settings.model && !catalogModels.some((m) => m.value === settings.model)) {
      return [{ value: settings.model, label: settings.model }, ...catalogModels];
    }
    return catalogModels;
  }, [catalogModels, settings.model]);

  const handleProviderChange = (provider: LlmProviderId) => {
    if (disabled) return;
    const newProvider = providers.find((p) => p.id === provider);
    const firstModel = newProvider?.models?.[0]?.value || '';

    const newSettings: GenerationSettings = {
      provider,
      model: firstModel,
    };
    if (value === undefined) {
      setInternalSettings(newSettings);
    }
    onSettingsChange?.(newSettings);
  };

  const handleModelChange = (model: string) => {
    if (disabled) return;
    const newSettings = { ...settings, model };
    if (value === undefined) {
      setInternalSettings(newSettings);
    }
    onSettingsChange?.(newSettings);
  };

  if (!providers || providers.length === 0) {
    return (
      <div className={clsx('p-4 bg-gray-50 rounded-lg', className)}>
        <p className="text-sm text-gray-600">No LLM providers available</p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200', className)}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          LLM Provider
        </label>
        <div className="flex gap-2">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              disabled={disabled}
              onClick={() => handleProviderChange(provider.id)}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                disabled && 'cursor-not-allowed opacity-60',
                settings.provider === provider.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              )}
            >
              {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
          Model
        </label>
        <select
          id="model-select"
          value={settings.model}
          disabled={disabled}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {modelOptions.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200">
        <p className="font-medium mb-1">Selected Configuration:</p>
        <p>Provider: <span className="font-mono">{settings.provider}</span></p>
        <p>Model: <span className="font-mono">{settings.model}</span></p>
      </div>
    </div>
  );
}
