import type { EnvVar, Integration, Worker, SetupState } from './types';

// Browser stubs – actual file I/O must go through the backend API
async function readFile(_path: string, _encoding: string): Promise<string> {
  return Promise.resolve('');
}

function existsSync(_path: string): boolean {
  return false;
}

const REQUIRED_ENV_VARS = [
  { name: 'VITE_GOOGLE_CLIENT_ID', isRequired: true, description: 'Google OAuth Client ID for authentication' },
  { name: 'VITE_WORKER_URL', isRequired: true, description: 'Cloudflare Worker URL for API backend' },
  { name: 'GOOGLE_CLIENT_ID', isRequired: true, description: 'Google service account client ID' },
  { name: 'GOOGLE_CREDENTIALS_JSON', isRequired: true, description: 'Google service account credentials JSON' },
  { name: 'GEMINI_API_KEY', isRequired: true, description: 'Gemini API key for content generation' },
  { name: 'CLOUDFLARE_API_TOKEN', isRequired: false, description: 'Cloudflare API token for deployment' },
  { name: 'LINKEDIN_CLIENT_ID', isRequired: false, description: 'LinkedIn OAuth app client ID' },
  { name: 'LINKEDIN_CLIENT_SECRET', isRequired: false, description: 'LinkedIn OAuth app secret' },
  { name: 'SERPAPI_API_KEY', isRequired: false, description: 'SerpAPI key for news research' },
];

export class SetupStateService {
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Parse a .env file and return key-value map
   */
  private async parseEnvFile(filePath: string): Promise<Record<string, string>> {
    if (!existsSync(filePath)) {
      return {};
    }
    const content = await readFile(filePath, 'utf-8');
    const result: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex);
        let value = trimmed.substring(eqIndex + 1);
        value = value.replace(/^['"]|['"]$/g, '');
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Detect which environment variables are set
   */
  async detectEnvVars(): Promise<EnvVar[]> {
    const frontendEnv = await this.parseEnvFile(`${this.projectDir}/frontend/.env`);
    const workerEnv = await this.parseEnvFile(`${this.projectDir}/worker/.dev.vars`);
    const allEnv = { ...frontendEnv, ...workerEnv };

    return REQUIRED_ENV_VARS.map(({ name, isRequired, description }) => ({
      name,
      value: allEnv[name] || '',
      isSet: Boolean(allEnv[name]?.trim()),
      isRequired,
      description,
    }));
  }

  /**
   * Detect which integrations are connected
   * This would typically call an API, but for now we detect from env vars
   */
  async detectIntegrations(): Promise<Integration[]> {
    const workerEnv = await this.parseEnvFile(`${this.projectDir}/worker/.dev.vars`);
    const frontendEnv = await this.parseEnvFile(`${this.projectDir}/frontend/.env`);

    return [
      {
        id: 'google',
        name: 'Google Workspace',
        connected: Boolean(workerEnv['GOOGLE_CLIENT_ID'] && workerEnv['GOOGLE_CREDENTIALS_JSON']),
        icon: 'mail',
        config: {
          clientId: workerEnv['GOOGLE_CLIENT_ID'] || '',
        },
        status: workerEnv['GOOGLE_CLIENT_ID'] ? 'connected' : 'disconnected',
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        connected: Boolean(workerEnv['LINKEDIN_ACCESS_TOKEN']),
        icon: 'linkedin',
        config: {
          hasClientId: String(Boolean(workerEnv['LINKEDIN_CLIENT_ID'])),
          hasAccessToken: String(Boolean(workerEnv['LINKEDIN_ACCESS_TOKEN'])),
        },
        status: workerEnv['LINKEDIN_ACCESS_TOKEN'] ? 'connected' : 'disconnected',
      },
      {
        id: 'github',
        name: 'GitHub',
        connected: Boolean(workerEnv['GITHUB_TOKEN_ENCRYPTION_KEY']),
        icon: 'github',
        config: {},
        status: workerEnv['GITHUB_TOKEN_ENCRYPTION_KEY'] ? 'connected' : 'disconnected',
      },
      {
        id: 'cloudflare',
        name: 'Cloudflare Workers',
        connected: Boolean(workerEnv['CLOUDFLARE_API_TOKEN']),
        icon: 'cloud',
        config: {
          workerUrl: workerEnv['VITE_WORKER_URL'] || frontendEnv['VITE_WORKER_URL'] || '',
        },
        status: workerEnv['CLOUDFLARE_API_TOKEN'] ? 'connected' : 'disconnected',
      },
    ];
  }

  /**
   * Detect worker deployment status
   */
  async detectWorkers(): Promise<Worker[]> {
    const workerEnv = await this.parseEnvFile(`${this.projectDir}/worker/.dev.vars`);
    const frontendEnv = await this.parseEnvFile(`${this.projectDir}/frontend/.env`);

    return [
      {
        id: 'api-worker',
        name: 'API Worker',
        deployed: Boolean(workerEnv['VITE_WORKER_URL']),
        status: workerEnv['VITE_WORKER_URL'] ? 'running' : 'unknown',
        url: workerEnv['VITE_WORKER_URL'] || frontendEnv['VITE_WORKER_URL'] || '',
      },
      {
        id: 'generation-worker',
        name: 'Generation Worker',
        deployed: existsSync(`${this.projectDir}/generation-worker/wrangler.jsonc`),
        status: 'unknown',
      },
    ];
  }

  /**
   * Calculate overall setup progress (0-100)
   */
  private calculateProgress(envVars: EnvVar[], integrations: Integration[]): number {
    const requiredVars = envVars.filter(v => v.isRequired);
    const setRequiredVars = requiredVars.filter(v => v.isSet);
    const varScore = (setRequiredVars.length / requiredVars.length) * 50;

    const connectedIntegrations = integrations.filter(i => i.connected);
    const intScore = (connectedIntegrations.length / integrations.length) * 50;

    return Math.round(varScore + intScore);
  }

  /**
   * Get the complete setup state
   */
  async readState(): Promise<SetupState> {
    const [envVars, integrations, workers] = await Promise.all([
      this.detectEnvVars(),
      this.detectIntegrations(),
      this.detectWorkers(),
    ]);

    const overallProgress = this.calculateProgress(envVars, integrations);

    return {
      envVars,
      integrations,
      workers,
      overallProgress,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Save state to localStorage (for UI persistence)
   */
  saveState(state: SetupState): void {
    localStorage.setItem('setup-wizard-state', JSON.stringify(state));
  }

  /**
   * Load state from localStorage
   */
  loadState(): SetupState | null {
    const stored = localStorage.getItem('setup-wizard-state');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as SetupState;
    } catch {
      return null;
    }
  }

  /**
   * Get incomplete items for dashboard display
   */
  async getIncompleteItems(): Promise<{ category: string; items: string[] }[]> {
    const state = await this.readState();
    const incomplete: { category: string; items: string[] }[] = [];

    const missingRequired = state.envVars.filter(v => v.isRequired && !v.isSet);
    if (missingRequired.length > 0) {
      incomplete.push({
        category: 'Environment Variables',
        items: missingRequired.map(v => v.name),
      });
    }

    const disconnected = state.integrations.filter(i => !i.connected);
    if (disconnected.length > 0) {
      incomplete.push({
        category: 'Integrations',
        items: disconnected.map(i => i.name),
      });
    }

    const notDeployed = state.workers.filter(w => !w.deployed);
    if (notDeployed.length > 0) {
      incomplete.push({
        category: 'Workers',
        items: notDeployed.map(w => w.name),
      });
    }

    return incomplete;
  }
}
