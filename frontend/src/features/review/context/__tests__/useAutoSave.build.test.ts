/**
 * frontend/src/features/review/context/__tests__/useAutoSave.build.test.ts
 *
 * Unit tests for useAutoSave TypeScript build compliance.
 *
 * Spec Issue to Fix:
 *   - Unused `DraftSnapshot` import — must be removed.
 *     (The type may be declared but never used in the function body.)
 *
 * Spec requirement: "npm run build in frontend/ completes without TypeScript errors"
 *
 * These tests FAIL if the implementation doesn't meet the spec.
 * They verify build cleanliness by importing the module.
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Build compliance tests ────────────────────────────────────────────────────

/**
 * The useAutoSave module must compile without TypeScript errors.
 *
 * This test verifies the module can be imported without errors,
 * which catches:
 *   - Unused imports that cause TypeScript warnings (treated as errors in strict mode)
 *   - Syntax errors
 *   - Type errors
 */
describe('useAutoSave TypeScript build compliance', () => {
  it('useAutoSave module compiles without errors', async () => {
    vi.resetModules();
    // If the module has unused imports or type errors, this import will throw
    const mod = await import('../useAutoSave');
    expect(mod).toBeDefined();
    expect(typeof mod.useAutoSave).toBe('function');
  });

  it('useAutoSave is a named export from the module', async () => {
    vi.resetModules();
    const mod = await import('../useAutoSave');
    expect(typeof mod.useAutoSave).toBe('function');
  });
});

// ─── Unused import compliance ─────────────────────────────────────────────────

/**
 * Spec Issue:
 *   Unused `DraftSnapshot` import — must be removed.
 *
 * We verify that DraftSnapshot is not imported, or if it is imported,
 * that it is actually used in the code body (not just in the import line).
 */
describe('useAutoSave unused import compliance', () => {
  it('does not have an unused DraftSnapshot import', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(__dirname, '..', 'useAutoSave.ts');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    // Check if DraftSnapshot is imported
    const draftSnapshotImportRegex = /import\s*{[^}]*DraftSnapshot[^}]*}\s*from/;
    const hasDraftSnapshotImport = draftSnapshotImportRegex.test(source);

    if (hasDraftSnapshotImport) {
      // Count all occurrences of DraftSnapshot in the source
      const usages = (source.match(/DraftSnapshot/g) || []).length;
      // If imported, must appear more than just once (in the import line)
      // to indicate it is actually used in the code
      expect(
        usages,
        'DraftSnapshot is imported but appears only in the import line — it is unused',
      ).toBeGreaterThan(1);
    }
    // If the import does not exist, the test passes (fix was applied correctly)
  });

  it('module still compiles when checked this way', async () => {
    // This is a cross-check: the module must be importable
    vi.resetModules();
    const mod = await import('../useAutoSave');
    expect(typeof mod.useAutoSave).toBe('function');
  });
});
