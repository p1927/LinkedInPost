import type { WorkflowDefinition } from '../../types';

export const trendCommentaryWorkflow: WorkflowDefinition = {
  id: 'trend-commentary',
  name: 'Industry Trend & Commentary',
  description: 'Pattern recognition — something shifting, emerging, or accelerating in your industry',
  optimizationTarget: 'thought leadership and forward-looking authority',
  extendsWorkflowId: 'base',
  nodeConfigs: [
    {
      nodeId: 'psychology-analyzer',
      importance: 'supporting',
      dependsOn: [],
    },
    {
      nodeId: 'research-context',
      importance: 'critical',
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
      dependsOn: ['psychology-analyzer', 'research-context'],
    },
    {
      nodeId: 'narrative-arc',
      importance: 'critical',
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
  generationInstruction:
    "Structure: HOOK (state the trend in one sharp, surprising sentence) → EVIDENCE (2-3 data points, examples, or observations proving it's real) → THE SHIFT (what this is replacing or disrupting — the before/after) → WHY NOW (why is this happening at this particular moment?) → IMPLICATION (what should reader do/think/prepare for?) → CTA (do they agree? what are they seeing?). Be specific about timing: 'in the last 6 months' not 'lately'. Name something before everyone else is talking about it. Acknowledge the counter-argument briefly — it makes your take more credible.",
};

export default trendCommentaryWorkflow;
