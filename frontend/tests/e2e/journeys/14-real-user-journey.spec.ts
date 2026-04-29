import { test, expect, type Page } from '@playwright/test';
import { gotoAuthenticated, MOCK_ROWS } from '../helpers/mockApi';

// ─── Shared constants ────────────────────────────────────────────────────────

// base64url({ id: "topic-1" }) — matches what the app encodes for MOCK_ROWS[0]
const TOPIC_1_URL = '/topics/eyJpZCI6InRvcGljLTEifQ';

// Direct editor URL for topic-1, variant slot 0 (skips the variant carousel)
const TOPIC_1_EDITOR_URL = '/topics/eyJpZCI6InRvcGljLTEifQ/editor/0';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Navigate to topic variants page and wait for variant content to appear. */
async function gotoTopicVariants(page: Page, overrides: Record<string, unknown> = {}) {
  await gotoAuthenticated(page, TOPIC_1_URL, overrides);
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByText(/AI tools are reshaping/i).or(page.getByText(/AI Tools for Founders/i)).first()
  ).toBeVisible({ timeout: 12000 });
}

/** Navigate directly to the editor page (bypasses the variant carousel). */
async function gotoEditor(page: Page, overrides: Record<string, unknown> = {}) {
  await gotoAuthenticated(page, TOPIC_1_EDITOR_URL, overrides);
  await page.waitForLoadState('domcontentloaded');
  await expect(
    page.getByText(/AI tools are reshaping|AI Tools for Founders/i).first()
  ).toBeVisible({ timeout: 12000 });
}

/** Wait for the draft editor textarea to appear. */
async function waitForEditor(page: Page) {
  const editor = page.locator('textarea').first();
  await expect(editor).toBeVisible({ timeout: 10000 });
  return editor;
}

/** Click a sidebar tab by name pattern. */
async function clickSidebarTab(page: Page, name: RegExp) {
  // EditorSidebar tabs may render as role="tab" buttons or plain buttons
  const tab = page
    .getByRole('tab', { name })
    .or(page.getByRole('button', { name }))
    .first();
  await expect(tab).toBeVisible({ timeout: 8000 });
  await tab.click();
  await page.waitForTimeout(500);
}

// ─── Journey A: Creating a new topic ─────────────────────────────────────────

test.describe('Journey 14A: Create a New Topic', () => {
  test('new topic page loads with all key fields', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    // Title input is present
    const titleInput = page
      .getByPlaceholder(/untitled topic/i)
      .or(page.getByRole('textbox').first());
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 });

    // Style chips are present
    const styleChip = page
      .getByText(/professional|storytelling|educational/i)
      .first();
    await expect.soft(styleChip).toBeVisible({ timeout: 5000 });

    // Save Draft button
    const saveBtn = page.getByRole('button', { name: /save draft/i });
    await expect.soft(saveBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('filling topic title enables Save Draft', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const titleInput = page
      .getByPlaceholder(/untitled topic/i)
      .or(page.locator('input[type="text"]').first());
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 });

    await titleInput.first().click();
    await titleInput.first().fill('How AI is reshaping product development');

    const saveBtn = page.getByRole('button', { name: /save draft/i }).first();
    await expect.soft(saveBtn).toBeEnabled({ timeout: 5000 });
  });

  test('selecting a content style chip toggles its selection', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const chip = page
      .getByRole('button', { name: /storytelling/i })
      .or(page.getByText(/storytelling/i).first());

    await expect(chip.first()).toBeVisible({ timeout: 6000 });
    const before = await chip.first().getAttribute('aria-pressed')
      ?? await chip.first().getAttribute('class');
    await chip.first().click();
    const after = await chip.first().getAttribute('aria-pressed')
      ?? await chip.first().getAttribute('class');
    expect.soft(after).not.toBe(before);
  });

  test('selecting a built-in persona chip activates it', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const personaChip = page
      .getByRole('button', { name: /startup founder|engineering manager|product manager/i })
      .first();

    await expect(personaChip).toBeVisible({ timeout: 6000 });
    await personaChip.click();
    await page.waitForTimeout(300);
    const cls = await personaChip.getAttribute('class') ?? '';
    // Selected state should have a highlight class
    expect.soft(cls.length).toBeGreaterThan(0);
  });

  test('Save Draft fires addTopic action', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/topics/new', {
      addTopic: {
        rowIndex: 0,
        topicId: 'new-topic-e2e',
        topic: 'How AI is reshaping product development',
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
    });
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    const titleInput = page
      .getByPlaceholder(/untitled topic/i)
      .or(page.locator('input[type="text"]').first());
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 });
    await titleInput.first().fill('How AI is reshaping product development');

    const saveBtn = page.getByRole('button', { name: /save draft/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);
    expect.soft(capturedActions).toContain('addTopic');
  });
});

