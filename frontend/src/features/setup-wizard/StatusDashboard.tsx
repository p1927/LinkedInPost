import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Key,
  Link2,
  Server,
  Database,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Zap,
  Globe,
  Cloud,
  Shield,
} from 'lucide-react';
import type { SetupState } from './types';

interface StatusDashboardProps {
  state: SetupState;
  onContinue: (step: 'envVars' | 'integrations' | 'final') => void;
  onResetDb?: () => void;
  onClearCache?: () => void;
  onRegenerateFeatures?: () => void;
}

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  variant?: 'default' | 'danger' | 'success';
}

function QuickAction({ icon, title, description, action, variant = 'default' }: QuickActionProps) {
  const baseClasses = "group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer";
  const variantClasses = {
    default: "bg-card hover:bg-accent/50 border-border hover:border-primary/30",
    danger: "bg-red-500/5 hover:bg-red-500/10 border-red-500/20 hover:border-red-500/40",
    success: "bg-green-500/5 hover:bg-green-500/10 border-green-500/20 hover:border-green-500/40",
  };

  return (
    <motion.button
      onClick={action}
      className={`${baseClasses} ${variantClasses[variant]} w-full text-left`}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`p-2 rounded-lg ${
        variant === 'danger' ? 'bg-red-500/10 text-red-500' :
        variant === 'success' ? 'bg-green-500/10 text-green-500' :
        'bg-primary/10 text-primary'
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </motion.button>
  );
}

interface StatusCardProps {
  title: string;
  icon: React.ReactNode;
  items: { name: string; status: 'ok' | 'error' | 'warning'; detail?: string }[];
  onAction?: () => void;
  actionLabel?: string;
}

function StatusCard({ title, icon, items, onAction, actionLabel }: StatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const okCount = items.filter(i => i.status === 'ok').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-muted-foreground">
              {okCount} configured, {errorCount} missing
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-accent/30">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    {item.detail && <div className="text-xs text-muted-foreground">{item.detail}</div>}
                  </div>
                  {item.status === 'ok' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : item.status === 'error' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              ))}
            </div>
            {onAction && actionLabel && (
              <div className="px-4 pb-4">
                <button
                  onClick={(e) => { e.stopPropagation(); onAction(); }}
                  className="w-full py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  {actionLabel}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StatusDashboard({ state, onContinue, onResetDb, onClearCache }: StatusDashboardProps) {
  const { envVars, integrations, workers, overallProgress } = state;

  const requiredVars = envVars.filter(v => v.isRequired);
  const missingRequired = requiredVars.filter(v => !v.isSet);

  const envVarItems = requiredVars.map(v => ({
    name: v.name,
    status: v.isSet ? 'ok' as const : 'error' as const,
    detail: v.isSet ? 'Configured' : v.description,
  }));

  const integrationItems = integrations.map(i => ({
    name: i.name,
    status: i.connected ? 'ok' as const : 'error' as const,
    detail: i.connected ? 'Connected' : 'Not connected',
  }));

  const workerItems = workers.map(w => ({
    name: w.name,
    status: w.deployed ? 'ok' as const : 'warning' as const,
    detail: w.deployed ? (w.url || 'Deployed') : 'Not deployed',
  }));

  const isFullySetup = missingRequired.length === 0 && integrations.every(i => i.connected);

  return (
    <div className="space-y-6">
      {/* Hero Progress */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-violet-500/20 to-amber-500/20 rounded-3xl blur-xl" />
        <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl border p-8">
          <div className="flex items-center gap-8">
            {/* Animated Progress Ring */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-accent"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#progress-gradient)"
                  strokeWidth="6"
                  strokeDasharray={`${overallProgress * 2.64} 264`}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 264" }}
                  animate={{ strokeDasharray: `${overallProgress * 2.64} 264` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--violet-500)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-3xl font-bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {overallProgress}%
                </motion.span>
              </div>
            </div>

            {/* Status Text */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isFullySetup ? (
                  <>
                    <Sparkles className="h-5 w-5 text-green-500" />
                    <h2 className="text-xl font-bold">Setup Complete</h2>
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 text-amber-500" />
                    <h2 className="text-xl font-bold">Almost Ready</h2>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {isFullySetup
                  ? 'Your LinkedIn Post is configured and ready to go.'
                  : `${missingRequired.length} items need attention to get started.`}
              </p>

              {/* Quick Stats */}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${requiredVars.every(v => v.isSet) ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {requiredVars.filter(v => v.isSet).length}/{requiredVars.length} env vars
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${integrations.every(i => i.connected) ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-xs text-muted-foreground">
                    {integrations.filter(i => i.connected).length}/{integrations.length} integrations
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="space-y-3">
        <StatusCard
          title="Environment Variables"
          icon={<Key className="h-5 w-5" />}
          items={envVarItems}
          onAction={() => onContinue('envVars')}
          actionLabel="Configure Variables"
        />

        <StatusCard
          title="Integrations"
          icon={<Link2 className="h-5 w-5" />}
          items={integrationItems}
          onAction={() => onContinue('integrations')}
          actionLabel="Manage Integrations"
        />

        <StatusCard
          title="Workers"
          icon={<Server className="h-5 w-5" />}
          items={workerItems}
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">Quick Actions</h3>

        <QuickAction
          icon={<Database className="h-5 w-5" />}
          title="Reset Database"
          description="Clear all drafts and posts from D1"
          action={onResetDb || (() => {})}
          variant="danger"
        />

        <QuickAction
          icon={<Trash2 className="h-5 w-5" />}
          title="Clear Cache"
          description="Remove build caches and temporary files"
          action={onClearCache || (() => {})}
          variant="default"
        />

        <QuickAction
          icon={<RefreshCw className="h-5 w-5" />}
          title="Regenerate Features"
          description="Rebuild feature flags from features.yaml"
          action={onRegenerateFeatures || (() => {})}
          variant="default"
        />
      </div>

      {/* Launch App */}
      {isFullySetup && (
        <motion.button
          onClick={() => onContinue('final')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary via-violet-500 to-amber-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="flex items-center justify-center gap-2">
            <Globe className="h-5 w-5" />
            Launch Application
          </span>
        </motion.button>
      )}
    </div>
  );
}
