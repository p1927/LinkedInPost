import { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, Copy, Check, HelpCircle, ExternalLink } from 'lucide-react';
import type { SetupConfig } from './SetupWizard';

interface EnvVarsStepProps {
  config: SetupConfig;
  onUpdate: (updates: Partial<SetupConfig>) => void;
  onComplete: (envVars: Record<string, string>) => void;
  onBack: () => void;
}

interface EnvVarField {
  key: string;
  label: string;
  description: string;
  required: boolean;
  helpConfig?: {
    steps: string[];
    links: { label: string; url: string }[];
  };
}

// Common environment variables needed
const ENV_VAR_FIELDS: EnvVarField[] = [
  {
    key: 'VITE_GOOGLE_CLIENT_ID',
    label: 'Google Client ID',
    description: 'For OAuth login',
    required: true,
    helpConfig: {
      steps: [
        'Go to console.cloud.google.com',
        'Create or select a project',
        'Navigate to APIs & Services → Credentials',
        'Click Create Credentials → OAuth 2.0 Client ID',
        'Set Application type to "Web application"',
        'Add your app\'s domain to Authorized JavaScript origins',
        'Copy the Client ID shown',
      ],
      links: [{ label: 'Google Cloud Console', url: 'https://console.cloud.google.com' }],
    },
  },
  {
    key: 'VITE_WORKER_URL',
    label: 'Worker URL',
    description: 'Your Cloudflare Worker URL',
    required: true,
  },
  {
    key: 'GEMINI_API_KEY',
    label: 'Gemini API Key',
    description: 'For AI content generation',
    required: false,
    helpConfig: {
      steps: [
        'Go to Google AI Studio',
        'Sign in with your Google account',
        'Click "Get API key" in the top navigation',
        'Click "Create API key"',
        'Copy the generated key',
      ],
      links: [{ label: 'Google AI Studio', url: 'https://aistudio.google.com/apikey' }],
    },
  },
  {
    key: 'XAI_API_KEY',
    label: 'xAI/Grok API Key',
    description: 'For alternative AI generation',
    required: false,
    helpConfig: {
      steps: [
        'Go to console.x.ai',
        'Sign in with your X (Twitter) account',
        'Navigate to API Keys section',
        'Click "Create API Key"',
        'Copy the key shown',
      ],
      links: [{ label: 'xAI Console', url: 'https://console.x.ai' }],
    },
  },
  {
    key: 'OPENROUTER_API_KEY',
    label: 'OpenRouter API Key',
    description: 'For OpenRouter models',
    required: false,
    helpConfig: {
      steps: [
        'Go to openrouter.ai',
        'Sign in or create a free account',
        'Click your avatar → Keys',
        'Click "Create Key"',
        'Copy the generated key',
      ],
      links: [{ label: 'OpenRouter Keys', url: 'https://openrouter.ai/keys' }],
    },
  },
  {
    key: 'MINIMAX_API_KEY',
    label: 'MiniMax API Key',
    description: 'For MiniMax AI models',
    required: false,
    helpConfig: {
      steps: [
        'Go to platform.minimaxi.com',
        'Create an account or sign in',
        'Navigate to the API Keys section',
        'Generate a new key',
        'Copy the key',
      ],
      links: [{ label: 'MiniMax Platform', url: 'https://platform.minimaxi.com' }],
    },
  },
  {
    key: 'CLOUDFLARE_API_TOKEN',
    label: 'Cloudflare API Token',
    description: 'For Worker deployment',
    required: false,
    helpConfig: {
      steps: [
        'Go to dash.cloudflare.com',
        'Click your avatar → Profile',
        'Go to the API Tokens tab',
        'Click "Create Token"',
        'Use the "Edit Cloudflare Workers" template',
        'Copy the token after creation',
      ],
      links: [{ label: 'Cloudflare API Tokens', url: 'https://dash.cloudflare.com/profile/api-tokens' }],
    },
  },
  {
    key: 'SERPAPI_API_KEY',
    label: 'SerpAPI Key',
    description: 'For news research',
    required: false,
    helpConfig: {
      steps: [
        'Go to serpapi.com',
        'Create a free account',
        'Navigate to Dashboard → API Key',
        'Copy your API key',
      ],
      links: [{ label: 'SerpAPI Dashboard', url: 'https://serpapi.com/manage-api-key' }],
    },
  },
  {
    key: 'PIXAZO_API_KEY',
    label: 'Pixazo API Key',
    description: 'For AI image generation',
    required: false,
    helpConfig: {
      steps: [
        'Go to pixazo.ai',
        'Create an account or sign in',
        'Navigate to your API settings or dashboard',
        'Generate and copy your API key',
      ],
      links: [{ label: 'Pixazo', url: 'https://pixazo.ai' }],
    },
  },
  {
    key: 'SEEDANCE_API_KEY',
    label: 'Seedance API Key',
    description: 'For video generation',
    required: false,
    helpConfig: {
      steps: [
        'Go to seedance.ai',
        'Create an account or sign in',
        'Navigate to API or developer settings',
        'Generate and copy your API key',
      ],
      links: [{ label: 'Seedance', url: 'https://seedance.ai' }],
    },
  },
  {
    key: 'TELEGRAM_BOT_TOKEN',
    label: 'Telegram Bot Token',
    description: 'For Telegram notifications',
    required: false,
    helpConfig: {
      steps: [
        'Open Telegram and search for @BotFather',
        'Send /start, then send /newbot',
        'Choose a name and username for your bot',
        'BotFather will send you the bot token',
        'Copy the token from that message',
      ],
      links: [{ label: 'BotFather on Telegram', url: 'https://t.me/BotFather' }],
    },
  },
  {
    key: 'GITHUB_TOKEN_ENCRYPTION_KEY',
    label: 'Encryption Key',
    description: 'For encrypting tokens (32+ chars)',
    required: false,
    helpConfig: {
      steps: [
        'This key is generated locally and never leaves your machine',
        'Open your terminal and run: openssl rand -base64 32',
        'Or generate any random string of 32 or more characters',
        'Paste the output into this field',
      ],
      links: [],
    },
  },
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
  const [helpOpenKeys, setHelpOpenKeys] = useState<Set<string>>(new Set());

  const toggleVisibility = (key: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleKeys(newVisible);
  };

  const toggleHelp = (key: string) => {
    setHelpOpenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
    onUpdate({ envVars: { ...config.envVars, ...filteredEnvVars } });
    onComplete({ ...config.envVars, ...filteredEnvVars });
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
              {field.helpConfig && (
                <button
                  type="button"
                  onClick={() => toggleHelp(field.key)}
                  className={`flex items-center justify-center rounded-xl border px-3 py-3 transition-colors ${
                    helpOpenKeys.has(field.key)
                      ? 'border-violet-400 bg-violet-50 text-violet-600'
                      : 'border-border bg-white text-muted hover:text-violet-600'
                  }`}
                  title="How to get this key"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              )}
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
            {field.helpConfig && helpOpenKeys.has(field.key) && (
              <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-violet-700 mb-2">How to get this key:</p>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    {field.helpConfig.steps.map((step, i) => (
                      <li key={i} className="text-xs text-slate-700 leading-snug">{step}</li>
                    ))}
                  </ol>
                </div>
                {field.helpConfig.links.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.helpConfig.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
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
