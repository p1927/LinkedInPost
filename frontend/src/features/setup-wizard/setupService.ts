import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';

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
   * Run a shell command and return a promise
   */
  async runCommand(command: string, cwd: string): Promise<void> {
    const [cmd, ...args] = command.split(' ');
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { cwd, shell: true });
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: string) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: string) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}\n${stderr || stdout}`));
        }
      });

      child.on('error', (err: Error) => {
        reject(err);
      });
    });
  },

  /**
   * Run npm install in a directory
   */
  async npmInstall(cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['install'], { cwd, shell: true });
      let stderr = '';

      child.stderr?.on('data', (data: string) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (err: Error) => {
        reject(err);
      });
    });
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
   * Write environment variables to .env file
   */
  async writeEnvFile(projectDir: string, envVars: Record<string, string>): Promise<void> {
    const lines: string[] = ['# LinkedIn Post Environment Variables', ''];

    Object.entries(envVars).forEach(([key, value]) => {
      if (value.trim()) {
        lines.push(`${key}=${value}`);
      }
    });

    const envContent = lines.join('\n');

    // Write to frontend .env
    await writeFile(`${projectDir}/frontend/.env`, envContent);

    // Write to worker .dev.vars (only non-VITE_ vars)
    const workerLines: string[] = ['# LinkedIn Post Worker Environment Variables', ''];
    Object.entries(envVars).forEach(([key, value]) => {
      if (!key.startsWith('VITE_') && value.trim()) {
        workerLines.push(`${key}=${value}`);
      }
    });
    await writeFile(`${projectDir}/worker/.dev.vars`, workerLines.join('\n'));

    return Promise.resolve();
  },

  /**
   * Get system requirements status
   */
  async checkRequirements(): Promise<{ node: boolean; npm: boolean; python: boolean }> {
    return new Promise((resolve) => {
      const results = { node: false, npm: false, python: false };

      const checkNode = spawn('node', ['--version'], { shell: true });
      checkNode.on('close', (code: number | null) => {
        results.node = code === 0;
        const checkNpm = spawn('npm', ['--version'], { shell: true });
        checkNpm.on('close', (npmCode: number | null) => {
          results.npm = npmCode === 0;
          const checkPython = spawn('python3', ['--version'], { shell: true });
          checkPython.on('close', (pyCode: number | null) => {
            results.python = pyCode === 0;
            resolve(results);
          });
        });
      });
    });
  },

  /**
   * Reset D1 database (skipped in dry run mode)
   */
  async resetDatabase(projectDir: string): Promise<SetupResult> {
    if (dryRunMode) {
      console.log('[setupService] resetDatabase: DRY RUN - skipping');
      return { success: true, message: 'DRY RUN: Would reset database' };
    }
    return new Promise((resolve) => {
      const child = spawn('bash', ['-c', `cd "${projectDir}/worker" && npx wrangler d1 execute github_automation --command="DELETE FROM drafts" --local 2>/dev/null; npx wrangler d1 execute github_automation --command="DELETE FROM posts" --local 2>/dev/null`], { shell: true });
      let stderr = '';

      child.stderr?.on('data', (data: string) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ success: true, message: 'Database reset complete' });
        } else {
          resolve({ success: false, message: 'Failed to reset database', error: stderr });
        }
      });

      child.on('error', (err: Error) => {
        resolve({ success: false, message: 'Error resetting database', error: err.message });
      });
    });
  },

  /**
   * Clear cache directories (skipped in dry run mode)
   */
  async clearCache(projectDir: string): Promise<SetupResult> {
    if (dryRunMode) {
      console.log('[setupService] clearCache: DRY RUN - skipping');
      return { success: true, message: 'DRY RUN: Would clear cache' };
    }
    return new Promise((resolve) => {
      const child = spawn('bash', ['-c', `rm -rf "${projectDir}/.cache" "${projectDir}/frontend/.vite" "${projectDir}/frontend/node_modules/.cache" 2>/dev/null; echo "done"`], { shell: true });

      child.on('close', () => {
        resolve({ success: true, message: 'Cache cleared' });
      });

      child.on('error', (err: Error) => {
        resolve({ success: false, message: 'Error clearing cache', error: err.message });
      });
    });
  },

  /**
   * Regenerate feature flags (skipped in dry run mode)
   */
  async regenerateFeatures(projectDir: string): Promise<SetupResult> {
    if (dryRunMode) {
      console.log('[setupService] regenerateFeatures: DRY RUN - skipping');
      return { success: true, message: 'DRY RUN: Would regenerate features' };
    }
    return new Promise((resolve) => {
      const child = spawn('python3', ['scripts/generate_features.py'], { cwd: projectDir, shell: true });
      let stderr = '';

      child.stderr?.on('data', (data: string) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ success: true, message: 'Features regenerated' });
        } else {
          resolve({ success: false, message: 'Failed to regenerate features', error: stderr });
        }
      });

      child.on('error', (err: Error) => {
        resolve({ success: false, message: 'Error regenerating features', error: err.message });
      });
    });
  },
};