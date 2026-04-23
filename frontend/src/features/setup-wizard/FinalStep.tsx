import { motion } from 'framer-motion';
import { Rocket, RotateCcw, ExternalLink } from 'lucide-react';
import type { SetupConfig } from './SetupWizard';

interface FinalStepProps {
  config: SetupConfig;
  onRestart: () => void;
}

export function FinalStep({ config, onRestart }: FinalStepProps) {
  const hasIntegrations = Object.values(config.integrations).some(v => v);
  const hasEnvVars = Object.keys(config.envVars).length > 0;

  const nextSteps = [
    {
      title: 'Start the development server',
      command: 'cd frontend && npm run dev',
      description: 'Run the frontend locally',
    },
    {
      title: 'Deploy to Cloudflare',
      command: 'python3 setup/setup.py --cloudflare --deploy-worker',
      description: 'Deploy workers to Cloudflare',
    },
    {
      title: 'View documentation',
      link: '/docs',
      description: 'Learn more about the features',
    },
  ];

  return (
    <div className="glass-panel-strong rounded-3xl p-8 shadow-2xl text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-500 shadow-lg"
      >
        <Rocket className="h-10 w-10 text-white" />
      </motion.div>

      <h2 className="font-heading text-2xl font-semibold text-ink mb-2">
        You're all set!
      </h2>
      <p className="text-muted mb-8">
        LinkedIn Post is ready to use. Here's what to do next.
      </p>

      {/* STT status */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted">Speech-to-text</span>
        <span className={[
          'text-sm font-medium',
          config.speechToText?.enabled ? 'text-emerald-600' : 'text-gray-400',
        ].join(' ')}>
          {config.speechToText?.enabled
            ? `Enabled (${config.speechToText.model})`
            : 'Disabled'}
        </span>
      </div>

      {/* Setup summary */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {hasIntegrations && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            {Object.entries(config.integrations).filter(([, v]) => v).length} integrations connected
          </span>
        )}
        {hasEnvVars && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
            {Object.keys(config.envVars).length} env vars configured
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
          {config.projectDir || 'Local'} directory
        </span>
      </div>

      {/* Next steps */}
      <div className="space-y-3 text-left">
        <h3 className="text-sm font-semibold text-ink uppercase tracking-wide">Next Steps</h3>
        {nextSteps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between rounded-xl border border-border bg-white p-4"
          >
            <div>
              <h4 className="font-medium text-ink">{step.title}</h4>
              <p className="text-sm text-muted">{step.description}</p>
            </div>
            {step.command && (
              <code className="rounded-lg bg-muted/50 px-3 py-1 text-sm font-mono text-muted">
                {step.command}
              </code>
            )}
            {step.link && (
              <ExternalLink className="h-4 w-4 text-muted" />
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-medium text-muted hover:text-ink transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Start Over
        </button>
        <button
          onClick={() => window.open('http://localhost:5173', '_blank')}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 transition-colors"
        >
          Open App
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}