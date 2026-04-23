import type { WorkflowDefinition } from '../../types';

export const educationalWorkflow: WorkflowDefinition = {
  id: 'educational',
  name: 'Educational Breakdown',
  description: 'Clear, structured, knowledge-transfer content',
  optimizationTarget: 'knowledge retention and saves',
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
      importance: 'background',
      dependsOn: ['draft-generator', 'vocabulary-selector'],
    },
    {
      nodeId: 'constraint-validator',
      importance: 'critical',
      dependsOn: ['tone-calibrator', 'draft-generator'],
    },
  ],
  generationInstruction:
    'Teach one thing exceptionally well. Open with why this knowledge matters now. Use numbered steps or a clear framework. Each section must deliver standalone value. Use concrete examples over abstractions. End with a single actionable takeaway. Optimise for saves and bookmarks — this should feel like a reference someone returns to.',
};

export default educationalWorkflow;
