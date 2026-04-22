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
import type { SetupState } from './types';

export type SetupStep = 'status' | 'welcome' | 'directory' | 'progress' | 'integrations' | 'trending' | 'envvars' | 'final';

export type YouTubeAdapterType = 'youtube-official' | 'apify-youtube';
export type InstagramAdapterType = 'instagram-official' | 'sociavault';
export type LinkedInAdapterType = 'linkedin-official' | 'apify-linkedin' | 'sociavault' | 'phantombuster';
export type NewsAdapterType = 'newsdata' | 'guardian' | 'gnews';

// Dry run mode: enabled for setup wizard (port 3456), disabled for main app
const isSetupWizard = typeof window !== 'undefined' && window.location.port === '3456';

export interface SetupConfig {
  projectDir: string;
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
  envVars: Record<string, string>;
}

const DEFAULT_CONFIG: SetupConfig = {
  projectDir: '',
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
  envVars: {},
};

export function SetupWizard() {
  const [step, setStep] = useState<SetupStep>('welcome');
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
        // Try to auto-detect project directory
        const possiblePaths = [
          '/home/openclaw/workspaces/projects/LinkedInPost',
          window.location.origin === 'http://localhost:3456' ? '/workspace' : '',
        ].filter(Boolean);

        let projectDir = '';
        for (const path of possiblePaths) {
          try {
            const response = await fetch(`${path}/frontend/.env`);
            if (response.ok) {
              projectDir = path || '/workspace';
              break;
            }
          } catch {
            // Continue to next path
          }
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
    setStep('welcome');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
                onBack={() => setStep('integrations')}
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
                onBack={() => setStep('integrations')}
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
  );
}