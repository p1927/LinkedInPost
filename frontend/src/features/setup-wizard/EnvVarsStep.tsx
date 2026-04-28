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

interface EnvVarGroup {
  title: string;
  fields: EnvVarField[];
}

const ENV_VAR_GROUPS: EnvVarGroup[] = [
  {
    title: 'Core Configuration',
    fields: [
      {
        key: 'VITE_GOOGLE_CLIENT_ID',
        label: 'Google Client ID',
        description: 'For OAuth login (also set as GOOGLE_CLIENT_ID in worker)',
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
        description: 'Your Cloudflare Worker URL (e.g. https://your-worker.workers.dev)',
        required: true,
      },
      {
        key: 'GOOGLE_CLOUD_STORAGE_BUCKET',
        label: 'GCS Bucket Name',
        description: 'Public Google Cloud Storage bucket for generated images',
        required: false,
        helpConfig: {
          steps: [
            'Go to console.cloud.google.com → Cloud Storage',
            'Click "Create Bucket"',
            'Choose a globally unique name',
            'Set access to "Public" (allUsers objectViewer)',
            'Copy the bucket name',
          ],
          links: [{ label: 'Cloud Storage Console', url: 'https://console.cloud.google.com/storage' }],
        },
      },
      {
        key: 'CLOUDFLARE_API_TOKEN',
        label: 'Cloudflare API Token',
        description: 'For Worker deployment via wrangler',
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
    ],
  },
  {
    title: 'AI Language Models',
    fields: [
      {
        key: 'GEMINI_API_KEY',
        label: 'Gemini API Key',
        description: 'Required for all AI content generation',
        required: true,
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
        label: 'xAI / Grok API Key',
        description: 'Optional alternative LLM provider',
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
        description: 'Optional multi-model gateway',
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
        description: 'Optional MiniMax AI models',
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
    ],
  },
  {
    title: 'Image Generation',
    fields: [
      {
        key: 'FAL_API_KEY',
        label: 'Fal.ai API Key',
        description: 'Required for Flux Kontext, Ideogram, Kling, and Seedance providers',
        required: false,
        helpConfig: {
          steps: [
            'Go to fal.ai and create an account',
            'Navigate to your Dashboard → API Keys',
            'Click "Add Key"',
            'Copy the generated key (starts with "fal-")',
          ],
          links: [{ label: 'Fal.ai Dashboard', url: 'https://fal.ai/dashboard/keys' }],
        },
      },
      {
        key: 'PIXAZO_API_KEY',
        label: 'Pixazo API Key',
        description: 'Optional Pixazo SDXL image generation',
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
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key (DALL-E)',
        description: 'Optional, for DALL-E image generation provider',
        required: false,
        helpConfig: {
          steps: [
            'Go to platform.openai.com',
            'Sign in or create an account',
            'Navigate to API Keys',
            'Click "Create new secret key"',
            'Copy the key (shown only once)',
          ],
          links: [{ label: 'OpenAI Platform', url: 'https://platform.openai.com/api-keys' }],
        },
      },
      {
        key: 'STABILITY_API_KEY',
        label: 'Stability AI Key',
        description: 'Optional, for Stable Diffusion provider',
        required: false,
        helpConfig: {
          steps: [
            'Go to platform.stability.ai',
            'Sign in or create an account',
            'Navigate to your Account → API Keys',
            'Create and copy your API key',
          ],
          links: [{ label: 'Stability AI Platform', url: 'https://platform.stability.ai/account/keys' }],
        },
      },
      {
        key: 'RUNWAY_API_KEY',
        label: 'Runway API Key',
        description: 'Optional, for Runway video/image generation',
        required: false,
        helpConfig: {
          steps: [
            'Go to app.runwayml.com',
            'Sign in or create an account',
            'Navigate to Settings → API',
            'Generate and copy your API key',
          ],
          links: [{ label: 'Runway Settings', url: 'https://app.runwayml.com/settings' }],
        },
      },
    ],
  },
  {
    title: 'News & Research',
    fields: [
      {
        key: 'SERPAPI_API_KEY',
        label: 'SerpAPI Key',
        description: 'For web research and image search',
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
        key: 'NEWSAPI_KEY',
        label: 'NewsAPI Key',
        description: 'Optional news research provider',
        required: false,
        helpConfig: {
          steps: [
            'Go to newsapi.org',
            'Click "Get API Key"',
            'Create a free account',
            'Copy your API key from the dashboard',
          ],
          links: [{ label: 'NewsAPI', url: 'https://newsapi.org/account' }],
        },
      },
      {
        key: 'GNEWS_API_KEY',
        label: 'GNews API Key',
        description: 'Optional news research provider',
        required: false,
        helpConfig: {
          steps: [
            'Go to gnews.io',
            'Create a free account',
            'Copy your API key from the dashboard',
          ],
          links: [{ label: 'GNews Dashboard', url: 'https://gnews.io/dashboard' }],
        },
      },
      {
        key: 'NEWSDATA_API_KEY',
        label: 'NewsData.io Key',
        description: 'Optional news research provider',
        required: false,
        helpConfig: {
          steps: [
            'Go to newsdata.io',
            'Create an account',
            'Navigate to API Key section',
            'Copy your key (starts with "pub_")',
          ],
          links: [{ label: 'NewsData.io', url: 'https://newsdata.io/api-key' }],
        },
      },
    ],
  },
  {
    title: 'Security & Infrastructure',
    fields: [
      {
        key: 'WORKER_SCHEDULER_SECRET',
        label: 'Worker Scheduler Secret',
        description: 'Required for scheduled publishing (Durable Object alarm auth)',
        required: false,
        helpConfig: {
          steps: [
            'Open your terminal',
            'Run: openssl rand -base64 32',
            'Copy the output',
            'Use the same value in GitHub Actions secret WORKER_SCHEDULER_SECRET',
          ],
          links: [],
        },
      },
      {
        key: 'GITHUB_TOKEN_ENCRYPTION_KEY',
        label: 'Encryption Key',
        description: 'Required for encrypting OAuth tokens in D1 (32+ chars)',
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
      {
        key: 'GENERATION_WORKER_SECRET',
        label: 'Generation Worker Secret',
        description: 'Shared secret between main Worker and generation Worker',
        required: false,
        helpConfig: {
          steps: [
            'Run: openssl rand -base64 32',
            'Copy the output',
            'This value will be written as GENERATION_WORKER_SECRET in worker/.dev.vars',
            'And as WORKER_SHARED_SECRET in generation-worker/.dev.vars',
          ],
          links: [],
        },
      },
      {
        key: 'TELEGRAM_BOT_TOKEN',
        label: 'Telegram Bot Token',
        description: 'For Telegram notifications and delivery',
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
    ],
  },
];

// Flat list for state management
const ALL_FIELDS = ENV_VAR_GROUPS.flatMap(g => g.fields);

export function EnvVarsStep({ config, onUpdate, onComplete, onBack }: EnvVarsStepProps) {
  const [envVars, setEnvVars] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    ALL_FIELDS.forEach(field => {
      initial[field.key] = config.envVars[field.key] || '';
    });
    return initial;
  });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [helpOpenKeys, setHelpOpenKeys] = useState<Set<string>>(new Set());

  const toggleVisibility = (key: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleHelp = (key: string) => {
    setHelpOpenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const updateEnvVar = (key: string, value: string) => {
    setEnvVars(prev => ({ ...prev, [key]: value }));
  };

  const handleComplete = () => {
    const filteredEnvVars: Record<string, string> = {};
    Object.entries(envVars).forEach(([key, value]) => {
      if (value.trim()) filteredEnvVars[key] = value;
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
      if (value.trim()) lines.push(`${key}=${value}`);
    });
    return lines.join('\n');
  };

  const filledCount = Object.values(envVars).filter(v => v.trim()).length;
  const requiredFields = ALL_FIELDS.filter(f => f.required);
  const requiredFilled = requiredFields.filter(f => envVars[f.key]?.trim()).length;

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
      <p className="text-muted mb-2">
        Enter your API keys and configuration. These are stored locally and never shared.
      </p>
      <p className="text-xs text-muted mb-6">
        {requiredFilled}/{requiredFields.length} required fields filled · {filledCount} total filled
      </p>

      <div className="space-y-8 max-h-[500px] overflow-y-auto pr-2">
        {ENV_VAR_GROUPS.map(group => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-ink/70 border-b border-border pb-1.5 mb-3">
              {group.title}
            </h3>
            <div className="space-y-4">
              {group.fields.map(field => (
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
                        placeholder={field.required ? 'Required' : 'Optional'}
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
        <pre className="text-xs text-muted overflow-x-auto whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
          {generateEnvFileContent() || '# No values entered yet'}
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
