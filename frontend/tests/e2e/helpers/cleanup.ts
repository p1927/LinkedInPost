/**
 * cleanup.ts — Programmatic cleanup of Playwright test artifacts.
 *
 * Import and call cleanupArtifacts() in globalTeardown or test.afterAll hooks
 * when you want fine-grained control over artifact removal.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Removes Playwright test artifacts from the given test-results directory and
 * the adjacent playwright-report directory.
 *
 * - Clears the contents of testResultsDir but preserves the directory itself
 *   (so Playwright can recreate files there on the next run without mkdir errors).
 * - Removes the playwright-report directory entirely.
 *
 * @param testResultsDir Absolute path to the test-results output directory.
 */
export async function cleanupArtifacts(testResultsDir: string): Promise<void> {
  const playwrightReportDir = path.join(path.dirname(testResultsDir), 'playwright-report');

  // --- test-results: remove contents, keep the directory ---
  if (fs.existsSync(testResultsDir)) {
    const entries = fs.readdirSync(testResultsDir);
    let removedCount = 0;
    for (const entry of entries) {
      const entryPath = path.join(testResultsDir, entry);
      fs.rmSync(entryPath, { recursive: true, force: true });
      removedCount++;
    }
    console.log(
      `[cleanup] Removed ${removedCount} item(s) from ${testResultsDir}`,
    );
  } else {
    console.log(`[cleanup] test-results directory not found, nothing to clean: ${testResultsDir}`);
  }

  // --- playwright-report: remove the whole directory ---
  if (fs.existsSync(playwrightReportDir)) {
    fs.rmSync(playwrightReportDir, { recursive: true, force: true });
    console.log(`[cleanup] Removed playwright-report at ${playwrightReportDir}`);
  } else {
    console.log(`[cleanup] playwright-report not found, skipping: ${playwrightReportDir}`);
  }

  console.log('[cleanup] Done.');
}
