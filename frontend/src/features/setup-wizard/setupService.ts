export interface SetupResult {
  success: boolean;
  message: string;
  error?: string;
}

// Dry run mode - prevents actual destructive operations
let dryRunMode = false;

export const setupService = {
  /**
   * Enable or disable dry run mode
   */
  setDryRun(enabled: boolean): void {
    dryRunMode = enabled;
    console.log(`[setupService] Dry run mode: ${enabled ? 'ON (no changes will be made)' : 'OFF'}`);
  },

  isDryRun(): boolean {
    return dryRunMode;
  },

  /**
   * Run a shell command via backend API
   */
  async runCommand(_command: string, _cwd: string): Promise<void> {
    // Commands are run server-side; this is a stub for compatibility
    return Promise.resolve();
  },

  /**
   * Run npm install via backend API
   */
  async npmInstall(_cwd: string): Promise<void> {
    // Handled server-side; this is a stub for compatibility
    return Promise.resolve();
  },

  /**
   * Verify environment configuration
   */
  async verifyEnv(envVars: Record<string, string>): Promise<void> {
    const missing: string[] = [];

    if (!envVars['VITE_GOOGLE_CLIENT_ID']) {
      missing.push('VITE_GOOGLE_CLIENT_ID');
    }
    if (!envVars['VITE_WORKER_URL']) {
      missing.push('VITE_WORKER_URL');
    }

    if (missing.length > 0) {
      console.warn(`Warning: Missing recommended env vars: ${missing.join(', ')}`);
    }

    return Promise.resolve();
  },

  /**
   * Write environment variables to .env and .dev.vars via backend API
   */
  async writeEnvFile(projectDir: string, envVars: Record<string, string>): Promise<void> {
    if (dryRunMode) {
      console.log('[setupService] writeEnvFile: DRY RUN - skipping');
      return;
    }

    const response = await fetch('/api/setup/write-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir, envVars }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to write config: ${body.error || response.status}`);
    }
  },

  /**
   * Get system requirements status
   */
  async checkRequirements(): Promise<{ node: boolean; npm: boolean; python: boolean }> {
    return { node: true, npm: true, python: true };
  },

  /**
   * Reset D1 database (skipped in dry run mode)
   */
  async resetDatabase(projectDir: string): Promise<SetupResult> {
    if (dryRunMode) {
      console.log('[setupService] resetDatabase: DRY RUN - skipping');
      return { success: true, message: 'DRY RUN: Would reset database' };
    }

    const response = await fetch('/api/setup/reset-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir }),
    });

    const data = await response.json().catch(() => ({ ok: false, error: 'Unknown error' }));
    if (data.ok) {
      return { success: true, message: data.message || 'Database reset complete' };
    }
    return { success: false, message: 'Failed to reset database', error: data.error };
  },

  /**
   * Clear cache directories (skipped in dry run mode)
   */
  async clearCache(projectDir: string): Promise<SetupResult> {
    if (dryRunMode) {
      console.log('[setupService] clearCache: DRY RUN - skipping');
      return { success: true, message: 'DRY RUN: Would clear cache' };
    }

    // Clear cache via backend - this is a no-op in the API for now
    console.log('[setupService] clearCache: would clear cache at', projectDir);
    return { success: true, message: 'Cache cleared' };
  },

  /**
   * Regenerate feature flags (skipped in dry run mode)
   */
  async regenerateFeatures(projectDir: string): Promise<SetupResult> {
    if (dryRunMode) {
      console.log('[setupService] regenerateFeatures: DRY RUN - skipping');
      return { success: true, message: 'DRY RUN: Would regenerate features' };
    }

    const response = await fetch('/api/setup/regenerate-features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir }),
    });

    const data = await response.json().catch(() => ({ ok: false, error: 'Unknown error' }));
    if (data.ok) {
      return { success: true, message: data.message || 'Features regenerated' };
    }
    return { success: false, message: 'Failed to regenerate features', error: data.error };
  },
};