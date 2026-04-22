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

export async function loginAsTestUser(page: Page) {
  // Helper for authenticated tests - depends on auth bypass being enabled
  // This is a placeholder for future authentication testing
  await page.goto('/');
}