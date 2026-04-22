import { Link2, Camera, Mail, Send, MessageCircle, Check } from 'lucide-react';
import type { SetupConfig } from './SetupWizard';

interface IntegrationStepProps {
  config: SetupConfig;
  onUpdate: (updates: Partial<SetupConfig>) => void;
  onComplete: (integrations: SetupConfig['integrations']) => void;
  onSkip: () => void;
}

const SOCIAL_INTEGRATIONS = [
  { id: 'linkedin' as const, name: 'LinkedIn', description: 'Publish directly to LinkedIn', icon: Link2, color: 'bg-blue-600' },
  { id: 'instagram' as const, name: 'Instagram', description: 'Share images and posts', icon: Camera, color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
  { id: 'gmail' as const, name: 'Gmail', description: 'Send posts via email', icon: Mail, color: 'bg-red-500' },
  { id: 'telegram' as const, name: 'Telegram', description: 'Telegram bot notifications', icon: Send, color: 'bg-blue-500' },
  { id: 'whatsapp' as const, name: 'WhatsApp', description: 'WhatsApp messages', icon: MessageCircle, color: 'bg-green-500' },
] as const;

export function IntegrationStep({ config, onUpdate, onComplete, onSkip }: IntegrationStepProps) {
  const toggleIntegration = (id: keyof SetupConfig['integrations']) => {
    onUpdate({ integrations: { ...config.integrations, [id]: !config.integrations[id] } });
  };

  return (
    <div className="glass-panel-strong rounded-3xl p-6 shadow-2xl">
      <h2 className="font-heading text-xl font-semibold text-ink mb-1">
        Connect Accounts
      </h2>
      <p className="text-sm text-muted mb-5">
        Choose services to integrate. You can skip this step.
      </p>

      <div className="space-y-2">
        {SOCIAL_INTEGRATIONS.map(integration => {
          const Icon = integration.icon;
          const isSelected = config.integrations[integration.id];

          return (
            <button
              key={integration.id}
              onClick={() => toggleIntegration(integration.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                isSelected ? 'border-violet-500 bg-violet-50/50' : 'border-border bg-white hover:border-violet-200'
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${integration.color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-sm text-ink">{integration.name}</div>
                <div className="text-xs text-muted">{integration.description}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'bg-violet-600 border-violet-600' : 'border-muted'
              }`}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={onSkip} className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted hover:text-ink">
          Skip
        </button>
        <button onClick={() => onComplete(config.integrations)} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
          Continue
        </button>
      </div>
    </div>
  );
}
