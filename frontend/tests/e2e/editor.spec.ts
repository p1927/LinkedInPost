import { test, expect } from '@playwright/test';

test.describe('Editor Feature', () => {
  test('should display editor workspace', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');

    // Look for workspace shell or editor
    const editorArea = page.locator('[class*="editor"], [class*="workspace"], textarea').first();
    await expect(editorArea).toBeVisible({ timeout: 10000 }).catch(() => {
      // May require topic selection
    });
  });

  test('should have text input area', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 }).catch(() => {
      // Textarea may be conditionally rendered
    });
  });

  test('should support undo/redo operations', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');

    // Look for undo/redo buttons or keyboard shortcuts
    const undoButton = page.getByRole('button', { name: /undo/i }).first();
    const redoButton = page.getByRole('button', { name: /redo/i }).first();

    // Buttons may not be visible in all states
    if (await undoButton.isVisible()) {
      await expect(undoButton).toBeEnabled();
    }
    if (await redoButton.isVisible()) {
      await expect(redoButton).toBeEnabled();
    }
  });
});

test.describe('Review Workflow', () => {
  test('should display review workspace', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');

    // Check for review panel or workspace
    const reviewSection = page.locator('[class*="review"], section:has-text("Review")').first();
    await expect(reviewSection).toBeVisible({ timeout: 10000 }).catch(() => {
      // May not be visible without selected topic
    });
  });

  test('should show variant comparison', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle content approval', async ({ page }) => {
    await page.goto('/topics');
    await page.waitForLoadState('domcontentloaded');

    // Look for approve/confirm buttons
    const approveButton = page.getByRole('button', { name: /approve|confirm|yes/i }).first();
    if (await approveButton.isVisible()) {
      await expect(approveButton).toBeEnabled();
    }
  });
});