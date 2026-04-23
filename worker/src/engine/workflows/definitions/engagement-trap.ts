import type { WorkflowDefinition } from '../../types';

export const engagementTrapWorkflow: WorkflowDefinition = {
  id: 'engagement-trap',
  name: 'Engagement Trap',
  description: 'Controversy-driven, comment-maximising content',
  optimizationTarget: 'comment volume and substantive discussion',
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
      importance: 'background',
      dependsOn: ['psychology-analyzer'],
    },
    {
      nodeId: 'hook-designer',
      importance: 'critical',
      dependsOn: ['psychology-analyzer', 'research-context'],
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
      importance: 'supporting',
      dependsOn: ['draft-generator', 'vocabulary-selector'],
    },
    {
      nodeId: 'constraint-validator',
      importance: 'important',
      dependsOn: ['tone-calibrator', 'draft-generator'],
    },
  ],
  skipNodeIds: [],
  generationInstruction:
    'Open with a statement that will make readers stop and disagree OR passionately agree. The body must defend the position with just enough argument to provoke a response — do not resolve the tension. End with a direct, specific question that forces people to pick a side or share their experience. The goal is substantive comments (10+ words). Never be deliberately offensive — be deliberately provocative on a professional topic.',
};

export default engagementTrapWorkflow;
