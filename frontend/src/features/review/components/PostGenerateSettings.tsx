import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface LLMModel {
  value: string;
  label: string;
}

interface LLMProvider {
  provider: 'gemini' | 'grok';
  models: LLMModel[];
}

interface GenerationSettings {
  provider: 'gemini' | 'grok';
  model: string;
}

interface PostGenerateSettingsProps {
  onSettingsChange?: (settings: GenerationSettings) => void;
  className?: string;
}

export function PostGenerateSettings({
  onSettingsChange,
  className,
}: PostGenerateSettingsProps) {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available LLM providers and models
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://linkedin-generation-worker.99pratyush.workers.dev/v1/llm/catalog', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer fIlxO83N+KWkH2Z25N7fCZkhROttPBn35glyRDm/xrQ=`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch LLM providers');
        }

        const data = await response.json() as { providers: LLMProvider[] };
        setProviders(data.providers || []);

        // Set default to first available provider
        if (data.providers && data.providers.length > 0) {
          const firstProvider = data.providers[0];
          if (firstProvider.models && firstProvider.models.length > 0) {
            setSettings({
              provider: firstProvider.provider,
              model: firstProvider.models[0].value,
            });
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load LLM providers');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const currentProvider = providers.find((p) => p.provider === settings.provider);
  const availableModels = currentProvider?.models || [];

  const handleProviderChange = (provider: 'gemini' | 'grok') => {
    const newProvider = providers.find((p) => p.provider === provider);
    const firstModel = newProvider?.models?.[0]?.value || '';

    const newSettings = {
      provider,
      model: firstModel,
    };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleModelChange = (model: string) => {
    const newSettings = { ...settings, model };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  if (loading) {
    return (
      <div className={clsx('p-4 bg-gray-50 rounded-lg', className)}>
        <p className="text-sm text-gray-600">Loading LLM providers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('p-4 bg-red-50 rounded-lg border border-red-200', className)}>
        <p className="text-sm text-red-700">{error}</p>
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
              key={provider.provider}
              onClick={() => handleProviderChange(provider.provider)}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                settings.provider === provider.provider
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              )}
            >
              {provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1)}
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
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {availableModels.map((model) => (
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
