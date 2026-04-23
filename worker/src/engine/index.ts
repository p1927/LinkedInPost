import { setupBuiltinNodes } from './nodes/registry-setup';
import { setupBuiltinWorkflows } from './workflows/registry-setup';

setupBuiltinNodes();
setupBuiltinWorkflows();

export { runWorkflow } from './executor/WorkflowRunner';

export { nodeRegistry } from './registry/NodeRegistry';
export { workflowRegistry } from './registry/WorkflowRegistry';

export { lifecycleEventBus } from './events/LifecycleEventBus';

export type {
  RunWorkflowOptions,
  RunWorkflowResult,
  WorkflowContext,
  WorkflowInput,
  DraftVariant,
  WorkflowDefinition,
  NodeDefinition,
  LifecycleEvent,
  DeliveryChannel,
  ImportanceLevel,
} from './types';

export { CHANNEL_CONSTRAINTS_MAP } from './types';
