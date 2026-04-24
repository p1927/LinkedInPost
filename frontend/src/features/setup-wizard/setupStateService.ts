import type { EnvVar, Integration, Worker, SetupState } from './types';

export class SetupStateService {
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Fetch setup state from the backend API
   */
  async readState(): Promise<SetupState> {
    const url = `/api/setup/state?projectDir=${encodeURIComponent(this.projectDir)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch setup state: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Alias for readState for compatibility
   */
  async detectEnvVars(): Promise<EnvVar[]> {
    const state = await this.readState();
    return state.envVars;
  }

  async detectIntegrations(): Promise<Integration[]> {
    const state = await this.readState();
    return state.integrations;
  }

  async detectWorkers(): Promise<Worker[]> {
    const state = await this.readState();
    return state.workers;
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
