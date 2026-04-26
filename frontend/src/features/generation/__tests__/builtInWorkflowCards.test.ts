import { describe, it, expect } from 'vitest';
import { BUILT_IN_WORKFLOW_CARDS, DIMENSION_KEYS } from '../builtInWorkflowCards';

describe('BUILT_IN_WORKFLOW_CARDS dimensionWeights', () => {
  it('every card has dimensionWeights with all 7 dimension keys', () => {
    for (const card of BUILT_IN_WORKFLOW_CARDS) {
      expect(card.dimensionWeights, `${card.id} missing dimensionWeights`).toBeDefined();
      for (const key of DIMENSION_KEYS) {
        expect(
          card.dimensionWeights[key],
          `${card.id} missing dimension ${key}`,
        ).toBeDefined();
      }
    }
  });

  it('all dimension weight values are between 0 and 100', () => {
    for (const card of BUILT_IN_WORKFLOW_CARDS) {
      for (const [key, val] of Object.entries(card.dimensionWeights)) {
        expect(val, `${card.id}.${key} out of range`).toBeGreaterThanOrEqual(0);
        expect(val, `${card.id}.${key} out of range`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('has exactly 13 cards', () => {
    expect(BUILT_IN_WORKFLOW_CARDS).toHaveLength(13);
  });
});
