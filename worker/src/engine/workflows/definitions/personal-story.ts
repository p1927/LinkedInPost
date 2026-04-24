import type { WorkflowDefinition } from '../../types';

export const personalStoryWorkflow: WorkflowDefinition = {
  id: 'personal-story',
  name: 'Personal Story',
  description: 'Narrative from your own life or career with a lesson readers can use',
  optimizationTarget: 'emotional connection and story-driven engagement',
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
      importance: 'critical',
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
    "Structure: HOOK (the end result or a shocking moment — creates an open loop) → CONTEXT (set the scene: where, what, when) → THE TURN (the moment everything changed) → THE STRUGGLE (what it was actually like — specific, honest) → THE INSIGHT (what you learned or how you see it differently now) → THE UNIVERSAL (why this matters for anyone reading) → CTA (open question connecting your story to theirs). Start with the end or peak moment — don't build up to it, open with it. Use specific numbers, dates, names, places. No sugarcoating. Short paragraphs only.",
};

export default personalStoryWorkflow;
