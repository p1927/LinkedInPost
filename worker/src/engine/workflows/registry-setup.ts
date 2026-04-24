import { workflowRegistry } from '../registry/WorkflowRegistry';
import { baseWorkflow } from './definitions/base';
import { viralStoryWorkflow } from './definitions/viral-story';
import { thoughtLeadershipWorkflow } from './definitions/thought-leadership';
import { engagementTrapWorkflow } from './definitions/engagement-trap';
import { educationalWorkflow } from './definitions/educational';
import { personalBrandWorkflow } from './definitions/personal-brand';
import { informationalNewsWorkflow } from './definitions/informational-news';
import { weekInReviewWorkflow } from './definitions/week-in-review';
import { personalStoryWorkflow } from './definitions/personal-story';
import { eventInsightWorkflow } from './definitions/event-insight';
import { trendCommentaryWorkflow } from './definitions/trend-commentary';
import { satiricalWorkflow } from './definitions/satirical';
import { appreciationWorkflow } from './definitions/appreciation';

export function setupBuiltinWorkflows(): void {
  // base must be registered first — child workflows extend it
  const definitions = [
    baseWorkflow,
    viralStoryWorkflow,
    thoughtLeadershipWorkflow,
    engagementTrapWorkflow,
    educationalWorkflow,
    personalBrandWorkflow,
    informationalNewsWorkflow,
    weekInReviewWorkflow,
    personalStoryWorkflow,
    eventInsightWorkflow,
    trendCommentaryWorkflow,
    satiricalWorkflow,
    appreciationWorkflow,
  ];

  for (const definition of definitions) {
    try {
      workflowRegistry.register(definition);
    } catch {
      // Workflow already registered — idempotent, skip silently
    }
  }
}
