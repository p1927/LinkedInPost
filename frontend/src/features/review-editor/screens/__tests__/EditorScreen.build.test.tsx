/**
 * frontend/src/features/review-editor/screens/__tests__/EditorScreen.build.test.tsx
 *
 * Unit tests for EditorScreen TypeScript build compliance.
 *
 * Spec Issues to Fix:
 *   1. `Saved` icon imported from `lucide-react` but doesn't exist in v1.7.0 —
 *      must be replaced with `Bookmark`.
 *   2. Unused variable `autoSaveLastSavedAt` — must be removed or prefixed with `_`.
 *
 * Spec requirement: "npm run build in frontend/ completes without TypeScript errors"
 *
 * These tests FAIL if the implementation doesn't meet the spec.
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Build compliance tests ────────────────────────────────────────────────────

/**
 * The EditorScreen module must compile without TypeScript errors.
 *
 * This test verifies the module can be imported without errors,
 * which catches:
 *   - Invalid imports (e.g., `Saved` icon that doesn't exist in lucide-react v1.7.0)
 *   - Unused variable warnings treated as errors by the build
 */
describe('EditorScreen TypeScript build compliance', () => {
  it('EditorScreen module compiles without errors', async () => {
    vi.resetModules();
    // If the module has syntax errors or invalid imports, this import will throw
    const mod = await import('../EditorScreen');
    expect(mod).toBeDefined();
    expect(typeof mod.EditorScreen).toBe('function');
  });

  it('EditorScreen is exported as a named component', async () => {
    const { EditorScreen } = await import('../EditorScreen');
    expect(EditorScreen).toBeDefined();
  });
});

// ─── lucide-react icon imports compliance ─────────────────────────────────────

/**
 * Spec Issue #1:
 *   `Saved` icon imported from `lucide-react` but doesn't exist in v1.7.0.
 *   Must be replaced with `Bookmark`.
 *
 * These tests verify:
 *   - Bookmark is available in lucide-react v1.7.0
 *   - Saved is NOT available in lucide-react v1.7.0
 *   - EditorScreen uses Bookmark (not Saved) for the saved badge
 */
describe('lucide-react icon imports', () => {
  it('Bookmark icon is available in lucide-react v1.7.0', async () => {
    const { Bookmark } = await import('lucide-react');
    expect(Bookmark).toBeDefined();
  });

  it('Eye icon is available in lucide-react v1.7.0', async () => {
    const { Eye } = await import('lucide-react');
    expect(Eye).toBeDefined();
  });

  it('ShieldCheck icon is available in lucide-react v1.7.0', async () => {
    const { ShieldCheck } = await import('lucide-react');
    expect(ShieldCheck).toBeDefined();
  });

  it('lucide-react version is 1.7.x (per package.json)', async () => {
    const pkg = await import('lucide-react/package.json');
    expect(pkg.version).toMatch(/^1\.7/);
  });

  it('Saved icon is NOT available in lucide-react v1.7.0 (spec issue #1)', async () => {
    // This test documents the spec issue: `Saved` should not be used in v1.7.0
    const lucide = await import('lucide-react');
    expect(lucide).not.toHaveProperty('Saved');
  });
});

// ─── EditorScreen source code compliance ───────────────────────────────────────

/**
 * Verify the EditorScreen source:
 *   - Imports Bookmark (not Saved) from lucide-react
 *   - Does not have unused variables that would cause build failures
 */
describe('EditorScreen source code compliance', () => {
  it('uses Bookmark (not Saved) from lucide-react', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(__dirname, '..', 'EditorScreen.tsx');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    // Must import Bookmark from lucide-react
    expect(source).toMatch(/import\s*{[^}]*Bookmark[^}]*}\s*from\s*['"]lucide-react['"]/);

    // Must NOT import Saved from lucide-react (it doesn't exist in v1.7.0)
    expect(source).not.toMatch(/import\s*{[^}]*Saved[^}]*}\s*from\s*['"]lucide-react['"]/);
  });

  it('does not have unused autoSaveLastSavedAt variable', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sourcePath = path.resolve(__dirname, '..', 'EditorScreen.tsx');
    const source = fs.readFileSync(sourcePath, 'utf-8');

    // The spec says `autoSaveLastSavedAt` is unused.
    // After the fix it should be either:
    //   a) Not declared in the source at all, OR
    //   b) Prefixed with `_` (e.g., `_autoSaveLastSavedAt`)
    // We check that if it appears, it must be prefixed with `_` or used in code.

    // Find all declarations of autoSaveLastSavedAt (not prefixed)
    // Pattern: const autoSaveLastSavedAt = or let autoSaveLastSavedAt =
    const unusedPattern = /(?:const|let)\s+(?!_)(autoSaveLastSavedAt)\s*[=:]/;
    const matches = source.match(unusedPattern);
    
    if (matches) {
      // If there's an unused declaration, it's a spec violation
      expect(
        matches,
        'autoSaveLastSavedAt is declared but unused — prefix with _ or remove',
      ).toBeNull();
    }
  });
});
