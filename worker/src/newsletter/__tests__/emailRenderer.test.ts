/**
 * worker/src/newsletter/__tests__/emailRenderer.test.ts
 *
 * Unit tests for newsletter email rendering module compilation.
 *
 * Spec Issue:
 *   1. renderFallbackNewsletter function has `const` as a parameter name —
 *      a syntax error that prevents the worker from building.
 *      Lines 252-264: function renderFallbackNewsletter(
 *        const items = articles.map(...).join('');
 *      Fix: change parameter to `items: string` and fix body accordingly.
 *
 *   2. renderNewsletterEmail must compile without TypeScript errors.
 *   3. renderNewsletterPreview must produce valid HTML output.
 *   4. Newsletter components must render correctly.
 *
 * These tests FAIL if the implementation doesn't meet the spec.
 *
 * Strategy:
 *   - renderFallbackNewsletter is not exported — we verify compilation via
 *     the module import smoke test.
 *   - renderNewsletterPreview IS exported — we test its output.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResearchArticle } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeArticle(overrides: Partial<ResearchArticle> = {}): ResearchArticle {
  return {
    title: 'Sample Article Title',
    url: 'https://example.com/article',
    source: 'Example Source',
    publishedAt: '2026-05-01T10:00:00Z',
    snippet: 'This is a sample snippet for the article.',
    provider: 'rss',
    ...overrides,
  };
}

// ─── TypeScript compilation smoke tests ───────────────────────────────────────

/**
 * Spec Issue #1 (worker/src/newsletter/emailRenderer.ts):
 *   renderFallbackNewsletter has `const` as a parameter name — a syntax error
 *   on lines 252-264 that prevents the worker from building.
 *
 *   Wrong:  function renderFallbackNewsletter(const items = articles.map(...).join(''))
 *   Right:  function renderFallbackNewsletter(articles: ResearchArticle[], ...): string
 *
 * These tests verify the module compiles by importing it successfully.
 * If there is a syntax error, the import will throw and tests will FAIL.
 *
 * Spec requirement: "npm run build in worker/ completes without TypeScript errors"
 */
describe('worker emailRenderer TypeScript compilation', () => {
  it('emailRenderer module compiles without errors (catches const-as-param syntax error)', async () => {
    vi.resetModules();
    // If emailRenderer.ts has a syntax error (e.g., `const` as a parameter name),
    // this import will throw and the test will FAIL.
    await expect(import('../emailRenderer')).resolves.toBeDefined();
  });

  it('emailRenderer module exports renderNewsletterEmail', async () => {
    vi.resetModules();
    const mod = await import('../emailRenderer');
    expect(typeof mod.renderNewsletterEmail).toBe('function');
  });

  it('emailRenderer module exports renderNewsletterPreview', async () => {
    vi.resetModules();
    const mod = await import('../emailRenderer');
    expect(typeof mod.renderNewsletterPreview).toBe('function');
  });

  it('renderFallbackNewsletter is not exported but module compiles (it is internal)', async () => {
    vi.resetModules();
    const mod = await import('../emailRenderer');
    // renderFallbackNewsletter is used internally and not in the public API.
    // The module must still compile, which it does if there is no syntax error.
    expect(typeof mod.renderNewsletterEmail).toBe('function');
  });
});

// ─── renderNewsletterPreview functional tests ──────────────────────────────────

/**
 * Spec Acceptance Criteria:
 *   - Newsletter components must render correctly.
 *
 * renderNewsletterPreview produces an HTML preview used for displaying
 * newsletter content in the UI. These tests verify the output is valid.
 */
