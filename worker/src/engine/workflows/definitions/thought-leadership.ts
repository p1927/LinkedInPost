import type { WorkflowDefinition } from '../../types';

export const thoughtLeadershipWorkflow: WorkflowDefinition = {
  id: 'thought-leadership',
  name: 'Thought Leadership',
  description: 'Research-backed, authoritative, credibility-building content',
  optimizationTarget: 'credibility and authority in the field',
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
    'Open with a specific insight or counterintuitive data point. Build the argument with evidence — facts, statistics, named examples. Structure matters: each paragraph must advance the argument. Close with a forward-looking implication or contrarian prediction. Sound like the most informed person in the room, not the loudest.',
};

export default thoughtLeadershipWorkflow;