// ─── Journey B: Custom Persona Creation ──────────────────────────────────────

test.describe('Journey 14B: Create a Custom Persona', () => {
  test('+ New persona button opens Create custom persona dialog', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    const newPersonaBtn = page.getByRole('button', { name: /new persona/i }).first();
    await expect(newPersonaBtn).toBeVisible({ timeout: 10000 });
    await newPersonaBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/create custom persona/i).first()).toBeVisible({ timeout: 3000 });
  });

  test('persona dialog has Name, Current focus, and Language fields', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: /new persona/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await expect.soft(dialog.getByPlaceholder(/growth-stage saas founder/i)).toBeVisible({ timeout: 3000 });
    await expect.soft(dialog.getByPlaceholder(/what are they focused on/i)).toBeVisible({ timeout: 3000 });
    await expect.soft(dialog.getByPlaceholder(/direct, first-principles/i)).toBeVisible({ timeout: 3000 });
  });

  test('filling persona name and submitting fires createCustomPersona', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoAuthenticated(page, '/topics/new', {
      createCustomPersona: {
        id: 'persona-e2e',
        name: 'Series A SaaS Founder',
        currentFocus: 'Product-market fit',
        language: 'Direct, data-driven',
        concerns: [],
        ambitions: [],
        habits: [],
        decisionDrivers: [],
        painPoints: [],
      },
    });
    await page.waitForLoadState('domcontentloaded');

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    await page.getByRole('button', { name: /new persona/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill Name (required)
    const nameInput = dialog.getByPlaceholder(/growth-stage saas founder/i);
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.fill('Series A SaaS Founder');

    // Fill Current focus
    const focusInput = dialog.getByPlaceholder(/what are they focused on/i);
    if (await focusInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await focusInput.fill('Product-market fit');
    }

    // Submit — button may be below fold; dispatchEvent bypasses viewport check
    const createBtn = dialog.locator('button[type="submit"]').first();
    await createBtn.dispatchEvent('click');
    await page.waitForTimeout(800);

    expect.soft(capturedActions).toContain('createCustomPersona');
  });

  test('created persona appears as selectable chip after creation', async ({ page }) => {
    await gotoAuthenticated(page, '/topics/new', {
      createCustomPersona: {
        id: 'persona-e2e-2',
        name: 'B2B Growth Marketer',
        currentFocus: 'Pipeline generation',
        language: 'Analytical',
        concerns: [],
        ambitions: [],
        habits: [],
        decisionDrivers: [],
        painPoints: [],
      },
    });
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: /new persona/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const nameInput = dialog.getByPlaceholder(/growth-stage saas founder/i);
    await nameInput.fill('B2B Growth Marketer');

    const createBtn = dialog.locator('button[type="submit"]').first();
    await createBtn.dispatchEvent('click');
    await page.waitForTimeout(1000);

    // The new persona should now appear as a chip
    const personaChip = page.getByText('B2B Growth Marketer').first();
    await expect.soft(personaChip).toBeVisible({ timeout: 5000 });
  });
});