describe('renderNewsletterPreview', () => {
  let renderNewsletterPreview: (
    articles: ResearchArticle[],
    options: {
      processingNote: string;
      emotionTarget: string;
      colorEmotionTarget: string;
      storyFramework: string;
      authorPersona: string;
      writingStyleExamples: string;
      newsletterIntro: string;
      newsletterOutro: string;
      processingTemplate: string;
    },
  ) => string;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../emailRenderer');
    renderNewsletterPreview = mod.renderNewsletterPreview;
  });

  it('is importable', () => {
    expect(typeof renderNewsletterPreview).toBe('function');
  });

  it('returns a string', () => {
    const result = renderNewsletterPreview([makeArticle()], {
      processingNote: 'Test processing note',
      emotionTarget: 'optimistic',
      colorEmotionTarget: 'vibrant',
      storyFramework: 'problem-solution',
      authorPersona: 'Tech enthusiast',
      writingStyleExamples: 'Clear and concise',
      newsletterIntro: 'Welcome to this edition!',
      newsletterOutro: 'Thanks for reading!',
      processingTemplate: 'curated-digest',
    });
    expect(typeof result).toBe('string');
  });

  it('returns a complete HTML document', () => {
    const result = renderNewsletterPreview([makeArticle()], {
      processingNote: '',
      emotionTarget: '',
      colorEmotionTarget: '',
      storyFramework: '',
      authorPersona: '',
      writingStyleExamples: '',
      newsletterIntro: '',
      newsletterOutro: '',
      processingTemplate: 'curated-digest',
    });
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html>');
    expect(result).toContain('</html>');
    expect(result).toContain('<head>');
    expect(result).toContain('<body>');
  });

  it('includes article title and source', () => {
    const article = makeArticle({
      title: 'AI Advances in 2026',
      source: 'Tech News',
      url: 'https://tech.example.com/ai-2026',
      snippet: 'Major breakthroughs in AI this year.',
    });
    const result = renderNewsletterPreview([article], {
      processingNote: '',
      emotionTarget: '',
      colorEmotionTarget: '',
      storyFramework: '',
      authorPersona: '',
      writingStyleExamples: '',
      newsletterIntro: '',
      newsletterOutro: '',
      processingTemplate: 'curated-digest',
    });
    expect(result).toContain('AI Advances in 2026');
    expect(result).toContain('Tech News');
    expect(result).toContain('tech.example.com/ai-2026');
  });

  it('includes newsletter intro block when provided', () => {
    const result = renderNewsletterPreview([makeArticle()], {
      processingNote: '',
      emotionTarget: '',
      colorEmotionTarget: '',
      storyFramework: '',
      authorPersona: '',
      writingStyleExamples: '',
      newsletterIntro: 'Welcome to the weekly digest!',
      newsletterOutro: '',
      processingTemplate: 'curated-digest',
    });
    expect(result).toContain('Welcome to the weekly digest!');
  });

  it('includes newsletter outro block when provided', () => {
    const result = renderNewsletterPreview([makeArticle()], {
      processingNote: '',
      emotionTarget: '',
      colorEmotionTarget: '',
      storyFramework: '',
      authorPersona: '',
      writingStyleExamples: '',
      newsletterIntro: '',
      newsletterOutro: 'See you next week!',
      processingTemplate: 'curated-digest',
    });
    expect(result).toContain('See you next week!');
  });

  it('includes enrichment note when processingNote is provided', () => {
    const result = renderNewsletterPreview([makeArticle()], {
      processingNote: 'Focus on AI and automation',
      emotionTarget: 'curious',
      colorEmotionTarget: 'warm',
      storyFramework: 'narrative',
      authorPersona: '',
      writingStyleExamples: '',
      newsletterIntro: '',
      newsletterOutro: '',
      processingTemplate: 'curated-digest',
    });
    expect(result).toContain('Focus on AI and automation');
  });

  it('handles empty articles array without crashing', () => {
    expect(() =>
      renderNewsletterPreview([], {
        processingNote: '',
        emotionTarget: '',
        colorEmotionTarget: '',
        storyFramework: '',
        authorPersona: '',
        writingStyleExamples: '',
        newsletterIntro: '',
        newsletterOutro: '',
        processingTemplate: 'curated-digest',
      }),
    ).not.toThrow();
  });

  it('renders article snippets when provided', () => {
    const article = makeArticle({
      snippet: 'AI transforms healthcare in unprecedented ways.',
    });
    const result = renderNewsletterPreview([article], {
      processingNote: '',
      emotionTarget: '',
      colorEmotionTarget: '',
      storyFramework: '',
      authorPersona: '',
      writingStyleExamples: '',
      newsletterIntro: '',
      newsletterOutro: '',
      processingTemplate: 'curated-digest',
    });
    expect(result).toContain('AI transforms healthcare in unprecedented ways.');
  });
});
