import type { WorkflowDefinition } from '../../types';

export const informationalNewsWorkflow: WorkflowDefinition = {
  id: 'informational-news',
  name: 'Informational / News',
  description: 'News-driven content with your unique interpretation',
  optimizationTarget: 'credibility and audience insight delivery',
  extendsWorkflowId: 'base',
  nodeConfigs: [
    {
      nodeId: 'psychology-analyzer',
      importance: 'important',
      dependsOn: [],
    },
    {
      nodeId: 'research-context',
      importance: 'critical',
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
    "Structure: HOOK (the news or stat stated sharply, 1-2 lines) → CONTEXT (why this matters, 2-3 lines) → YOUR TAKE (what this means for your reader, 3-5 lines) → IMPLICATION (bullet list of 2-3 implications) → CTA (question connecting news to reader's reality). Lead with the news, not 'I read an article about...'. Your interpretation is the product — one strong angle beats three weak ones. End with a question that connects the news to their world.",
};

export default informationalNewsWorkflow;
