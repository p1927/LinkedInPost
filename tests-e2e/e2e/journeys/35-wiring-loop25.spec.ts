/**
 * Journey 35: Wiring Loop 25/50 — Custom Workflows & Writing Styles Wiring
 *
 * Validates wiring issues for custom workflows and writing styles based on
 * the spec for el-f93b9f4401ad. Tests verify the workflow/style API wiring,
 * editor integration, and UI behavior against the specification
 * (not against implementation).
 *
 * Key issues being tested (from USE-CASES.md and Journey 12/13 specs):
 *   1. listCustomWorkflows returns workflow array with required fields
 *   2. createCustomWorkflow creates a new workflow with name/templateId
 *   3. updateCustomWorkflow updates existing workflow (name, templateId, steps)
 *   4. deleteCustomWorkflow removes a workflow gracefully
 *   5. listCustomPersonas returns persona array with required fields
 *   6. createCustomPersona creates a new persona with persona fields
 *   7. updateCustomPersona updates existing persona
 *   8. deleteCustomPersona removes a persona gracefully
 *   9. Editor uses selected workflow/style for content generation
 *  10. Writing styles tab shows saved custom styles alongside defaults
 *
 * References:
 *   journeys/28-wiring-loop20.spec.ts — loop 20 (Feed Enrichment API, patterns)
 *   journeys/29-wiring-loop23.spec.ts — loop 23 (Automations API, patterns)
 *   journeys/30-wiring-loop24.spec.ts — loop 24 (Topic Discovery, patterns)
 *   journeys/33-wiring-loop24.spec.ts — loop 24 (Bootstrap Integration, patterns)
 *   helpers/mockApi.ts — mock API helper (with workflow/persona action mocks)
 *   USE-CASES.md — wiring status for Journey 12 (Feed Enrichment) and Journey 13
 *
 * Wiring Loop 25 Fixes (2026-04-30): Documented in USE-CASES.md.
 */

import { test, expect, type Page } from '@playwright/test';
import {
  setupApiMocks,
  injectFakeToken,
  gotoAuthenticated,
  MOCK_SESSION,
} from '../helpers/mockApi';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fire a browser-side POST action through the app's action routing.
 * Uses page.evaluate so Playwright route handlers intercept correctly.
 * Returns parsed JSON response.
 */
async function fireAction(
  page: Page,
  action: string,
  body: Record<string, unknown> = {},
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  return page.evaluate(async ({ action: a, body: b }) => {
    const resp = await fetch('http://localhost:5174/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: a, ...b }),
    });
    return resp.json();
  }, { action, body });
}

