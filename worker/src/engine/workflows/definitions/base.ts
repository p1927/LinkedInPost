import type { WorkflowDefinition } from '../../types';

export const baseWorkflow: WorkflowDefinition = {
  id: 'base',
  name: 'Base Workflow',
  description: 'Foundation workflow — all nodes active at moderate importance',
  optimizationTarget: 'balanced quality across all dimensions',
  extendsWorkflowId: undefined,
  nodeConfigs: [
    {
      nodeId: 'psychology-analyzer',
      importance: 'important',
      dependsOn: [],
    },
    {
      nodeId: 'research-context',
      importance: 'important',
      dependsOn: [],
    },
    {
      nodeId: 'vocabulary-selector',
      importance: 'supporting',
      dependsOn: ['psychology-analyzer'],
    },
    {
      nodeId: 'hook-designer',
      importance: 'important',
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
      // vocabulary-selector is explicitly listed because buildGenerationBrief reads vocabularySelection
      dependsOn: ['narrative-arc', 'hook-designer', 'vocabulary-selector'],
    },
    {
      nodeId: 'tone-calibrator',
      importance: 'supporting',
      dependsOn: ['draft-generator', 'vocabulary-selector'],
    },
    {
      nodeId: 'constraint-validator',
      importance: 'important',
      dependsOn: ['tone-calibrator', 'draft-generator'],
    },
  ],
  generationInstruction:
    'Produce well-structured, authentic content that serves the audience genuinely. Balance information and emotion.',
};

export default baseWorkflow;
