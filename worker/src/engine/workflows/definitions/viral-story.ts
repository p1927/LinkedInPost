import type { WorkflowDefinition } from '../../types';

export const viralStoryWorkflow: WorkflowDefinition = {
  id: 'viral-story',
  name: 'Viral Story',
  description: 'Emotional, personal, share-driven content',
  optimizationTarget: 'emotional resonance and shareability',
  extendsWorkflowId: 'base',
  nodeConfigs: [
    {
      nodeId: 'psychology-analyzer',
      importance: 'critical',
      dependsOn: [],
    },
    {
      nodeId: 'research-context',
      importance: 'background',
      dependsOn: [],
    },
    {
      nodeId: 'vocabulary-selector',
      importance: 'supporting',
      dependsOn: ['psychology-analyzer'],
    },
    {
      nodeId: 'hook-designer',
      importance: 'critical',
      dependsOn: ['psychology-analyzer', 'research-context'],
    },
    {
      nodeId: 'narrative-arc',
      importance: 'important',
      dependsOn: ['hook-designer', 'psychology-analyzer'],
    },
    {
      nodeId: 'draft-generator',
      importance: 'critical',
      dependsOn: ['narrative-arc', 'hook-designer'],
    },
    {
      nodeId: 'tone-calibrator',
      importance: 'important',
      dependsOn: ['draft-generator', 'vocabulary-selector'],
    },
    {
      nodeId: 'constraint-validator',
      importance: 'important',
      dependsOn: ['tone-calibrator', 'draft-generator'],
    },
  ],
  generationInstruction:
    "Lead with a raw, personal hook that triggers immediate identification. Use the Hook → Story → Lesson arc. The middle must create emotional tension. End with a question that invites vulnerable or opinionated responses. No corporate language. No lists. Sound like one human talking to another.",
};

export default viralStoryWorkflow;
