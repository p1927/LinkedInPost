/**
 * testData.ts — Shared test data generators and auth helpers.
 *
 * Drop-in replacement for tests/e2e/helpers/testData.ts.
 */

import type { Page } from '@playwright/test';
import type { SheetRow } from '../../src/services/sheets';

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

/**
 * Generates an array of synthetic SheetRow objects for campaign-level tests.
 */
export function generateTestCampaign(count: number = 5): SheetRow[] {
  const topics = [
    'AI Automation Trends 2024',
    'Startup Growth Strategies',
    'Remote Work Productivity',
    'Leadership Development',
    'Marketing Innovation',
  ];

  return Array.from({ length: count }, (_, i) => ({
    rowIndex: i,
    sourceSheet: 'Topics' as const,
    topicId: `topic-${i + 1}`,
    topic: topics[i % topics.length],
    date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    variant1: '',
    variant2: '',
    variant3: '',
    variant4: '',
    imageLink1: '',
    imageLink2: '',
    imageLink3: '',
    imageLink4: '',
    selectedText: '',
    selectedImageId: '',
    selectedImageUrlsJson: '',
    postTime: '09:00',
    emailTo: '',
    emailCc: '',
    emailBcc: '',
    emailSubject: '',
    topicGenerationRules: '',
    generationTemplateId: '',
    topicDeliveryChannel: '',
    topicGenerationModel: '',
  }));
}

/**
 * Generates synthetic news article objects for research-flow tests.
 */
export function generateTestArticle(count: number = 10) {
  return Array.from({ length: count }, (_, i) => ({
    title: `Test Article ${i + 1}`,
    url: `https://example.com/article-${i + 1}`,
    source: 'Test Source',
    publishedAt: new Date().toISOString(),
    snippet: 'This is a test article snippet for testing purposes.',
  }));
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

/**
 * Marks the session as authenticated for E2E tests by injecting a fake token
 * into localStorage before the app boots.
 *
 * The Vite dev server reads VITE_DEV_GOOGLE_AUTH_BYPASS_SECRET from
 * .env.development to accept this token without a real Google OAuth round-trip.
 * Default value: 'local-dev-google-auth-bypass-linkedinpost'
 *
 * This function must be called BEFORE page.goto() — it uses addInitScript so
 * the token is present before any React code runs.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('google_id_token', 'e2e-test-token');
  });
}
