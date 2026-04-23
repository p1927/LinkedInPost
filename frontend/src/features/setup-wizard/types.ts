export interface EnvVar {
  name: string;
  value: string;
  isSet: boolean;
  isRequired: boolean;
  description: string;
}

export interface Integration {
  id: string;
  name: string;
  connected: boolean;
  icon: string;
  config: Record<string, string>;
  status: 'connected' | 'disconnected' | 'error';
}

export interface Worker {
  id: string;
  name: string;
  deployed: boolean;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  url?: string;
}

export interface SetupState {
  envVars: EnvVar[];
  integrations: Integration[];
  workers: Worker[];
  overallProgress: number;
  lastUpdated: string;
}

export type SetupStep = 'directory' | 'envVars' | 'integrations' | 'final';

export interface SetupConfig {
  projectDir: string;
  skipCloudflare: boolean;
}
