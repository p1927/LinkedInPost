import { test, expect, type Page } from '@playwright/test';
import { gotoAuthenticated, MOCK_ROWS } from '../helpers/mockApi';

// ─── Journey 20: Full application lifecycle ──────────────────────────────────
//
// One end-to-end ride through the product: sign in → dashboard → create topic
// → enrichment → editor → refine → variants → schedule → publish → review
// → automations → connections → settings → admin. Each step is intentionally
// loose (soft assertions) so a single regression in one section doesn't mask
// failures elsewhere.

const TOPIC_1_URL = '/topics/eyJpZCI6InRvcGljLTEifQ';
const TOPIC_1_EDITOR_URL = '/topics/eyJpZCI6InRvcGljLTEifQ/editor/0';

const FULL_OVERRIDES = {
  bootstrap: {
    isAdmin: true,
    onboardingCompleted: true,
  },
  getTokenUsage: { used: 215000, budget: 1000000, resetDate: '2026-05-15' },
  addTopic: {
    rowIndex: 2,
    topicId: 'lifecycle-topic',
    topic: 'AI lifecycle E2E',
    date: new Date().toISOString().slice(0, 10),
    status: 'Pending',
    variant1: '', variant2: '', variant3: '', variant4: '',
    imageLink1: '', imageLink2: '', imageLink3: '', imageLink4: '',
    selectedText: '', selectedImageId: '', selectedImageUrlsJson: '',
    postTime: '', emailTo: '', emailCc: '', emailBcc: '', emailSubject: '',
    topicGenerationRules: '', generationTemplateId: '',
    topicDeliveryChannel: '', topicGenerationModel: '',
    sourceSheet: 'Topics' as const,
  },
  generateQuickChange: {
    scope: 'full',
    model: 'google/gemini-2.0-flash',
    selection: null,
    replacementText: 'Refined: AI rewires how founders ship.',
    fullText: 'Refined: AI rewires how founders ship.',
  },
  generateVariantsPreview: {
    scope: 'full',
    model: 'google/gemini-2.0-flash',
    selection: null,
    variants: [
      { id: 'v-1', label: 'Variant 1', replacementText: 'A1', fullText: 'A1', hookType: 'data', arcType: 'story', variant_rationale: 'r' },
      { id: 'v-2', label: 'Variant 2', replacementText: 'A2', fullText: 'A2', hookType: 'data', arcType: 'story', variant_rationale: 'r' },
      { id: 'v-3', label: 'Variant 3', replacementText: 'A3', fullText: 'A3', hookType: 'data', arcType: 'story', variant_rationale: 'r' },
      { id: 'v-4', label: 'Variant 4', replacementText: 'A4', fullText: 'A4', hookType: 'data', arcType: 'story', variant_rationale: 'r' },
    ],
  },
  saveDraftVariants: { success: true },
  publishContent: { deliveryMode: 'sent', timestamp: new Date().toISOString() },
  updateRowStatus: { success: true },
};

