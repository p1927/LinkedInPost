// worker/src/generation/__tests__/nodeInsightSummary.test.ts
import { describe, it, expect } from 'vitest';
import { buildNodeInsightSummary } from '../nodeInsightSummary';

describe('buildNodeInsightSummary', () => {
  it('returns null for unknown node', () => {
    expect(buildNodeInsightSummary('unknown-node', '{}')).toBeNull();
  });

  it('returns null for constraint-validator', () => {
    expect(buildNodeInsightSummary('constraint-validator', '{}')).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    expect(buildNodeInsightSummary('psychology-analyzer', 'not-json')).toBeNull();
  });

  it('extracts psychology emotion and triggers', () => {
    const output = JSON.stringify({
      dominantEmotion: 'hope',
      triggers: [{ type: 'aspiration' }, { type: 'urgency' }],
    });
    const result = buildNodeInsightSummary('psychology-analyzer', output);
    expect(result).toContain('hope');
    expect(result).toContain('aspiration');
  });

  it('extracts vocabulary power words', () => {
    const output = JSON.stringify({ powerWords: ['bold', 'unstoppable', 'proven'] });
    const result = buildNodeInsightSummary('vocabulary-selector', output);
    expect(result).toBe('Power words: bold, unstoppable, proven');
  });

  it('extracts draft variant count', () => {
    const output = JSON.stringify({ variants: [{}, {}, {}] });
    expect(buildNodeInsightSummary('draft-generator', output)).toBe('3 variants generated');
  });

  it('returns tone-calibrator string', () => {
    expect(buildNodeInsightSummary('tone-calibrator', '{}')).toBe('Tone adjusted to author voice');
  });
});
