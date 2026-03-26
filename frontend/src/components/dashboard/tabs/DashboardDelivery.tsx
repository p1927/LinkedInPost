import { MessageCircle, Phone } from 'lucide-react';
import { type ChannelId, CHANNEL_OPTIONS, getChannelLabel } from '../../../integrations/channels';
import { type RecipientOption } from '../types';
import { getInstagramDeliveryDescription, getInstagramDeliveryHint } from '../../../integrations/instagram';
import { getLinkedInDeliveryDescription, getLinkedInDeliveryHint } from '../../../integrations/linkedin';

import { type ChannelOption } from '../../../integrations/channels';
import { type DeliverySummary } from '../types';
export function DashboardDelivery({
  selectedChannel,
  setSelectedChannel,
  deliveryTargetSummary,
  selectedChannelOption,
  recipientMode,
  setRecipientMode,
  selectedRecipientId,
  setSelectedRecipientId,
  activeRecipientOptions,
  manualRecipientId,
  setManualRecipientId,
  lastDeliverySummary,
}: {
  selectedChannel: ChannelId;
  setSelectedChannel: (val: ChannelId) => void;
  deliveryTargetSummary: string;
  selectedChannelOption: ChannelOption;
  recipientMode: 'saved' | 'manual';
  setRecipientMode: (mode: 'saved' | 'manual') => void;
  selectedRecipientId: string;
  setSelectedRecipientId: (val: string) => void;
  activeRecipientOptions: RecipientOption[];
  manualRecipientId: string;
  setManualRecipientId: (val: string) => void;
  lastDeliverySummary: DeliverySummary | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-canvas p-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Target</p>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as ChannelId)}
              className="mt-1 w-full cursor-pointer rounded-lg border border-border bg-surface px-2 py-2 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-primary/25"
            >
              {CHANNEL_OPTIONS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Current destination</p>
          <p className="mt-1 text-sm font-semibold text-ink">{deliveryTargetSummary}</p>
          
          {selectedChannelOption.requiresRecipient ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientMode('saved')}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${recipientMode === 'saved' ? 'bg-primary text-primary-fg' : 'border border-border bg-surface text-muted hover:text-ink'}`}
                >
                  {selectedChannel === 'telegram' ? 'Saved chat' : 'Saved recipient'}
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('manual')}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${recipientMode === 'manual' ? 'bg-primary text-primary-fg' : 'border border-border bg-surface text-muted hover:text-ink'}`}
                >
                  {selectedChannel === 'telegram' ? 'Manual chat ID' : 'Manual number'}
                </button>
              </div>

              {recipientMode === 'saved' ? (
                <label className="mt-3 block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    <MessageCircle className="h-4 w-4" /> {selectedChannel === 'telegram' ? 'Chat' : 'Recipient'}
                  </span>
                  <select
                    value={selectedRecipientId}
                    onChange={(e) => setSelectedRecipientId(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    disabled={activeRecipientOptions.length === 0}
                  >
                    {activeRecipientOptions.length === 0 ? (
                      <option value="">No saved {selectedChannel === 'telegram' ? 'chats' : 'recipients'} configured yet</option>
                    ) : (
                      activeRecipientOptions.map((recipient) => (
                        <option key={`${recipient.label}-${recipient.value}`} value={recipient.value}>
                          {recipient.label} ({recipient.value})
                        </option>
                      ))
                    )}
                  </select>
                </label>
              ) : (
                <label className="mt-3 block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {selectedChannel === 'telegram' ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />} {selectedChannel === 'telegram' ? 'Chat ID' : 'Phone number'}
                  </span>
                  <input
                    type="text"
                    value={manualRecipientId}
                    onChange={(e) => setManualRecipientId(e.target.value)}
                    placeholder={selectedChannel === 'telegram' ? '@my_channel or -1001234567890' : '+14155550101'}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              )}
            </>
          ) : selectedChannel === 'instagram' ? (
            <>
              <p className="mt-4 text-sm leading-6 text-ink">{getInstagramDeliveryDescription()}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{getInstagramDeliveryHint()}</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-6 text-ink">{getLinkedInDeliveryDescription()}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{getLinkedInDeliveryHint()}</p>
            </>
          )}
        </div>
      </div>

      {lastDeliverySummary ? (
        <div className="rounded-2xl border border-success-border/90 bg-success-surface/95 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-success-ink">Last delivery</p>
            <span className="rounded-full border border-success-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink">
              {getChannelLabel(lastDeliverySummary.channel)}
            </span>
            <span className="rounded-full border border-success-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink">
              {lastDeliverySummary.mediaMode === 'image' ? 'Image post' : 'Text post'}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            {lastDeliverySummary.channel === 'whatsapp' || lastDeliverySummary.channel === 'telegram'
              ? `Delivered to ${lastDeliverySummary.recipientLabel}.`
              : lastDeliverySummary.channel === 'instagram'
                ? lastDeliverySummary.recipientLabel === 'connected account'
                  ? 'Published to Instagram using the connected professional account.'
                  : `Published to Instagram as @${lastDeliverySummary.recipientLabel}.`
                : 'Delivered to LinkedIn using the approved text and selected media.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
