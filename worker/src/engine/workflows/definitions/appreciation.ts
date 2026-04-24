import type { WorkflowDefinition } from '../../types';

export const appreciationWorkflow: WorkflowDefinition = {
  id: 'appreciation',
  name: 'Appreciation & Recognition',
  description: 'Public acknowledgement of someone or something specific and meaningful',
  optimizationTarget: 'genuine connection, recognition, and community warmth',
  extendsWorkflowId: 'base',
  nodeConfigs: [
    {
      nodeId: 'psychology-analyzer',
      importance: 'critical',
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
      importance: 'critical',
      dependsOn: ['draft-generator', 'vocabulary-selector'],
    },
    {
      nodeId: 'constraint-validator',
      importance: 'important',
      dependsOn: ['tone-calibrator', 'draft-generator'],
    },
  ],
  generationInstruction:
    "Structure: HOOK (the specific action, moment, or quality being recognised) → WHO (who is this person and what do they do) → THE MOMENT (the specific thing that happened — not vague, not general) → WHY IT MATTERS (what it meant / what it revealed about them) → THE BROADER POINT (what does this example teach about a value or idea?) → CTA (invite others to recognise someone similar). Specificity is non-negotiable: 'she rewrote the entire deck at midnight because the framing was off' beats 'she always goes above and beyond'. The appreciation post is not about you — minimise 'I feel grateful' and maximise 'here is what they did'.",
};

export default appreciationWorkflow;
