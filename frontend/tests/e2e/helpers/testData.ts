import type { Page } from '@playwright/test';
import type { SheetRow } from '../../src/services/sheets';

export function generateTestCampaign(count: number = 5): SheetRow[] {
  const topics = [
    'AI Automation Trends 2024',
    'Startup Growth Strategies',
    'Remote Work Productivity',
    'Leadership Development',
    'Marketing Innovation',
  ];

  return Array.from({ length: count }, (_, i) => ({
    topicId: `topic-${i + 1}`,
    topic: topics[i % topics.length],
    date: new Date().toISOString().split('T')[0],
    status: 'draft',
    postTime: '09:00',
    linkedinUrl: '',
    generatedContent: '',
    approvedContent: '',
    approvedAt: '',
    publishedAt: '',
  }));
}

export function generateTestArticle(count: number = 10) {
  return Array.from({ length: count }, (_, i) => ({
    title: `Test Article ${i + 1}`,
    url: `https://example.com/article-${i + 1}`,
    source: 'Test Source',
    publishedAt: new Date().toISOString(),
    snippet: 'This is a test article snippet for testing purposes.',
  }));
}

/**
 * Wire auth bypass for E2E tests.
 * Sets localStorage with DEV_AUTH_BYPASS_SECRET.
 */
export async function loginAsTestUser(page: Page) {
  const devSecret = process.env.DEV_AUTH_BYPASS_SECRET || 'dev-bypass-secret-for-testing';
  
  // Navigate to app
  await page.goto('/');
  
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded');
  
  // Set localStorage with bypass token
  await page.evaluate((secret) => {
    localStorage.setItem('idToken', secret);
  }, devSecret);
  
  // Reload to apply token
  await page.reload();
  
  // Wait for app to load
  await page.waitForLoadState('networkidle');
}
