import { describe, it, expect } from 'vitest';
import { buildCandidatesFromRelator, scoreCandidateQuality, rankCandidates } from './imagePicker';
import type { ImageCandidate } from '../types';
import type { ImageRelatorOutput } from './imageRelator';

// Minimal env for buildCandidatesFromRelator (LLM-free path uses generateImagesForVariant
// which requires env keys — we mock the entire generation/search to test only the scorer/ranker)
const makeEnv = () => ({} as Parameters<typeof buildCandidatesFromRelator>[2]);

const makeRelator = (overrides?: Partial<ImageRelatorOutput>): ImageRelatorOutput => ({
  visualBrief: 'A professional tech workspace with AI tools and clean desk setup.',
  styleHints: ['clean layout', 'corporate palette'],
  searchKeywords: ['AI productivity', 'workspace', 'tech setup'],
  genPrompts: ['AI productivity workspace illustration'],
  ...overrides,
});

// ------------------------------------------------------------------
// scoreCandidateQuality
// ------------------------------------------------------------------
describe('scoreCandidateQuality', () => {
  it('adds imageQualityScore (0–1) to the candidate', () => {
    const rel = makeRelator();
    const cand: ImageCandidate = { id: 'c1', url: 'https://example.com/img.jpg', visualBrief: rel.visualBrief, score: 0 };
    const scored = scoreCandidateQuality(cand, rel);

    expect(scored).toHaveProperty('imageQualityScore');
    expect(scored.imageQualityScore).toBeGreaterThanOrEqual(0);
    expect(scored.imageQualityScore).toBeLessThanOrEqual(1);
  });

  it('assigns higher quality to candidates with a real URL', () => {
    const rel = makeRelator();
    const withUrl: ImageCandidate = { id: 'c1', url: 'https://example.com/img.jpg', visualBrief: rel.visualBrief, score: 0 };
    const withoutUrl: ImageCandidate = { id: 'c2', visualBrief: rel.visualBrief, score: 0 };

    const scoredWith = scoreCandidateQuality(withUrl, rel);
    const scoredWithout = scoreCandidateQuality(withoutUrl, rel);

    expect(scoredWith.imageQualityScore!).toBeGreaterThan(scoredWithout.imageQualityScore!);
  });

  it('assigns higher quality to candidates with a generationPrompt than stub IDs', () => {
    const rel = makeRelator();
    const withPrompt: ImageCandidate = {
      id: 'gen-abc',
      generationPrompt: 'a bright office',
      visualBrief: rel.visualBrief,
      score: 0,
    };
    const stubOnly: ImageCandidate = {
      id: 'stub-search-0-0',
      searchQuery: 'office',
      visualBrief: rel.visualBrief,
      score: 0,
    };

    const scoredWith = scoreCandidateQuality(withPrompt, rel);
    const scoredStub = scoreCandidateQuality(stubOnly, rel);

    expect(scoredWith.imageQualityScore!).toBeGreaterThan(scoredStub.imageQualityScore!);
  });

  it('relevance score increases when candidate text matches brief keywords', () => {
    const rel = makeRelator({ searchKeywords: ['AI productivity', 'workspace'], styleHints: [] });
    const matchCand: ImageCandidate = {
      id: 'c1',
      searchQuery: 'AI productivity workspace',
      visualBrief: rel.visualBrief,
      score: 0,
    };
    const noMatchCand: ImageCandidate = {
      id: 'c2',
      searchQuery: 'garden flowers',
      visualBrief: rel.visualBrief,
      score: 0,
    };

    const scoredMatch = scoreCandidateQuality(matchCand, rel);
    const scoredNoMatch = scoreCandidateQuality(noMatchCand, rel);

    // A match with keywords should score higher overall
    expect(scoredMatch.score).toBeGreaterThan(scoredNoMatch.score);
  });

  it('returns a new object, does not mutate the original', () => {
    const rel = makeRelator();
    const orig: ImageCandidate = { id: 'c1', url: 'https://x.com/img.jpg', visualBrief: 'brief', score: 0 };
    const scored = scoreCandidateQuality(orig, rel);

    expect(scored).not.toBe(orig);
    expect(orig).not.toHaveProperty('imageQualityScore');
  });

  it('rounds composite score to 3 decimal places', () => {
    const rel = makeRelator();
    const cand: ImageCandidate = { id: 'c1', url: 'https://x.com/img.jpg', visualBrief: 'brief', score: 0 };
    const scored = scoreCandidateQuality(cand, rel);

    // 3 decimal places means no more than 3 digits after decimal point
    const decimalPart = scored.score.toString().split('.')[1] ?? '';
    expect(decimalPart.length).toBeLessThanOrEqual(3);
  });
});

