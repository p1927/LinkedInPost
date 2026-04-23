import { useState } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import type { SetupConfig } from './SetupWizard';

interface ImageGenStepProps {
  config: SetupConfig;
  onUpdate: (updates: Partial<SetupConfig>) => void;
  onComplete: (envVars: Record<string, string>) => void;
  onSkip: () => void;
  onBack: () => void;
}

const PROVIDERS = [
  {
    key: 'FAL_API_KEY',
    label: 'FAL API Key',
    description: 'Unlocks FLUX Kontext, Ideogram, Kling video, Seedance video — one key covers most providers.',
    primary: true,
  },
];

const ADVANCED_PROVIDERS = [
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI API Key',
    description: 'Unlocks DALL-E / GPT Image generation.',
  },
  {
    key: 'STABILITY_API_KEY',
    label: 'Stability AI API Key',
    description: 'Unlocks Stability AI SD3.5.',
  },
  {
    key: 'RUNWAY_API_KEY',
    label: 'Runway API Key',
    description: 'Unlocks Runway video generation.',
  },
];

export function ImageGenStep({ config, onUpdate, onComplete, onSkip, onBack }: ImageGenStepProps) {
  const [keys, setKeys] = useState<Record<string, string>>(() => {
    const all = [...PROVIDERS, ...ADVANCED_PROVIDERS];
    const initial: Record<string, string> = {};
    all.forEach(p => {
      initial[p.key] = config.envVars[p.key] || '';
    });
    return initial;
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visible, setVisible] = useState<Set<string>>(new Set());

  const toggleVisible = (key: string) => {
    setVisible(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const updateKey = (key: string, value: string) => {
    setKeys(prev => ({ ...prev, [key]: value }));
  };

  const handleComplete = () => {
    const filtered: Record<string, string> = {};
    Object.entries(keys).forEach(([k, v]) => {
      if (v.trim()) filtered[k] = v.trim();
    });
    const mergedEnvVars = { ...config.envVars, ...filtered };
    onUpdate({ envVars: mergedEnvVars });
    onComplete(mergedEnvVars);
  };

  const renderKeyInput = (provider: { key: string; label: string; description: string }) => (
    <div key={provider.key}>
      <label className="block text-sm font-medium text-ink mb-1">
        {provider.label}
      </label>
      <div className="relative">
        <input
          type={visible.has(provider.key) ? 'text' : 'password'}
          value={keys[provider.key]}
          onChange={(e) => updateKey(provider.key, e.target.value)}
          placeholder="Optional"
          className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-10 text-ink placeholder:text-muted/50 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => toggleVisible(provider.key)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
        >
          {visible.has(provider.key) ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">{provider.description}</p>
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

      <div className="flex items-center gap-2 mb-1">
        <h2 className="font-heading text-xl font-semibold text-ink">
          Image Generation
        </h2>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          Optional
        </span>
      </div>
      <p className="text-sm text-muted mb-1">
        Add API keys to enable AI image and video generation in your posts.
      </p>
      <p className="text-xs text-muted/70 mb-5">
        Without image generation keys, posts will use internet images from search results — which still works fine.
      </p>

      <div className="space-y-4">
        {PROVIDERS.map(renderKeyInput)}

        {/* Advanced section */}
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors text-sm font-medium text-ink"
          >
            <span>Advanced — additional providers</span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted" />
            )}
          </button>
          {showAdvanced && (
            <div className="p-4 space-y-4">
              {ADVANCED_PROVIDERS.map(renderKeyInput)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted hover:text-ink transition-colors"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted hover:text-ink transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleComplete}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