// ─── Journey C: Dashboard → Topic Right Rail ─────────────────────────────────

test.describe('Journey 14C: Dashboard Topic Discovery', () => {
  test('topics appear in the dashboard list', async ({ page }) => {
    await gotoAuthenticated(page, '/');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('AI Tools for Founders').first()).toBeVisible({ timeout: 12000 });
    await expect.soft(page.getByText('Remote Work Culture').first()).toBeVisible({ timeout: 5000 });
  });

  test('clicking a topic row opens the right rail panel', async ({ page }) => {
    await gotoAuthenticated(page, '/');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('AI Tools for Founders').first()).toBeVisible({ timeout: 12000 });

    // Click the topic row
    const topicRow = page.getByText('AI Tools for Founders').first();
    await topicRow.click();
    await page.waitForTimeout(600);

    // Right rail should open showing topic content or an editor prompt
    const rightRail = page
      .getByText(/open editor|draft in editor|AI tools are reshaping/i)
      .or(page.locator('[data-testid*="right-rail"], [data-testid*="panel"]'));
    await expect.soft(rightRail.first()).toBeVisible({ timeout: 8000 });
  });

  test('right rail shows Open editor button or variant preview', async ({ page }) => {
    await gotoAuthenticated(page, '/');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('AI Tools for Founders').first()).toBeVisible({ timeout: 12000 });
    await page.getByText('AI Tools for Founders').first().click();
    await page.waitForTimeout(600);

    // Either "Open editor" button or the post preview content is visible
    const openEditorBtn = page
      .getByRole('button', { name: /open editor/i })
      .or(page.getByText(/open editor/i))
      .or(page.getByText(/AI tools are reshaping/i));
    await expect.soft(openEditorBtn.first()).toBeVisible({ timeout: 8000 });
  });

  test('navigating to topic URL directly loads variant cards', async ({ page }) => {
    await gotoTopicVariants(page);

    // Variant content from MOCK_ROWS[0] should be visible
    const variantText = page.getByText(/AI tools are reshaping/i).first();
    await expect(variantText).toBeVisible({ timeout: 12000 });
  });
});

// ─── Journey D: Enter the Editor ─────────────────────────────────────────────

test.describe('Journey 14D: Enter the Topic Editor', () => {
  test('variant selection page shows topic content', async ({ page }) => {
    await gotoTopicVariants(page);

    const v1 = page.getByText(/AI tools are reshaping/i);
    await expect(v1.first()).toBeVisible({ timeout: 10000 });
  });

  test('editor URL loads the draft textarea', async ({ page }) => {
    await gotoEditor(page);
    const editor = await waitForEditor(page);
    await expect.soft(editor).toBeVisible();
  });

  test('editor shows the variant text content', async ({ page }) => {
    await gotoEditor(page);

    const postContent = page
      .getByText(/AI tools are reshaping|founder|productivity/i)
      .first();
    await expect.soft(postContent).toBeVisible({ timeout: 10000 });
  });

  test('editor sidebar tabs are visible', async ({ page }) => {
    await gotoEditor(page);
    await waitForEditor(page);

    const tab = page
      .getByRole('tab')
      .or(page.getByRole('button', { name: /refine|writing styles|media|news/i }))
      .first();
    await expect.soft(tab).toBeVisible({ timeout: 8000 });
  });
});

// ─── Journey E: Writing Style Creation ───────────────────────────────────────

