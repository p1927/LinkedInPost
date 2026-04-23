export { handleWebhookRoute, handleAutomationsAdminRoute, handleAutomationsSchedulerRoute, registerPlatformWebhook } from './routes';
export { runAutomationCleanup } from './cleanup';
export type { AutomationRule, AutomationPlatform, AutomationTrigger, AutomationEvent } from './types';
export { getRule, setChannelRule, setTopicRule, deleteRule, listAllRules } from './kv';
