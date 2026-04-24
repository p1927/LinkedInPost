import type { WorkflowDefinition } from '../../types';

export const satiricalWorkflow: WorkflowDefinition = {
  id: 'satirical',
  name: 'Satirical / Sarcastic',
  description: 'Critique or skewer something absurd in your industry using humour or deadpan observation',
  optimizationTarget: 'shareability, personality, and memorable distinctiveness',
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
      importance: 'critical',
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
    "Structure: SETUP (establish the absurd norm or behaviour being satirised) → BUILD (stack 2-3 examples that escalate the ridiculousness) → PUNCHLINE (the subversion or twist that lands the joke) → TRUTH (the real underlying critique, optional) → CTA (invite them to add their own examples). Punch at ideas, behaviours, and absurd patterns — not at people. Specificity makes satire funny: 'synergising cross-functional stakeholder ecosystems' lands; 'corporate jargon' doesn't. Keep it short. Satire that over-explains kills itself. Invite additions in the CTA.",
};

export default satiricalWorkflow;