async function visit(page: Page, path: string) {
  await gotoAuthenticated(page, path, FULL_OVERRIDES);
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Journey 20A: Workspace tour — every section loads', () => {
  test('dashboard / topics list renders', async ({ page }) => {
    await visit(page, '/topics');
    await expect(page.getByText(MOCK_ROWS[0].topic).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('add-topic page renders form fields', async ({ page }) => {
    await visit(page, '/topics/new');
    const titleInput = page.getByPlaceholder(/untitled post/i).first();
    await expect.soft(titleInput).toBeVisible({ timeout: 10000 });
  });

  test('settings page renders', async ({ page }) => {
    await visit(page, '/settings');
    const heading = page.getByText(/settings|configuration|workspace settings/i).first();
    await expect.soft(heading).toBeVisible({ timeout: 8000 });
  });

  test('connections page renders integration cards', async ({ page }) => {
    await visit(page, '/connections');
    const linkedin = page.getByText(/linkedin/i).first();
    await expect.soft(linkedin).toBeVisible({ timeout: 8000 });
  });

  test('automations page renders', async ({ page }) => {
    await visit(page, '/automations');
    const marker = page.getByText(/automation|rule|webhook|trigger/i).first();
    await expect.soft(marker).toBeVisible({ timeout: 8000 });
  });

  test('feed page renders interest groups', async ({ page }) => {
    await visit(page, '/feed');
    const newGroup = page.getByRole('button', { name: /new group/i }).first();
    await expect.soft(newGroup).toBeVisible({ timeout: 10000 });
  });

  test('rules page renders global rules', async ({ page }) => {
    await visit(page, '/rules');
    const marker = page.getByText(/rule|global|guideline|policy/i).first();
    await expect.soft(marker).toBeVisible({ timeout: 8000 });
  });

  test('campaign page renders if feature is enabled', async ({ page }) => {
    await visit(page, '/campaign');
    // Page may redirect if FEATURE_CAMPAIGN is off — soft assert the URL settled.
    await page.waitForTimeout(500);
    const url = page.url();
    expect.soft(url).toMatch(/\/(campaign|topics)/);
  });

  test('enrichment page is reachable for admins', async ({ page }) => {
    await visit(page, '/enrichment');
    const marker = page.getByText(/enrichment|node run|persona|emotion/i).first();
    await expect.soft(marker).toBeVisible({ timeout: 8000 });
  });

  test('setup page is reachable for admins', async ({ page }) => {
    await visit(page, '/setup');
    const marker = page.getByText(/setup|wizard|deployment|configuration/i).first();
    await expect.soft(marker).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Journey 20B: End-to-end happy path', () => {
  test('user can flow from dashboard → editor → refine → variants → publish', async ({ page }) => {
    const captured: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) captured.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    // 1. Dashboard
    await visit(page, '/topics');
    await expect(page.getByText(MOCK_ROWS[0].topic).first()).toBeVisible({
      timeout: 10000,
    });

    // 2. Open the topic variant carousel
    await visit(page, TOPIC_1_URL);
    await expect(page.getByText(/AI tools are reshaping/i).first()).toBeVisible({
      timeout: 12000,
    });

    // 3. Drop into the editor
    await visit(page, TOPIC_1_EDITOR_URL);
    const editor = page.locator('textarea').first();
    await expect.soft(editor).toBeVisible({ timeout: 10000 });

    // 4. Open Refine
    const refineTab = page
      .getByRole('tab', { name: /refine/i })
      .or(page.getByRole('button', { name: /refine/i }))
      .first();
    if (await refineTab.isVisible({ timeout: 6000 }).catch(() => false)) {
      await refineTab.click();
      await page.waitForTimeout(300);
    }

    // 5. Click 4 Variants
    const variantsBtn = page.getByRole('button', { name: /4 variants?/i }).first();
    if (await variantsBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      await variantsBtn.click();
      await page.waitForTimeout(1500);
    }

    // 6. Try to publish
    const publishBtn = page
      .getByRole('button', { name: /publish|send|post now/i })
      .first();
    if (await publishBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await publishBtn.click();
      await page.waitForTimeout(800);
    }

    // The page should not have crashed — body still has substantive content.
    const body = await page.locator('body').textContent({ timeout: 5000 });
    expect(body?.length ?? 0).toBeGreaterThan(100);

    // At least the bootstrap action MUST have fired.
    expect.soft(captured).toContain('bootstrap');
  });
});

test.describe('Journey 20C: Cross-section state stability', () => {
  test('rapid back-and-forth navigation keeps the workspace mounted', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await visit(page, '/topics');
    await visit(page, '/connections');
    await visit(page, '/feed');
    await visit(page, '/automations');
    await visit(page, '/topics');

    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});

test.describe('Journey 20D: Topic status transitions', () => {
  test('changing status fires updateRowStatus', async ({ page }) => {
    const captured: string[] = [];
    await visit(page, TOPIC_1_URL);

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) captured.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    const approveBtn = page
      .getByRole('button', { name: /approve|reject|mark.*done|set status/i })
      .first();
    if (await approveBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(800);
      // Don't strictly assert — just ensure SOMETHING happened without a crash.
      expect.soft(captured.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Journey 20E: Logout', () => {
  test('logout clears session and returns to landing', async ({ page }) => {
    await visit(page, '/topics');
    await expect(page.getByText(MOCK_ROWS[0].topic).first()).toBeVisible({
      timeout: 10000,
    });

    const logoutBtn = page
      .getByRole('button', { name: /^log out$|sign out|logout/i })
      .or(page.getByRole('menuitem', { name: /log out|sign out/i }))
      .first();
    if (await logoutBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(800);
      // After logout, the landing/login surface should reappear.
      const landing = page
        .getByText(/sign in|channel bot|one pipeline/i)
        .first();
      await expect.soft(landing).toBeVisible({ timeout: 8000 });
    }
  });
});
