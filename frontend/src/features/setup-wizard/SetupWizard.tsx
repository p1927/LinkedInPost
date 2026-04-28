import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DirectorySelector } from './DirectorySelector';
import { SetupProgress } from './SetupProgress';
import { IntegrationStep } from './IntegrationStep';
import { EnvVarsStep } from './EnvVarsStep';
import { FinalStep } from './FinalStep';
import { StatusDashboard } from './StatusDashboard';
import { setupService } from './setupService';
import { SetupStateService } from './setupStateService';
import { TrendingApiStep } from './TrendingApiStep';
import { ImageGenStep } from './ImageGenStep';
import { SpeechToTextStep } from './SpeechToTextStep';
import type { SetupState } from './types';

export type SetupStep = 'deploymentMode' | 'status' | 'welcome' | 'directory' | 'progress' | 'integrations' | 'trending' | 'imagegen' | 'stt' | 'envvars' | 'final';

export type YouTubeAdapterType = 'youtube-official' | 'apify-youtube';
export type InstagramAdapterType = 'instagram-official' | 'sociavault';
export type LinkedInAdapterType = 'linkedin-official' | 'apify-linkedin' | 'sociavault' | 'phantombuster';
export type NewsAdapterType = 'newsdata' | 'guardian' | 'gnews';

// Dry run mode: enabled for setup wizard (port 3456), disabled for main app
const isSetupWizard = typeof window !== 'undefined' && window.location.port === '3456';

export interface SetupConfig {
  projectDir: string;
  deploymentMode: 'saas' | 'selfHosted';
  integrations: {
    linkedin: boolean;
    instagram: boolean;
    gmail: boolean;
    telegram: boolean;
    whatsapp: boolean;
  };
  imageGeneration: {
    pixazo: boolean;
    gemini: boolean;
    seedance: boolean;
  };
  videoGeneration: {
    enabled: boolean;
    provider: string;
  };
  trendingApis: {
    youtube: { adapter: YouTubeAdapterType };
    instagram: { adapter: InstagramAdapterType };
    linkedin: { adapter: LinkedInAdapterType };
    news: { adapter: NewsAdapterType };
  };
  speechToText: {
    enabled: boolean;
    model: 'base.en' | 'small.en';
    shortcut: string;
  };
  envVars: Record<string, string>;
}

/**
 * All wizard steps in order, shown in the vertical sidebar.
 * The status step is a dynamic shortcut and is excluded from linear flow.
 */
const LINEAR_STEPS: SetupStep[] = [
  'deploymentMode',
  'welcome',
  'directory',
  'progress',
  'integrations',
  'trending',
  'imagegen',
  'stt',
  'envvars',
  'final',
];

/** Human-readable label per step, used in the sidebar and the progress bar. */
const STEP_LABEL: Record<SetupStep, string> = {
  deploymentMode: 'Deployment Mode',
  status: 'Status',
  welcome: 'Welcome',
  directory: 'Directory',
  progress: 'Install Progress',
  integrations: 'Integrations',
  trending: 'Trending Sources',
  imagegen: 'Image Generation',
  stt: 'Voice Transcription',
  envvars: 'Environment Keys',
  final: 'Complete',
};