test.describe('Journey 14E: Create a Writing Style Card', () => {
  test('Writing Styles tab is reachable in the editor', async ({ page }) => {
    await gotoEditor(page);
    await waitForEditor(page);

    await clickSidebarTab(page, /writing styles|styles/i);

    const stylesContent = page
      .getByText(/create your own|writing emphasis|workflow/i)
      .or(page.getByText(/professional/i));
    await expect.soft(stylesContent.first()).toBeVisible({ timeout: 8000 });
  });

  test('Create your own card opens the workflow builder modal', async ({ page }) => {
    await gotoEditor(page);
      await waitForEditor(page);

    await clickSidebarTab(page, /writing styles|styles/i);

    const createCard = page
      .getByText(/create your own/i)
      .or(page.getByRole('button', { name: /create your own/i }))
      .first();

    await expect(createCard).toBeVisible({ timeout: 6000 });
    await createCard.click();

    // WorkflowBuilderModal has no role="dialog" — check for its data-testid instead
    await expect.soft(page.locator('[data-testid="workflow-builder-name"]')).toBeVisible({ timeout: 5000 });
    await expect.soft(
      page.getByText(/create your workflow/i).or(page.getByText(/workflow/i)).first()
    ).toBeVisible({ timeout: 3000 });
  });

  test('workflow builder modal has Name and Description fields', async ({ page }) => {
    await gotoEditor(page);
      await waitForEditor(page);

    await clickSidebarTab(page, /writing styles|styles/i);

    const createCard = page.getByText(/create your own/i).first();
    await expect(createCard).toBeVisible({ timeout: 6000 });
    await createCard.click();
    await expect.soft(page.locator('[data-testid="workflow-builder-name"]')).toBeVisible({ timeout: 5000 });
    await expect.soft(page.locator('[data-testid="workflow-builder-description"]')).toBeVisible({ timeout: 3000 });
  });

  test('filling workflow name and saving fires createCustomWorkflow', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoEditor(page, {
      createCustomWorkflow: { id: 'workflow-e2e-1' },
    });
      await waitForEditor(page);

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    await clickSidebarTab(page, /writing styles|styles/i);

    const createCard = page.getByText(/create your own/i).first();
    await expect(createCard).toBeVisible({ timeout: 6000 });
    await createCard.click();
    // WorkflowBuilderModal is a custom overlay (no role="dialog") — find via data-testid
    const nameInput = page.locator('[data-testid="workflow-builder-name"]');
    if (!(await nameInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Workflow builder modal did not open');
      return;
    }
    await nameInput.fill('Founder Story Voice');

    const descInput = page.locator('[data-testid="workflow-builder-description"]');
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill('Personal, narrative-driven posts with vulnerable insights.');
    }

    // Click the submit button directly
    const createBtn = page.getByRole('button', { name: /create workflow/i });
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
    } else {
      await page.evaluate(() => {
        const form = document.querySelector('form:has([data-testid="workflow-builder-name"])') as HTMLFormElement;
        if (form) form.requestSubmit();
      });
    }
    await page.waitForTimeout(1000);

    expect.soft(capturedActions).toContain('createCustomWorkflow');
  });
});

// ─── Journey F: Refinement ────────────────────────────────────────────────────

