import { useState } from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Instagram, Mail, Send, MessageCircle } from 'lucide-react';
import type { SetupConfig } from './SetupWizard';

interface IntegrationStepProps {
  config: SetupConfig;
  onUpdate: (updates: Partial<SetupConfig>) => void;
  onComplete: (integrations: SetupConfig['integrations']) => void;
  onSkip: () => void;
}

const SOCIAL_INTEGRATIONS = [
  {
    id: 'linkedin' as const,
    name: 'LinkedIn',
    description: 'Publish posts directly to LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-600',
  },
  {
    id: 'instagram' as const,
    name: 'Instagram',
    description: 'Share images and posts on Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-br from-purple-600 to-pink-500',
  },
  {
    id: 'gmail' as const,
    name: 'Gmail',
    description: 'Send posts via email',
    icon: Mail,
    color: 'bg-red-500',
  },
  {
    id: 'telegram' as const,
    name: 'Telegram',
    description: 'Send messages via Telegram bot',
    icon: Send,
    color: 'bg-blue-500',
  },
  {
    id: 'whatsapp' as const,
    name: 'WhatsApp',
    description: 'Send messages via WhatsApp',
    icon: MessageCircle,
    color: 'bg-green-500',
  },
] as const;

const IMAGE_GENERATION_PROVIDERS = [
  { id: 'pixazo' as const, name: 'Pixazo', description: 'AI image generation' },
  { id: 'gemini' as const, name: 'Gemini', description: 'Google AI image generation' },
  { id: 'seedance' as const, name: 'Seedance', description: 'Video generation' },
] as const;

export function IntegrationStep({ config, onUpdate, onComplete, onSkip }: IntegrationStepProps) {
  const [activeTab, setActiveTab] = useState<'social' | 'image' | 'video'>('social');

  const toggleIntegration = (id: keyof SetupConfig['integrations']) => {
    const newIntegrations = {
      ...config.integrations,
      [id]: !config.integrations[id],
    };
    onUpdate({ integrations: newIntegrations });
  };

  const toggleImageProvider = (id: keyof SetupConfig['imageGeneration']) => {
    const newImageGen = {
      ...config.imageGeneration,
      [id]: !config.imageGeneration[id],
    };
    onUpdate({ imageGeneration: newImageGen });
  };

  const hasAnySelection = Object.values(config.integrations).some(v => v) ||
    Object.values(config.imageGeneration).some(v => v);

  return (
    <div className="glass-panel-strong rounded-3xl p-8 shadow-2xl">
      <h2 className="font-heading text-2xl font-semibold text-ink mb-2">
        Connect Your Accounts
      </h2>
      <p className="text-muted mb-6">
        Choose which services you want to integrate with. You can skip this step.
      </p>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'social' as const, label: 'Social Media' },
          { id: 'image' as const, label: 'Image Generation' },
          { id: 'video' as const, label: 'Video Generation' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white'
                : 'bg-muted/50 text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Social integrations */}
      {activeTab === 'social' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {SOCIAL_INTEGRATIONS.map(integration => {
            const Icon = integration.icon;
            const isSelected = config.integrations[integration.id];

            return (
              <motion.div
                key={integration.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleIntegration(integration.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50/50'
                    : 'border-border bg-white hover:border-violet-200'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${integration.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-ink">{integration.name}</h3>
                  <p className="text-sm text-muted">{integration.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'bg-violet-600 border-violet-600' : 'border-muted'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Image generation */}
      {activeTab === 'image' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {IMAGE_GENERATION_PROVIDERS.map(provider => {
            const isSelected = config.imageGeneration[provider.id as keyof typeof config.imageGeneration];

            return (
              <motion.div
                key={provider.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggleImageProvider(provider.id as keyof SetupConfig['imageGeneration'])}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50/50'
                    : 'border-border bg-white hover:border-violet-200'
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                  <span className="text-lg font-bold text-white">{provider.name[0]}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-ink">{provider.name}</h3>
                  <p className="text-sm text-muted">{provider.description}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'bg-violet-600 border-violet-600' : 'border-muted'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Video generation */}
      {activeTab === 'video' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="text-center py-12 text-muted">
            <p className="text-lg mb-2">Video generation coming soon</p>
            <p className="text-sm">This feature is currently under development.</p>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onSkip}
          className="rounded-xl px-6 py-3 font-medium text-muted hover:text-ink transition-colors"
        >
          Skip this step
        </button>
        <button
          onClick={() => onComplete(config.integrations)}
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}