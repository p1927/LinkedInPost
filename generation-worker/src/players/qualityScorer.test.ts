import { describe, it, expect } from 'vitest';
import { scoreDraftQuality } from './qualityScorer';
import type { TextVariant } from '../types';

describe('scoreDraftQuality', () => {
  it('scores a well-structured professional post', () => {
    const variants: TextVariant[] = [
      {
        index: 0,
        label: 'A',
        text: `Here's what most people miss about building great products.

I learned this the hard way after 10 years in the industry. The truth is simple: listen to your users.

What do you think? Share your experience below. #productmanagement #leadership`,
      },
    ];

    const scores = scoreDraftQuality(variants);

    expect(scores).toHaveLength(1);
    expect(scores[0].overall).toBeGreaterThanOrEqual(0);
    expect(scores[0].overall).toBeLessThanOrEqual(100);
    expect(scores[0].passed).toBe(true);
    expect(scores[0].clarity).toBeDefined();
    expect(scores[0].engagement).toBeDefined();
    expect(scores[0].structure).toBeDefined();
    expect(scores[0].professionalism).toBeDefined();
    expect(Array.isArray(scores[0].improvementHints)).toBe(true);
  });

  it('detects informal language in professionalism scoring', () => {
    const variants: TextVariant[] = [
      {
        index: 0,
        label: 'A',
        text: 'lol this is gonna be kinda awesome tbh',
      },
    ];

    const scores = scoreDraftQuality(variants);

    expect(scores).toHaveLength(1);
    const profGaps = scores[0].professionalism.gaps;
    expect(profGaps.some((g: string) => g.toLowerCase().includes('lol'))).toBe(true);
  });

  it('returns scores for multiple variants', () => {
    const variants: TextVariant[] = [
      { index: 0, label: 'A', text: 'Simple clear text here.' },
      { index: 1, label: 'B', text: 'Another variant with different content.' },
    ];

    const scores = scoreDraftQuality(variants);

    expect(scores).toHaveLength(2);
    expect(scores[0].clarity).toBeDefined();
    expect(scores[1].clarity).toBeDefined();
  });
});