function WizardSidebar({ currentStep }: { currentStep: SetupStep }) {
  const total = LINEAR_STEPS.length;
  const idx = LINEAR_STEPS.indexOf(currentStep);
  // For 'status' step (not in LINEAR_STEPS), treat as before deploymentMode
  const stepNumber = idx >= 0 ? idx + 1 : 0;
  const percent = idx >= 0 ? Math.round((stepNumber / total) * 100) : 0;
  return (
    <aside
      aria-label="Setup wizard progress"
      className="sticky top-6 self-start rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm"
    >
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-wider text-muted">Setup</p>
        <p className="text-sm font-semibold text-ink">
          {stepNumber > 0 ? `Step ${stepNumber} of ${total}` : 'Setup Status'}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-700 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <ol className="space-y-1">
        {LINEAR_STEPS.map((s, i) => {
          const isCurrent = s === currentStep;
          const isDone = idx >= 0 ? i < idx : false;
          const dotClass = isCurrent
            ? 'bg-violet-600 text-white'
            : isDone
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-400';
          const rowClass = isCurrent
            ? 'bg-violet-100/70 text-violet-700 font-bold'
            : isDone
              ? 'text-emerald-700'
              : 'text-slate-500';
          return (
            <li
              key={s}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${rowClass}`}
            >
              <span
                aria-hidden
                className={`inline-grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${dotClass}`}
              >
                {isDone ? '✓' : isCurrent ? '●' : i + 1}
              </span>
              <span>{STEP_LABEL[s]}</span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

const DEFAULT_CONFIG: SetupConfig = {
  projectDir: '',
  deploymentMode: 'saas',
  integrations: {
    linkedin: false,
    instagram: false,
    gmail: false,
    telegram: false,
    whatsapp: false,
  },
  imageGeneration: {
    pixazo: false,
    gemini: false,
    seedance: false,
  },
  videoGeneration: {
    enabled: false,
    provider: '',
  },
  trendingApis: {
    youtube: { adapter: 'youtube-official' as YouTubeAdapterType },
    instagram: { adapter: 'instagram-official' as InstagramAdapterType },
    linkedin: { adapter: 'linkedin-official' as LinkedInAdapterType },
    news: { adapter: 'newsdata' as NewsAdapterType },
  },
  speechToText: {
    enabled: false,
    model: 'base.en' as const,
    shortcut: 'Mod+Shift+M',
  },
  envVars: {},
};

export function SetupWizard({ embedded = false }: { embedded?: boolean }) {
  const [step, setStep] = useState<SetupStep>('deploymentMode');
  const [config, setConfig] = useState<SetupConfig>(DEFAULT_CONFIG);
  const [progressLogs, setProgressLogs] = useState<{ message: string; status: 'pending' | 'running' | 'done' | 'error' }[]>([]);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);
  const [setupState, setSetupState] = useState<SetupState | null>(null);
  const [isDetectingState, setIsDetectingState] = useState(true);

  // Detect existing setup state on mount
  useEffect(() => {
    // Enable dry run for setup wizard to prevent accidental destructive actions
    if (isSetupWizard) {
      setupService.setDryRun(true);
    }

    const detectState = async () => {
      try {
        // Auto-detect project directory via the setup server's filesystem API
        let projectDir = '';
        try {
          const res = await fetch('http://localhost:3456/api/setup/project-path');
          if (res.ok) {
            const data = await res.json();
            projectDir = data.projectDir || '';
          }
        } catch {
          // Setup server not running — skip detection
        }

        if (!projectDir) {
          setIsDetectingState(false);
          return;
        }

        const stateService = new SetupStateService(projectDir);
        const state = await stateService.readState();
        setSetupState(state);
        updateConfig({ projectDir });

        // If setup is partially complete, show status dashboard first
        if (state.overallProgress > 0) {
          setStep('status');
        }
      } catch (error) {
        console.warn('Failed to detect setup state:', error);
      } finally {
        setIsDetectingState(false);
      }
    };

    detectState();
  }, []);

  const updateConfig = useCallback((updates: Partial<SetupConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const addLog = useCallback((message: string, status: 'pending' | 'running' | 'done' | 'error' = 'pending') => {
    setProgressLogs(prev => [...prev, { message, status }]);
  }, []);

  const updateLog = useCallback((index: number, status: 'pending' | 'running' | 'done' | 'error', message?: string) => {
    setProgressLogs(prev => prev.map((log, i) =>
      i === index ? { ...log, status, ...(message ? { message } : {}) } : log
    ));
  }, []);

  const startSetup = useCallback(async () => {
    setStep('progress');

    // Define setup steps
    const setupSteps = [
      { name: 'Installing frontend dependencies', cmd: 'npm install', cwd: config.projectDir },
      { name: 'Installing worker dependencies', cmd: 'npm install', cwd: `${config.projectDir}/worker` },
      { name: 'Installing generation-worker dependencies', cmd: 'npm install', cwd: `${config.projectDir}/generation-worker` },
      { name: 'Generating feature flags', cmd: 'python3 scripts/generate_features.py', cwd: config.projectDir },
      { name: 'Verifying environment', cmd: null, check: 'env' },
    ];

    // Initialize progress logs
    const initialLogs = setupSteps.map(step => ({ message: step.name, status: 'pending' as const }));
    setProgressLogs(initialLogs);
    setCurrentProgressIndex(0);

    // Run setup steps
    for (let i = 0; i < setupSteps.length; i++) {
      setCurrentProgressIndex(i);
      updateLog(i, 'running');

      try {
        if (setupSteps[i].check === 'env') {
          // Environment check step
          await setupService.verifyEnv(config.envVars);
          updateLog(i, 'done');
        } else if (setupSteps[i].cmd) {
          // Command execution step
          await setupService.runCommand(setupSteps[i].cmd!, setupSteps[i].cwd!);
          updateLog(i, 'done');
        }
      } catch (error) {
        updateLog(i, 'error', `Failed: ${error instanceof Error ? error.message : String(error)}`);
        // Continue to next step but log the error
      }
    }

    // Move to integrations step
    setStep('integrations');
  }, [config, addLog, updateLog, setCurrentProgressIndex]);

  const handleIntegrationsComplete = useCallback(async (integrations: SetupConfig['integrations']) => {
    updateConfig({ integrations });
    // Refresh state after completing integrations
    if (config.projectDir) {
      const stateService = new SetupStateService(config.projectDir);
      const state = await stateService.readState();
      setSetupState(state);
    }
    setStep('trending');
  }, [updateConfig, config.projectDir]);

  const handleTrendingComplete = useCallback(async (trendingApis: SetupConfig['trendingApis']) => {
    updateConfig({ trendingApis });
    setStep('imagegen');
  }, [updateConfig]);

  const handleImageGenComplete = useCallback(async (envVars: Record<string, string>) => {
    updateConfig({ envVars });
    setStep('stt');
  }, [updateConfig]);

  const handleSttComplete = useCallback((speechToText: SetupConfig['speechToText']) => {
    updateConfig({ speechToText });
    setStep('envvars');
  }, [updateConfig]);

  const handleEnvVarsComplete = useCallback(async (envVars: Record<string, string>) => {
    updateConfig({ envVars });
    // Refresh state after completing env vars
    if (config.projectDir) {
      const stateService = new SetupStateService(config.projectDir);
      const state = await stateService.readState();
      setSetupState(state);
    }
    setStep('final');
  }, [updateConfig, config.projectDir]);

  const handleRestart = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setProgressLogs([]);
    setStep('deploymentMode');
  }, []);

  const handleStatusContinue = useCallback((targetStep: 'envVars' | 'integrations' | 'final') => {
    if (targetStep === 'envVars') {
      setStep('envvars');
    } else if (targetStep === 'integrations') {
      setStep('integrations');
    } else {
      setStep('final');
    }
  }, []);

  const handleResetDb = useCallback(async () => {
    if (!config.projectDir) return;
    if (setupService.isDryRun()) {
      console.log('[SetupWizard] handleResetDb: dry run - simulating success');
      return;
    }
    try {
      await setupService.resetDatabase(config.projectDir);
      // Refresh state
      const stateService = new SetupStateService(config.projectDir);
      const state = await stateService.readState();
      setSetupState(state);
    } catch (error) {
      console.warn('Failed to reset database:', error);
    }
  }, [config.projectDir]);

  const handleClearCache = useCallback(async () => {
    if (!config.projectDir) return;
    if (setupService.isDryRun()) {
      console.log('[SetupWizard] handleClearCache: dry run - simulating success');
      return;
    }
    try {
      await setupService.clearCache(config.projectDir);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }, [config.projectDir]);

  const handleRegenerateFeatures = useCallback(async () => {
    if (!config.projectDir) return;
    if (setupService.isDryRun()) {
      console.log('[SetupWizard] handleRegenerateFeatures: dry run - simulating success');
      return;
    }
    try {
      await setupService.regenerateFeatures(config.projectDir);
    } catch (error) {
      console.warn('Failed to regenerate features:', error);
    }
  }, [config.projectDir]);

  const showSidebar = !embedded;
  const outerClass = embedded
    ? 'w-full mx-auto py-6 px-4'
    : 'min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 flex items-start justify-center p-4 sm:p-8';
  const innerClass = embedded
    ? 'w-full'
    : 'w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6';
  return (
    <div className={outerClass}>
      <div className={innerClass}>
        {showSidebar && (
          <div className="md:col-span-3">
            <WizardSidebar currentStep={step} />
          </div>
        )}
        <div className={showSidebar ? 'md:col-span-9' : ''}>
        <AnimatePresence mode="wait">
          {isDetectingState && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
              <p className="mt-4 text-muted">Detecting setup state...</p>
            </motion.div>
          )}

          {!isDetectingState && step === 'deploymentMode' && (
            <motion.div
              key="deploymentMode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold">How will you use this?</h2>
                  <p className="text-muted-foreground text-sm mt-1">Choose your deployment mode. You can change this later.</p>
                </div>
                <div className="space-y-3">
                  {(['saas', 'selfHosted'] as const).map(mode => (
                    <label
                      key={mode}
                      className={`flex gap-4 border rounded-xl p-4 cursor-pointer transition-colors ${
                        config.deploymentMode === mode ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deploymentMode"
                        value={mode}
                        checked={config.deploymentMode === mode}
                        onChange={() => setConfig(c => ({ ...c, deploymentMode: mode }))}
                        className="mt-1 accent-primary"
                      />
                      <div>
                        <p className="font-medium">{mode === 'saas' ? 'Hosted / SaaS' : 'Self-Hosted'}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {mode === 'saas'
                            ? 'You host this for multiple users. Invite-only access, per-user token budgets, admin panel.'
                            : 'Just you or your team. Direct login, no waitlist, no token limits. You bring your own API keys.'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    if (config.projectDir) {
                      await fetch('http://localhost:3456/api/setup/deployment-mode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectDir: config.projectDir, mode: config.deploymentMode }),
                      }).catch(() => {});
                    }
                    setStep('welcome');
                  }}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {!isDetectingState && step === 'status' && setupState && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StatusDashboard
                state={setupState}
                onContinue={handleStatusContinue}
                onResetDb={handleResetDb}
                onClearCache={handleClearCache}
                onRegenerateFeatures={handleRegenerateFeatures}
              />
            </motion.div>
          )}

          {!isDetectingState && step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mb-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-xl">
                  <span className="font-heading text-3xl font-bold text-white">CB</span>
                </div>
              </div>
              <h1 className="font-heading text-4xl font-bold text-ink mb-3">
                Welcome to LinkedIn Post
              </h1>
              <p className="text-lg text-muted mb-8">
                Your automated content pipeline for LinkedIn, Instagram, and more.
              </p>
              <button
                onClick={() => setStep('directory')}
                className="rounded-2xl bg-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-violet-700 transition-colors"
              >
                Get Started
              </button>
            </motion.div>
          )}

          {step === 'directory' && (
            <motion.div
              key="directory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DirectorySelector
                onSelect={(dir) => {
                  updateConfig({ projectDir: dir });
                }}
                onBack={() => setStep('welcome')}
                onNext={() => startSetup()}
              />
            </motion.div>
          )}

          {step === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SetupProgress
                title="Setting up your environment"
                logs={progressLogs}
                currentIndex={currentProgressIndex}
              />
            </motion.div>
          )}

          {step === 'integrations' && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <IntegrationStep
                config={config}
                onUpdate={updateConfig}
                onComplete={handleIntegrationsComplete}
                onSkip={() => handleIntegrationsComplete(DEFAULT_CONFIG.integrations)}
                onBack={() => setStep('progress')}
              />
            </motion.div>
          )}

          {step === 'trending' && (
            <motion.div
              key="trending"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TrendingApiStep
                config={config}
                onUpdate={updateConfig}
                onComplete={handleTrendingComplete}
                onSkip={() => setStep('imagegen')}
                onBack={() => setStep('integrations')}
              />
            </motion.div>
          )}

          {step === 'imagegen' && (
            <motion.div
              key="imagegen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ImageGenStep
                config={config}
                onUpdate={updateConfig}
                onComplete={handleImageGenComplete}
                onSkip={() => setStep('stt')}
                onBack={() => setStep('trending')}
              />
            </motion.div>
          )}

          {step === 'stt' && (
            <motion.div
              key="stt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SpeechToTextStep
                projectDir={config.projectDir}
                onComplete={handleSttComplete}
                onBack={() => setStep('imagegen')}
              />
            </motion.div>
          )}

          {step === 'envvars' && (
            <motion.div
              key="envvars"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EnvVarsStep
                config={config}
                onUpdate={updateConfig}
                onComplete={handleEnvVarsComplete}
                onBack={() => setStep('stt')}
              />
            </motion.div>
          )}

          {step === 'final' && (
            <motion.div
              key="final"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FinalStep
                config={config}
                onRestart={handleRestart}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
}