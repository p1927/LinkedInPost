/**
 * Shared prompt fragments used across node definitions.
 * Extracted to avoid verbatim repetition across 7 files.
 */

import type { WorkflowContext } from '../types';

/** Standard JSON response instruction appended to every node prompt. */
export const JSON_ONLY_INSTRUCTION =
  'Return ONLY a valid JSON object (no markdown, no code fences):';

/** Standard topic/channel/platform header block for node prompts. */
export function topicContextBlock(context: Pick<WorkflowContext, 'topic' | 'channel' | 'channelConstraints' | 'authorProfile'>): string {
  return [
    `TOPIC: ${context.topic}`,
    `CHANNEL: ${context.channel}`,
    `PLATFORM CONTRACT: ${context.channelConstraints.platformContract}`,
    `AUTHOR PROFILE: ${context.authorProfile}`,
  ].join('\n');
}