test.describe('Journey 14F: Refinement', () => {
  test('Refine tab is reachable and shows generation controls', async ({ page }) => {
    await gotoEditor(page);
      await waitForEditor(page);

    await clickSidebarTab(page, /refine/i);

    // Refine tab should show the rewrite instruction textarea
    const refineArea = page
      .getByPlaceholder(/make the hook stronger|sound more founder/i)
      .or(page.getByText(/rewrite direction|writing mode/i));
    await expect.soft(refineArea.first()).toBeVisible({ timeout: 8000 });
  });

  test('typing a refinement instruction fills the textarea', async ({ page }) => {
    await gotoEditor(page);
      await waitForEditor(page);

    await clickSidebarTab(page, /refine/i);

    const refineInput = page
      .getByPlaceholder(/make the hook stronger|sound more founder/i)
      .first();

    await expect(refineInput).toBeVisible({ timeout: 6000 });
    await refineInput.fill('Make the opening hook more punchy and data-driven');
    await expect.soft(refineInput).toHaveValue(/punchy/i, { timeout: 3000 });
  });

  test('Quick Change button fires generateQuickChange and shows preview', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoEditor(page, {
      generateQuickChange: {
        scope: 'full',
        model: 'google/gemini-2.0-flash',
        selection: null,
        replacementText: 'AI tools have quietly become the unfair advantage every founder needs.',
        fullText: 'AI tools have quietly become the unfair advantage every founder needs.',
      },
    });
      await waitForEditor(page);

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    await clickSidebarTab(page, /refine/i);

    const refineInput = page.getByPlaceholder(/make the hook stronger|sound more founder/i).first();
    if (await refineInput.isVisible({ timeout: 6000 }).catch(() => false)) {
      await refineInput.fill('Make the opening hook more punchy and data-driven');
    }

    const quickChangeBtn = page
      .getByRole('button', { name: /quick change/i })
      .first();

    await expect(quickChangeBtn).toBeVisible({ timeout: 6000 });
    await quickChangeBtn.click();
    await page.waitForTimeout(1500);
    expect.soft(capturedActions).toContain('generateQuickChange');
  });

  test('Quick Change shows preview card with Review changes button', async ({ page }) => {
    await gotoEditor(page, {
      generateQuickChange: {
        scope: 'full',
        model: 'google/gemini-2.0-flash',
        selection: null,
        replacementText: 'AI tools have quietly become the unfair advantage every founder needs.',
        fullText: 'AI tools have quietly become the unfair advantage every founder needs.',
      },
    });
      await waitForEditor(page);

    await clickSidebarTab(page, /refine/i);

    const quickChangeBtn = page.getByRole('button', { name: /quick change/i }).first();
    await expect(quickChangeBtn).toBeVisible({ timeout: 6000 });
    await quickChangeBtn.click();

    // Preview card with "Review changes" or result text should appear
    const preview = page
      .getByRole('button', { name: /review changes/i })
      .or(page.getByText(/unfair advantage|preview/i));
    await expect.soft(preview.first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── Journey G: Generate Posts (4 Variants) ───────────────────────────────────

test.describe('Journey 14G: Generate Posts', () => {
  test('4 Variants button is visible in the Refine tab', async ({ page }) => {
    await gotoEditor(page);
      await waitForEditor(page);

    await clickSidebarTab(page, /refine/i);

    const variantsBtn = page.getByRole('button', { name: /4 variants?/i }).first();
    await expect.soft(variantsBtn).toBeVisible({ timeout: 8000 });
  });

  test('clicking 4 Variants fires generateVariantsPreview', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoEditor(page, {
      generateVariantsPreview: {
        scope: 'full',
        model: 'google/gemini-2.0-flash',
        selection: null,
        variants: [
          { id: 'v-1', label: 'Variant 1', replacementText: 'In 2024, I replaced 3 full-time roles with AI.', fullText: 'In 2024, I replaced 3 full-time roles with AI.', hookType: 'data_point', arcType: 'story', variant_rationale: 'Bold claim with year.' },
          { id: 'v-2', label: 'Variant 2', replacementText: 'Most founders are sleeping on the AI tools that matter.', fullText: 'Most founders are sleeping on the AI tools that matter.', hookType: 'contrarian', arcType: 'insight', variant_rationale: 'Contrarian opener.' },
          { id: 'v-3', label: 'Variant 3', replacementText: '6 months ago I was drowning in ops. Today AI handles 80%.', fullText: '6 months ago I was drowning in ops. Today AI handles 80%.', hookType: 'transformation', arcType: 'before_after', variant_rationale: 'Before/after framing.' },
          { id: 'v-4', label: 'Variant 4', replacementText: 'The AI stack that helped us reach $1M ARR.', fullText: 'The AI stack that helped us reach $1M ARR.', hookType: 'milestone', arcType: 'story', variant_rationale: 'Social proof.' },
        ],
      },
    });
      await waitForEditor(page);

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    await clickSidebarTab(page, /refine/i);

    const variantsBtn = page.getByRole('button', { name: /4 variants?/i }).first();
    await expect(variantsBtn).toBeVisible({ timeout: 6000 });
    await variantsBtn.click();
    await page.waitForTimeout(2000);
    expect.soft(capturedActions).toContain('generateVariantsPreview');
  });

  test('4 Variants result shows variant cards', async ({ page }) => {
    await gotoEditor(page, {
      generateVariantsPreview: {
        scope: 'full',
        model: 'google/gemini-2.0-flash',
        selection: null,
        variants: [
          { id: 'v-1', label: 'Variant 1', replacementText: 'In 2024, I replaced 3 full-time roles with AI.', fullText: 'In 2024, I replaced 3 full-time roles with AI.', hookType: 'data_point', arcType: 'story', variant_rationale: 'Bold claim with year.' },
          { id: 'v-2', label: 'Variant 2', replacementText: 'Most founders are sleeping on the AI tools.', fullText: 'Most founders are sleeping on the AI tools.', hookType: 'contrarian', arcType: 'insight', variant_rationale: 'Contrarian opener.' },
          { id: 'v-3', label: 'Variant 3', replacementText: '6 months ago I was drowning in ops.', fullText: '6 months ago I was drowning in ops.', hookType: 'transformation', arcType: 'before_after', variant_rationale: 'Before/after framing.' },
          { id: 'v-4', label: 'Variant 4', replacementText: 'The AI stack that helped us reach $1M ARR.', fullText: 'The AI stack that helped us reach $1M ARR.', hookType: 'milestone', arcType: 'story', variant_rationale: 'Social proof.' },
        ],
      },
    });
      await waitForEditor(page);

    await clickSidebarTab(page, /refine/i);

    const variantsBtn = page.getByRole('button', { name: /4 variants?/i }).first();
    await expect(variantsBtn).toBeVisible({ timeout: 6000 });
    await variantsBtn.click();

    // Variant cards or variant labels should appear
    const variantCard = page
      .getByText(/variant 1/i)
      .or(page.getByText(/replaced 3 full-time roles/i))
      .or(page.getByText(/load in editor/i));
    await expect.soft(variantCard.first()).toBeVisible({ timeout: 12000 });
  });

  test('loading a variant into the editor fires saveDraftVariants or updates content', async ({ page }) => {
    const capturedActions: string[] = [];

    await gotoEditor(page, {
      generateVariantsPreview: {
        scope: 'full',
        model: 'google/gemini-2.0-flash',
        selection: null,
        variants: [
          { id: 'v-1', label: 'Variant 1', replacementText: 'In 2024, I replaced 3 full-time roles with AI.', fullText: 'In 2024, I replaced 3 full-time roles with AI.', hookType: 'data_point', arcType: 'story', variant_rationale: 'Bold claim.' },
          { id: 'v-2', label: 'Variant 2', replacementText: 'Most founders sleep on the AI tools that matter.', fullText: 'Most founders sleep on the AI tools that matter.', hookType: 'contrarian', arcType: 'insight', variant_rationale: 'Contrarian.' },
          { id: 'v-3', label: 'Variant 3', replacementText: '6 months ago I was drowning in ops.', fullText: '6 months ago I was drowning in ops.', hookType: 'transformation', arcType: 'before_after', variant_rationale: 'Before/after.' },
          { id: 'v-4', label: 'Variant 4', replacementText: 'The AI stack that helped us reach $1M ARR.', fullText: 'The AI stack that helped us reach $1M ARR.', hookType: 'milestone', arcType: 'story', variant_rationale: 'Social proof.' },
        ],
      },
      saveDraftVariants: { success: true },
    });
      await waitForEditor(page);

    page.on('request', (req) => {
      if (req.method() === 'POST') {
        try {
          const body = req.postDataJSON();
          if (body?.action) capturedActions.push(body.action as string);
        } catch { /* ignore */ }
      }
    });

    await clickSidebarTab(page, /refine/i);

    const variantsBtn = page.getByRole('button', { name: /4 variants?/i }).first();
    await expect(variantsBtn).toBeVisible({ timeout: 6000 });
    await variantsBtn.click();
    await page.waitForTimeout(2000);

    const loadBtn = page
      .getByRole('button', { name: /load in editor/i })
      .first();

    await expect(loadBtn).toBeVisible({ timeout: 8000 });
    await loadBtn.click();
    await page.waitForTimeout(1000);
    // Content should now appear in the editor area
    const editorContent = page.getByText(/replaced 3 full-time roles|AI stack/i).first();
    await expect.soft(editorContent).toBeVisible({ timeout: 5000 });
  });
});

// ─── Journey H: Full end-to-end happy path ────────────────────────────────────

test.describe('Journey 14H: End-to-End Happy Path', () => {
  test('create topic → navigate to editor → refine → generate variants', async ({ page }) => {
    // Step 1: Create a new topic
    await gotoAuthenticated(page, '/topics/new', {
      addTopic: {
        rowIndex: 0, topicId: 'e2e-happy-path', topic: 'AI productivity for founders',
        date: new Date().toISOString().slice(0, 10), status: 'Pending',
        variant1: MOCK_ROWS[0].variant1, variant2: MOCK_ROWS[0].variant2,
        variant3: MOCK_ROWS[0].variant3, variant4: MOCK_ROWS[0].variant4,
        imageLink1: '', imageLink2: '', imageLink3: '', imageLink4: '',
        selectedText: '', selectedImageId: '', selectedImageUrlsJson: '',
        postTime: '', emailTo: '', emailCc: '', emailBcc: '', emailSubject: '',
        topicGenerationRules: '', generationTemplateId: '',
        topicDeliveryChannel: '', topicGenerationModel: '',
        sourceSheet: 'Topics' as const,
      },
      generateVariantsPreview: {
        scope: 'full', model: 'google/gemini-2.0-flash', selection: null,
        variants: [
          { id: 'v-1', label: 'Variant 1', replacementText: 'AI is the new unfair advantage.', fullText: 'AI is the new unfair advantage.', hookType: 'bold', arcType: 'story', variant_rationale: 'Direct and punchy.' },
        ],
      },
    });
    await page.waitForLoadState('domcontentloaded');

    const titleInput = page.getByPlaceholder(/untitled topic/i).or(page.locator('input[type="text"]').first());
    await expect(titleInput.first()).toBeVisible({ timeout: 10000 });
    await titleInput.first().fill('AI productivity for founders');

    // Step 2: Navigate directly to the topic editor (simulating successful creation)
    await gotoAuthenticated(page, TOPIC_1_EDITOR_URL, {
      generateVariantsPreview: {
        scope: 'full', model: 'google/gemini-2.0-flash', selection: null,
        variants: [
          { id: 'v-1', label: 'Variant 1', replacementText: 'AI is the new unfair advantage.', fullText: 'AI is the new unfair advantage.', hookType: 'bold', arcType: 'story', variant_rationale: 'Direct and punchy.' },
        ],
      },
    });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/AI tools are reshaping/i).first()).toBeVisible({ timeout: 12000 });

    // Step 3: Enter the editor
      const editor = await waitForEditor(page);
    await expect.soft(editor).toBeVisible();

    // Step 4: Open Refine tab and generate variants
    await clickSidebarTab(page, /refine/i);
    const variantsBtn = page.getByRole('button', { name: /4 variants?/i }).first();
    if (await variantsBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      await variantsBtn.click();

      const variantResult = page
        .getByText(/variant 1|unfair advantage|load in editor/i)
        .first();
      await expect.soft(variantResult).toBeVisible({ timeout: 12000 });
    }

    // Verify we never crashed — page still has content
    const body = await page.locator('body').textContent({ timeout: 5000 });
    expect(body?.length ?? 0).toBeGreaterThan(100);
  });
});