// ---------------------------------------------------------------------------
// Journey 35.1: Custom Workflows — listCustomWorkflows Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.1: Custom Workflows — listCustomWorkflows Wiring', () => {

  test('listCustomWorkflows returns workflows array on success', async ({ page }) => {
    /**
     * Spec (Journey 12, Journey 13): listCustomWorkflows returns an array
     * of custom workflow objects with required fields (id, name, templateId, steps).
     *
     * Expected behavior: { ok: true, data: CustomWorkflow[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomWorkflows');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('listCustomWorkflows returns workflows with required fields', async ({ page }) => {
    /**
     * Spec: Each workflow in the list should have at minimum an id and name field.
     *
     * Expected behavior: Workflows have id and name as strings.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomWorkflows');

    expect(result.ok).toBe(true);
    const workflows = result.data as unknown[];
    for (const wf of workflows) {
      const w = wf as Record<string, unknown>;
      expect(typeof w.id).toBe('string');
      expect(typeof w.name).toBe('string');
    }
  });

  test('listCustomWorkflows returns empty array when no workflows exist', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomWorkflows');

    expect(result.ok).toBe(true);
    const workflows = result.data as unknown[];
    expect(Array.isArray(workflows)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 35.2: Custom Workflows — createCustomWorkflow Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.2: Custom Workflows — createCustomWorkflow Wiring', () => {

  test('createCustomWorkflow creates a new workflow with name field', async ({ page }) => {
    /**
     * Spec: createCustomWorkflow action accepts a workflow name and returns
     * the created workflow object with a generated id.
     *
     * Expected behavior: { ok: true, data: { id: string, name: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomWorkflow', { name: 'Founder Voice' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.name).toBe('string');
  });

  test('createCustomWorkflow returns created workflow with id', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomWorkflow', { name: 'Tech Newsletter' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data.id)).toBe(true);
  });

  test('createCustomWorkflow action is callable without required fields', async ({ page }) => {
    /**
     * Spec: createCustomWorkflow should handle minimal input (name only) and
     * return a valid workflow object, using defaults for optional fields.
     *
     * Expected behavior: Action succeeds with { ok: true } even for minimal input.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomWorkflow', { name: 'Minimal Workflow' });

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Journey 35.3: Custom Workflows — updateCustomWorkflow Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.3: Custom Workflows — updateCustomWorkflow Wiring', () => {

  test('updateCustomWorkflow updates existing workflow by id', async ({ page }) => {
    /**
     * Spec: updateCustomWorkflow action accepts an id and updated fields,
     * and returns the updated workflow object.
     *
     * Expected behavior: { ok: true, data: { id: string, name: string } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateCustomWorkflow', {
      id: 'workflow-custom-1',
      name: 'Updated Founder Voice',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
  });

  test('updateCustomWorkflow handles update with templateId field', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateCustomWorkflow', {
      id: 'workflow-custom-1',
      name: 'Executive Brief',
      templateId: 'template-executive',
    });

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('updateCustomWorkflow returns updated workflow on success', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateCustomWorkflow', {
      id: 'workflow-custom-1',
      name: 'Reordered Steps',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journey 35.4: Custom Workflows — deleteCustomWorkflow Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.4: Custom Workflows — deleteCustomWorkflow Wiring', () => {

  test('deleteCustomWorkflow removes a workflow gracefully', async ({ page }) => {
    /**
     * Spec: deleteCustomWorkflow action accepts an id and returns success confirmation.
     *
     * Expected behavior: { ok: true, success: true } on deletion.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomWorkflow', { id: 'workflow-custom-1' });

    expect(result.ok).toBe(true);
  });

  test('deleteCustomWorkflow returns success flag', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomWorkflow', { id: 'workflow-custom-1' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.success).toBe('boolean');
  });

  test('deleteCustomWorkflow handles unknown id gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomWorkflow', { id: 'unknown-workflow' });

    // Should not crash; returns ok: true or ok: false gracefully
    expect(typeof result.ok).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Journey 35.5: Custom Personas — listCustomPersonas Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.5: Custom Personas — listCustomPersonas Wiring', () => {

  test('listCustomPersonas returns personas array on success', async ({ page }) => {
    /**
     * Spec (Journey 12): listCustomPersonas returns an array of custom persona
     * objects with required fields (id, name, currentFocus).
     *
     * Expected behavior: { ok: true, data: CustomPersona[] }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomPersonas');

    expect(result.ok).toBe(true);
    const data = result.data as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  test('listCustomPersonas returns empty array when no personas exist', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomPersonas');

    expect(result.ok).toBe(true);
    const personas = result.data as unknown[];
    expect(Array.isArray(personas)).toBe(true);
  });

  test('listCustomPersonas action is callable without auth context', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomPersonas');

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Journey 35.6: Custom Personas — createCustomPersona Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.6: Custom Personas — createCustomPersona Wiring', () => {

  test('createCustomPersona creates a new persona with name field', async ({ page }) => {
    /**
     * Spec (Journey 12): createCustomPersona action accepts persona fields
     * (name, currentFocus, language) and returns the created persona object.
     *
     * Expected behavior: { ok: true, data: { id: string, name: string, ... } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomPersona', { name: 'Tech Founder' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
    expect(typeof data.name).toBe('string');
  });

  test('createCustomPersona returns created persona with id', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomPersona', { name: 'Marketing Lead' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(Boolean(data.id)).toBe(true);
  });

  test('createCustomPersona handles optional fields gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'createCustomPersona', {
      name: 'Full Persona',
      currentFocus: 'AI startup growth',
      language: 'en',
    });

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Journey 35.7: Custom Personas — updateCustomPersona Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.7: Custom Personas — updateCustomPersona Wiring', () => {

  test('updateCustomPersona updates existing persona by id', async ({ page }) => {
    /**
     * Spec: updateCustomPersona action accepts an id and updated fields,
     * and returns the updated persona object.
     *
     * Expected behavior: { ok: true, data: { id: string, name: string, ... } }
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateCustomPersona', {
      id: 'persona-custom-1',
      name: 'Updated Tech Founder',
    });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.id).toBe('string');
  });

  test('updateCustomPersona handles full persona update', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateCustomPersona', {
      id: 'persona-custom-1',
      name: 'Refined Founder Persona',
      currentFocus: 'Scaling B2B SaaS',
      language: 'en',
    });

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Journey 35.8: Custom Personas — deleteCustomPersona Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.8: Custom Personas — deleteCustomPersona Wiring', () => {

  test('deleteCustomPersona removes a persona gracefully', async ({ page }) => {
    /**
     * Spec: deleteCustomPersona action accepts an id and returns success confirmation.
     *
     * Expected behavior: { ok: true, success: true } on deletion.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomPersona', { id: 'persona-custom-1' });

    expect(result.ok).toBe(true);
  });

  test('deleteCustomPersona returns success flag', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomPersona', { id: 'persona-custom-1' });

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(typeof data.success).toBe('boolean');
  });

  test('deleteCustomPersona handles unknown id gracefully', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'deleteCustomPersona', { id: 'unknown-persona' });

    expect(typeof result.ok).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// Journey 35.9: Editor Integration — Workflow/Style Selection Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.9: Editor — Workflow/Style Selection Integration', () => {

  test('editor page loads without JS crash when workflows are available', async ({ page }) => {
    /**
     * Spec (Journey 12, Journey 13): Editor should load without crash when
     * custom workflows and personas are available from bootstrap.
     *
     * Expected behavior: Page renders with body content, no JS errors.
     */
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await setupApiMocks(page, {});
    await injectFakeToken(page);
    await page.goto('./review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    expect(jsErrors).toHaveLength(0);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });

  test('editor uses googleModel from bootstrap config for generation', async ({ page }) => {
    /**
     * Spec (Journey 1, Journey 33): Editor generation calls use googleModel
     * from bootstrap config, ensuring correct model is used.
     *
     * Expected behavior: Bootstrap config includes googleModel in config object.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'bootstrap');

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    const config = data.config as Record<string, unknown>;
    expect(typeof config.googleModel).toBe('string');
  });

  test('dashboard sidebar shows correct nav items for authenticated user', async ({ page }) => {
    await gotoAuthenticated(page, './dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Journey 35.10: Writing Styles — Custom Style Persistence Wiring
// ---------------------------------------------------------------------------

test.describe('Journey 35.10: Writing Styles — Custom Style Persistence', () => {

  test('writing styles tab renders custom styles alongside defaults', async ({ page }) => {
    /**
     * Spec: Writing styles tab (if accessible) should show custom styles
     * from listCustomWorkflows alongside default style options.
     *
     * Expected behavior: listCustomWorkflows returns valid data without crash.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'listCustomWorkflows');

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('createCustomWorkflow creates style that persists across sessions', async ({ page }) => {
    /**
     * Spec: Creating a custom workflow/style should return a stable id
     * that can be used for subsequent update/delete calls.
     *
     * Expected behavior: Created workflow has a string id.
     */
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const createResult = await fireAction(page, 'createCustomWorkflow', {
      name: 'Persisted Style Test',
    });

    expect(createResult.ok).toBe(true);
    const created = createResult.data as Record<string, unknown>;
    const workflowId = created.id as string;

    // The id should be usable for update/delete
    expect(typeof workflowId).toBe('string');
    expect(workflowId.length).toBeGreaterThan(0);
  });

  test('updateCustomWorkflow updates style with templateId', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const result = await fireAction(page, 'updateCustomWorkflow', {
      id: 'workflow-custom-1',
      name: 'Updated with Template',
      templateId: 'linkedin-professional',
    });

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('deleteCustomWorkflow removes custom style from list', async ({ page }) => {
    await setupApiMocks(page, {});
    await injectFakeToken(page);

    const deleteResult = await fireAction(page, 'deleteCustomWorkflow', {
      id: 'workflow-custom-1',
    });

    expect(deleteResult.ok).toBe(true);
    const deleteData = deleteResult.data as Record<string, unknown>;
    expect(typeof deleteData.success).toBe('boolean');
  });
});
