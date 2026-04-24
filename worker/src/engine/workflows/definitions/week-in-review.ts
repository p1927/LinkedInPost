import type { WorkflowDefinition } from '../../types';

export const weekInReviewWorkflow: WorkflowDefinition = {
  id: 'week-in-review',
  name: 'Week in Review',
  description: 'Structured recap of what happened — personal, industry, or project',
  optimizationTarget: 'consistency, relatability, and recurring readership',
  extendsWorkflowId: 'base',
  nodeConfigs: [
    {
      nodeId: 'psychology-analyzer',
      importance: 'supporting',
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
    "Structure: HOOK (single highlight, lowlight, or surprising moment) → THE RECAP (3-5 items, bullets or numbered — be specific: numbers, names, real outcomes) → THE META (what does this week reveal about something bigger?) → PERSONAL (one honest reflection or feeling) → CTA (invite readers to share their own week). Include at least one lowlight or honest admission. Vague recaps die — be specific. The weekly cadence is the product.",
};

export default weekInReviewWorkflow;
