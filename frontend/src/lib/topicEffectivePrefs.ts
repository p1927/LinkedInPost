import { CHANNEL_OPTIONS, type ChannelId } from '@/integrations/channels';
import type { SheetRow } from '@/services/sheets';
import type { LlmRef } from '@/services/configService';

const CHANNEL_VALUES = new Set<ChannelId>(CHANNEL_OPTIONS.map((o) => o.value));

export function parseTopicDeliveryChannel(raw: string | undefined): ChannelId | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  return CHANNEL_VALUES.has(s as ChannelId) ? (s as ChannelId) : null;
}

export function effectiveChannel(row: SheetRow, workspaceChannel: ChannelId): ChannelId {
  return parseTopicDeliveryChannel(row.topicDeliveryChannel) ?? workspaceChannel;
}

export function effectiveLlmRef(row: SheetRow, workspace: LlmRef): LlmRef {
  const raw = String(row.topicGenerationModel || '').trim();
  if (!raw) return workspace;
  if (raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw) as { provider?: string; model?: string };
      const p =
        o.provider === 'grok' || o.provider === 'gemini' ? (o.provider as LlmRef['provider']) : workspace.provider;
      const m = String(o.model || '').trim();
      if (m) return { provider: p, model: m };
    } catch {
      /* ignore */
    }
    return workspace;
  }
  return { provider: workspace.provider, model: raw };
}
