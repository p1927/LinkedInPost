import { describe, it, expect } from 'vitest';
import type { Pattern, RequirementReport, TextVariant } from '../types';
import type { Env } from '../types';

// We test the synchronous helpers and the shape of the output by mocking the LLM.
// Since we cannot call the real LLM in unit tests, we test:
//  1. shape of fallback output when no LLM is available
//  2. output structure validity

const makeMinimalEnv = (): Env => ({} as Env);

const makeReport = (overrides?: Partial<RequirementReport>): RequirementReport => ({
  channel: 'linkedin',
  audience: 'professionals',
  tone: 'professional',
  jtbd: '',
  factual: false,
  mustInclude: [],
  mustAvoid: [],
  cta: '',
  topic: 'AI productivity',
  contentSummary: 'Tips for using AI to boost productivity at work',
  optionalUrl: undefined,
  constraints: '',
  articleInsights: undefined,
  ...overrides,
});

const makePattern = (imageHints?: Pattern['imageHints']): Pattern => ({
  id: 'opinionated-stat',
  version: '1.0.0',
  name: 'Opinionated Stat Hook',
  tags: {
    channels: ['linkedin'],
    audience: [],
    tone: [],
    jtbd: [],
    factual: false,
  },
  whenToUse: 'Use this when you have a compelling statistic or surprising fact.',
  outline: 'Hook → Stat → Context → Takeaway',
  writerSnippet: 'Here is a surprising fact about...',
  fewShotLines: [],
  maxPostChars: undefined,
  imageHints,
});

const makeVariant = (text?: string): TextVariant => ({
  index: 0,
  label: 'A',
  text: text ?? 'AI can help you get 40% more done. Here\'s how to make it work for you.',
});

describe('imageRelator – no-LLM fallback', () => {
  // When no LLM provider is configured, relateImages returns a structured
  // fallback with visualBrief, styleHints, searchKeywords, genPrompts.
  // This path is testable without mocks.

  it('returns a well-shaped ImageRelatorOutput when env has no LLM keys', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv(); // no GEMINI_API_KEY, no XAI_API_KEY, etc.
    const result = await relateImages(makeVariant(), makePattern(), makeReport(), env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    expect(result).toBeDefined();
    expect(typeof result.visualBrief).toBe('string');
    expect(result.visualBrief.length).toBeGreaterThan(0);
    expect(Array.isArray(result.styleHints)).toBe(true);
    expect(Array.isArray(result.searchKeywords)).toBe(true);
    expect(Array.isArray(result.genPrompts)).toBe(true);
  });

  it('includes the report topic in the visualBrief', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv();
    const report = makeReport({ topic: 'Remote work productivity' });
    const result = await relateImages(makeVariant(), makePattern(), report, env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    expect(result.visualBrief).toMatch(/remote work productivity/i);
  });

  it('maps opinionated tone to bold composition style hints', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv();
    const report = makeReport({ tone: 'opinionated' });
    const result = await relateImages(makeVariant(), makePattern(), report, env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    expect(result.styleHints).toContain('bold composition');
    expect(result.styleHints).toContain('high contrast');
  });

  it('maps inspirational tone to soft lighting style hints', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv();
    const report = makeReport({ tone: 'inspirational' });
    const result = await relateImages(makeVariant(), makePattern(), report, env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    expect(result.styleHints).toContain('soft lighting');
    expect(result.styleHints).toContain('aspirational mood');
  });

  it('merges pattern.imageHints.searchKeywords into searchKeywords', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv();
    const report = makeReport({ tone: 'opinionated' });
    const pattern = makePattern({
      mood: 'tech-forward',
      searchKeywords: ['neural network', 'productivity software', 'AI dashboard'],
    });
    const result = await relateImages(makeVariant(), pattern, report, env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    expect(result.searchKeywords).toContain('neural network');
    expect(result.searchKeywords).toContain('productivity software');
  });

  it('includes pattern mood in styleHints when present', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv();
    const pattern = makePattern({ mood: 'dark mode', searchKeywords: [] });
    const result = await relateImages(makeVariant(), pattern, makeReport(), env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    expect(result.styleHints).toContain('dark mode');
  });

  it('deduplicates style hints when tone hint and pattern mood overlap', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv();
    // 'opinionated' tone maps to 'bold composition', etc.
    // Adding 'bold composition' via pattern mood should not duplicate
    const pattern = makePattern({ mood: 'bold composition', searchKeywords: [] });
    const report = makeReport({ tone: 'opinionated' });
    const result = await relateImages(makeVariant(), pattern, report, env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    const boldCount = result.styleHints.filter((h) => h === 'bold composition').length;
    expect(boldCount).toBeLessThanOrEqual(1);
  });

  it('uses topic as search keyword when pattern has no searchKeywords', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv();
    const pattern = makePattern({ mood: '', searchKeywords: [] as string[] });
    const report = makeReport({ topic: 'distributed teams' });
    const result = await relateImages(makeVariant(), pattern, report, env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    expect(result.searchKeywords).toContain('distributed teams');
  });
});

describe('imageRelator output shape (shared contract)', () => {
  it('ImageRelatorOutput always has visualBrief, styleHints, searchKeywords, genPrompts', async () => {
    const { relateImages } = await import('./imageRelator');
    const env = makeMinimalEnv();
    const result = await relateImages(makeVariant(), makePattern(), makeReport(), env, {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
    });

    // Shape contract required by imagePicker
    expect(result).toHaveProperty('visualBrief');
    expect(result).toHaveProperty('styleHints');
    expect(result).toHaveProperty('searchKeywords');
    expect(result).toHaveProperty('genPrompts');
    expect(typeof result.visualBrief).toBe('string');
    expect(Array.isArray(result.styleHints)).toBe(true);
    expect(Array.isArray(result.searchKeywords)).toBe(true);
    expect(Array.isArray(result.genPrompts)).toBe(true);
  });
});
