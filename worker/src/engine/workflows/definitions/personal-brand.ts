import type { WorkflowDefinition } from '../../types';

export const personalBrandWorkflow: WorkflowDefinition = {
  id: 'personal-brand',
  name: 'Personal Brand',
  description: 'Authentic, identity-building, niche-deepening content',
  optimizationTarget: 'follower loyalty and brand identity',
  extendsWorkflowId: 'base',
  nodeConfigs: [
    {
      nodeId: 'psychology-analyzer',
      importance: 'important',
      dependsOn: [],
    },
    {
      nodeId: 'research-context',
      importance: 'off',
      dependsOn: [],
    },
    {
      nodeId: 'vocabulary-selector',
      importance: 'important',
      dependsOn: ['psychology-analyzer'],
    },
    {
      nodeId: 'hook-designer',
      importance: 'important',
      // research-context is off in this workflow — hook relies on psychology only
      dependsOn: ['psychology-analyzer'],
    },
    {
      nodeId: 'narrative-arc',
      importance: 'supporting',
      dependsOn: ['hook-designer', 'psychology-analyzer'],
    },
    {
      nodeId: 'draft-generator',
      importance: 'critical',
      dependsOn: ['narrative-arc', 'hook-designer'],
    },
    {
      nodeId: 'tone-calibrator',
      importance: 'critical',
      dependsOn: ['draft-generator', 'vocabulary-selector'],
    },
    {
      nodeId: 'constraint-validator',
      importance: 'supporting',
      dependsOn: ['tone-calibrator', 'draft-generator'],
    },
  ],
  skipNodeIds: ['research-context'],
  generationInstruction:
    "This post must sound unmistakably like this specific person. Mirror their signature phrases from the vocabulary selection. Embrace their quirks, rhythms, and characteristic ways of opening and closing. The content should deepen the author's known positioning — not introduce new themes. Readers should think \"this is so them\" within the first two lines.",
};

export default personalBrandWorkflow;
