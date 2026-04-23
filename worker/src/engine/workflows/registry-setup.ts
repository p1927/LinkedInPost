import { workflowRegistry } from '../registry/WorkflowRegistry';
import { baseWorkflow } from './definitions/base';
import { viralStoryWorkflow } from './definitions/viral-story';
import { thoughtLeadershipWorkflow } from './definitions/thought-leadership';
import { engagementTrapWorkflow } from './definitions/engagement-trap';
import { educationalWorkflow } from './definitions/educational';
import { personalBrandWorkflow } from './definitions/personal-brand';

export function setupBuiltinWorkflows(): void {
  // base must be registered first — child workflows extend it
  const definitions = [
    baseWorkflow,
    viralStoryWorkflow,
    thoughtLeadershipWorkflow,
    engagementTrapWorkflow,
    educationalWorkflow,
    personalBrandWorkflow,
  ];

  for (const definition of definitions) {
    try {
      workflowRegistry.register(definition);
    } catch {
      // Workflow already registered — idempotent, skip silently
    }
  }
}
