import { describe, it, expect } from 'vitest';
import {
  dimensionWeightsToNodeConfigs,
  customWorkflowToDefinition,
} from '../customWorkflowToDefinition';
import type { NodeWorkflowConfig } from '../../../engine/types';

const BASE_CONFIGS: NodeWorkflowConfig[] = [
  { nodeId: 'psychology-analyzer', importance: 'important', dependsOn: [] },
  { nodeId: 'vocabulary-selector',  importance: 'supporting', dependsOn: ['psychology-analyzer'] },
  { nodeId: 'draft-generator',      importance: 'critical',   dependsOn: ['vocabulary-selector'] },
];

describe('dimensionWeightsToNodeConfigs', () => {
  it('returns base configs unchanged when no weights override', () => {
    const result = dimensionWeightsToNodeConfigs({ psychology: 50 }, BASE_CONFIGS);
    const psych = result.find(c => c.nodeId === 'psychology-analyzer')!;
    // 50 → 'supporting' which is lower than 'important', so no change
    expect(psych.importance).toBe('important');
  });

  it('upgrades importance when weight is higher than base', () => {
    const result = dimensionWeightsToNodeConfigs({ psychology: 90 }, BASE_CONFIGS);
    const psych = result.find(c => c.nodeId === 'psychology-analyzer')!;
    expect(psych.importance).toBe('critical');
  });

  it('never sets draft-generator to off', () => {
    const result = dimensionWeightsToNodeConfigs({ copywriting: 5 }, BASE_CONFIGS);
    const draft = result.find(c => c.nodeId === 'draft-generator')!;
    expect(draft.importance).not.toBe('off');
  });

  it('preserves dependsOn arrays', () => {
    const result = dimensionWeightsToNodeConfigs({ vocabulary: 85 }, BASE_CONFIGS);
    const vocab = result.find(c => c.nodeId === 'vocabulary-selector')!;
    expect(vocab.dependsOn).toEqual(['psychology-analyzer']);
  });
});

describe('customWorkflowToDefinition', () => {
  it('maps all fields correctly', () => {
    const cw = {
      id: 'cw_test',
      userId: 'u1',
      name: 'My Workflow',
      description: 'desc',
      optimizationTarget: 'virality',
      generationInstruction: 'Be bold',
      extendsWorkflowId: 'base',
      nodeConfigs: BASE_CONFIGS,
      isDeleted: false,
      createdAt: '2026-04-26T00:00:00Z',
      updatedAt: '2026-04-26T00:00:00Z',
    };
    const def = customWorkflowToDefinition(cw);
    expect(def.id).toBe('cw_test');
    expect(def.name).toBe('My Workflow');
    expect(def.extendsWorkflowId).toBe('base');
    expect(def.nodeConfigs).toHaveLength(3);
  });
});
