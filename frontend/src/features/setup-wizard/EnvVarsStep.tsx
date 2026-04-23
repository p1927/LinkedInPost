import { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, Copy, Check } from 'lucide-react';
import type { SetupConfig } from './SetupWizard';

interface EnvVarsStepProps {
  config: SetupConfig;
  onUpdate: (updates: Partial<SetupConfig>) => void;
  onComplete: (envVars: Record<string, string>) => void;
  onBack: () => void;
}

// Common environment variables needed
const ENV_VAR_FIELDS = [
  { key: 'VITE_GOOGLE_CLIENT_ID', label: 'Google Client ID', description: 'For OAuth login', required: true },
  { key: 'VITE_WORKER_URL', label: 'Worker URL', description: 'Your Cloudflare Worker URL', required: true },
  { key: 'GEMINI_API_KEY', label: 'Gemini API Key', description: 'For AI content generation', required: false },
  { key: 'XAI_API_KEY', label: 'xAI/Grok API Key', description: 'For alternative AI generation', required: false },
  { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', description: 'For OpenRouter models', required: false },
  { key: 'MINIMAX_API_KEY', label: 'MiniMax API Key', description: 'For MiniMax AI models', required: false },
  { key: 'CLOUDFLARE_API_TOKEN', label: 'Cloudflare API Token', description: 'For Worker deployment', required: false },
  { key: 'SER<PASSWORD>API_KEY', label: 'SerpAPI Key', description: 'For news research', required: false },
  { key: 'PIXAZO_API_KEY', label: 'Pixazo API Key', description: 'For AI image generation', required: false },
  { key: 'SEEDANCE_API_KEY', label: 'Seedance API Key', description: 'For video generation', required: false },
  { key: 'TELEGRAM_BOT_TOKEN', label: 'Telegram Bot Token', description: 'For Telegram notifications', required: false },
  { key: 'GITHUB_TOKEN_ENCRYPTION_KEY', label: 'Encryption Key', description: 'For encrypting tokens (32+ chars)', required: false },
];

export function EnvVarsStep({ config, onUpdate, onComplete, onBack }: EnvVarsStepProps) {
  const [envVars, setEnvVars] = useState<Record<string, string>>(() => {
    // Initialize from config or empty
    const initial: Record<string, string> = {};
    ENV_VAR_FIELDS.forEach(field => {
      initial[field.key] = config.envVars[field.key] || '';
    });
    return initial;
  });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const toggleVisibility = (key: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleKeys(newVisible);
  };

  const updateEnvVar = (key: string, value: string) => {
    setEnvVars(prev => ({ ...prev, [key]: value }));
  };

  const handleComplete = () => {
    // Filter out empty values
    const filteredEnvVars: Record<string, string> = {};
    Object.entries(envVars).forEach(([key, value]) => {
      if (value.trim()) {
        filteredEnvVars[key] = value;
      }
    });
    onUpdate({ envVars: filteredEnvVars });
    onComplete(filteredEnvVars);
  };

  const copyToClipboard = async (key: string) => {
    await navigator.clipboard.writeText(`${key}=${envVars[key]}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateEnvFileContent = () => {
    const lines = ['# LinkedIn Post Environment Variables', ''];
    Object.entries(envVars).forEach(([key, value]) => {
      if (value.trim()) {
        lines.push(`${key}=${value}`);
      }
    });
    return lines.join('\n');
  };

  return (
    <div className="glass-panel-strong rounded-3xl p-8 shadow-2xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm">Back</span>
      </button>

      <h2 className="font-heading text-2xl font-semibold text-ink mb-2">
        Configure Environment
      </h2>
      <p className="text-muted mb-6">
        Enter your API keys and configuration. These are stored locally and never shared.
      </p>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {ENV_VAR_FIELDS.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-ink mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={visibleKeys.has(field.key) ? 'text' : 'password'}
                  value={envVars[field.key]}
                  onChange={(e) => updateEnvVar(field.key, e.target.value)}
                  placeholder={field.required ? `Required` : `Optional`}
                  className="w-full rounded-xl border border-border bg-white px-4 py-3 pr-10 text-ink placeholder:text-muted/50 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-mono text-sm"
                />
                <button
                  onClick={() => toggleVisibility(field.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {visibleKeys.has(field.key) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {envVars[field.key] && (
                <button
                  onClick={() => copyToClipboard(field.key)}
                  className="flex items-center justify-center rounded-xl border border-border bg-white px-3 py-3 text-muted hover:text-ink"
                  title="Copy line"
                >
                  {copied === field.key ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">{field.description}</p>
          </div>
        ))}
      </div>

      {/* Export section */}
      <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ink">Export as .env file</span>
          <button
            onClick={() => navigator.clipboard.writeText(generateEnvFileContent())}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
          >
            <Copy className="h-3 w-3" />
            Copy all
          </button>
        </div>
        <pre className="text-xs text-muted overflow-x-auto whitespace-pre-wrap font-mono">
          {generateEnvFileContent().slice(0, 200)}
          {generateEnvFileContent().length > 200 && '...'}
        </pre>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="rounded-xl px-6 py-3 font-medium text-muted hover:text-ink transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          Finish Setup
        </button>
      </div>
    </div>
  );
}