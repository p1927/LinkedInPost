import type { WorkflowDefinition } from '../../types';

export const eventInsightWorkflow: WorkflowDefinition = {
  id: 'event-insight',
  name: 'Event Insight',
  description: 'Real observation from a conference, panel, meeting, or event',
  optimizationTarget: 'authority signaling and unique perspective delivery',
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
    "Structure: HOOK (the single most interesting thing heard or seen) → CONTEXT (event name, speaker, the moment) → THE INSIGHT (what was said/done/revealed — specific, not vague) → YOUR READ (what you think it means beyond the obvious) → IMPLICATION (what this signals about your industry) → CTA (what does your reader think?). Name the event and roughly when it was. Quote real things. The hallway conversation format often outperforms main stage recap — exclusive, insider feel.",
};

export default eventInsightWorkflow;