// ------------------------------------------------------------------
// rankCandidates
// ------------------------------------------------------------------
describe('rankCandidates', () => {
  it('sorts candidates in descending score order', () => {
    const candidates: ImageCandidate[] = [
      { id: 'c3', score: 0.3, visualBrief: 'b' },
      { id: 'c1', score: 0.9, visualBrief: 'b' },
      { id: 'c2', score: 0.6, visualBrief: 'b' },
    ];

    const ranked = rankCandidates(candidates);

    expect(ranked[0].id).toBe('c1');
    expect(ranked[1].id).toBe('c2');
    expect(ranked[2].id).toBe('c3');
  });

  it('does not mutate the original array', () => {
    const candidates: ImageCandidate[] = [
      { id: 'c1', score: 0.1, visualBrief: 'b' },
      { id: 'c2', score: 0.9, visualBrief: 'b' },
    ];
    const copy = [...candidates];
    rankCandidates(candidates);
    expect(candidates).toEqual(copy);
  });

  it('handles an empty array without throwing', () => {
    expect(() => rankCandidates([])).not.toThrow();
    expect(rankCandidates([])).toEqual([]);
  });

  it('handles a single candidate', () => {
    const candidates: ImageCandidate[] = [{ id: 'only', score: 0.5, visualBrief: 'b' }];
    const ranked = rankCandidates(candidates);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('only');
  });

  it('handles tied scores by preserving original order', () => {
    const candidates: ImageCandidate[] = [
      { id: 'first', score: 0.7, visualBrief: 'b' },
      { id: 'second', score: 0.7, visualBrief: 'b' },
    ];
    const ranked = rankCandidates(candidates);
    // Tied — sort is stable, so original order preserved
    expect(ranked.map((c) => c.id)).toEqual(['first', 'second']);
  });
});

// ------------------------------------------------------------------
// buildCandidatesFromRelator (no-LLM path / stub fallback)
// ------------------------------------------------------------------
describe('buildCandidatesFromRelator', () => {
  it('returns stub candidates for all searchKeywords when no generated results exist', async () => {
    const rel = makeRelator({
      searchKeywords: ['AI tools', 'productivity app'],
      genPrompts: [],
    });

    // Without env keys, generateImagesForVariant returns [].
    // We test the stub path that creates fallback candidates keyed to keywords.
    const result = await buildCandidatesFromRelator(rel, 0, makeEnv());

    expect(result.length).toBeGreaterThan(0);
    // Stubs for searchKeywords
    const searchStubs = result.filter((c) => c.id.startsWith('stub-search'));
    expect(searchStubs).toHaveLength(2);
    expect(searchStubs[0].searchQuery).toBe('AI tools');
    expect(searchStubs[1].searchQuery).toBe('productivity app');
  });

  it('returns stub candidates for all genPrompts when no generated results exist', async () => {
    const rel = makeRelator({
      searchKeywords: [],
      genPrompts: ['photo of modern office', 'workspace illustration'],
    });

    const result = await buildCandidatesFromRelator(rel, 0, makeEnv());

    const genStubs = result.filter((c) => c.id.startsWith('stub-gen'));
    expect(genStubs).toHaveLength(2);
    expect(genStubs[0].generationPrompt).toBe('photo of modern office');
    expect(genStubs[1].generationPrompt).toBe('workspace illustration');
  });

  it('stub candidates carry the visualBrief from the relator', async () => {
    const rel = makeRelator({ visualBrief: 'A bright minimal workspace.' });
    const result = await buildCandidatesFromRelator(rel, 0, makeEnv());

    result.forEach((c) => {
      expect(c.visualBrief).toBe('A bright minimal workspace.');
    });
  });

  it('stub candidates are assigned the variantIndex', async () => {
    const rel = makeRelator();
    const result = await buildCandidatesFromRelator(rel, 2, makeEnv());

    result.forEach((c) => {
      expect(c.variantIndex).toBe(2);
    });
  });

  it('stub candidates carry an imageQualityScore', async () => {
    const rel = makeRelator();
    const result = await buildCandidatesFromRelator(rel, 0, makeEnv());

    result.forEach((c) => {
      expect(c.imageQualityScore).toBeDefined();
    });
  });

  it('rankCandidates sorts descending by score', async () => {
    const { rankCandidates } = await import('./imagePicker');
    const candidates = [
      { id: 'low', score: 0.2, visualBrief: '' },
      { id: 'high', score: 0.9, visualBrief: '' },
      { id: 'mid', score: 0.5, visualBrief: '' },
    ] as ImageCandidate[];
    const result = rankCandidates(candidates);
    expect(result[0].id).toBe('high');
    expect(result[1].id).toBe('mid');
    expect(result[2].id).toBe('low');
  });
});
