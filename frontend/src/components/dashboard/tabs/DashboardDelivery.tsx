import { MessageCircle, Phone } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { ChipToggle } from '../../ui/ChipToggle';
import { cn } from '../../../lib/cn';
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
  embedded = false,
  channelCredentialsConfigured = true,
  isAdmin = false,
  onOpenSettings,
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
  /** Flatten chrome when nested in the Topics right rail. */
  embedded?: boolean;
  /** False when the selected channel has no API credentials in workspace config. */
  channelCredentialsConfigured?: boolean;
  isAdmin?: boolean;
  onOpenSettings?: () => void;
}) {
  const targetBlockClass = embedded
    ? 'flex flex-col gap-3 rounded-xl bg-canvas/60 p-3 ring-1 ring-border/80'
    : 'rounded-2xl border border-border bg-canvas p-4';

  return (
    <div className="flex flex-col gap-4">
      {!channelCredentialsConfigured ? (
        <div
          className="rounded-xl border border-amber-200/90 bg-amber-50/95 p-3 text-xs leading-relaxed text-amber-950"
          role="status"
        >
          <p className="font-medium text-amber-950">
            {getChannelLabel(selectedChannel)} is not connected for publishing.
          </p>
          {isAdmin && onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-2 inline-flex cursor-pointer font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            >
              Open Settings to connect
            </button>
          ) : (
            <p className="mt-1 text-amber-900/90">Ask an admin to connect this channel in Settings.</p>
          )}
        </div>
      ) : null}

      <div className={targetBlockClass}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/70">Target</p>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as ChannelId)}
              className={cn('ui-select ui-select-sm mt-1 h-9 max-w-full')}
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/70">Current destination</p>
          <p className="mt-1 text-sm font-semibold text-ink">{deliveryTargetSummary}</p>
          
          {selectedChannelOption.requiresRecipient ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ChipToggle
                  type="button"
                  selected={recipientMode === 'saved'}
                  onClick={() => setRecipientMode('saved')}
                  className="min-h-9 px-3 py-1.5 text-xs"
                >
                  {selectedChannel === 'telegram' ? 'Saved chat' : 'Saved recipient'}
                </ChipToggle>
                <ChipToggle
                  type="button"
                  selected={recipientMode === 'manual'}
                  onClick={() => setRecipientMode('manual')}
                  className="min-h-9 px-3 py-1.5 text-xs"
                >
                  {selectedChannel === 'telegram' ? 'Manual chat ID' : 'Manual number'}
                </ChipToggle>
              </div>

              {recipientMode === 'saved' ? (
                <label className="mt-3 block">
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/70">
                    <MessageCircle className="h-4 w-4" /> {selectedChannel === 'telegram' ? 'Chat' : 'Recipient'}
                  </span>
                  <select
                    value={selectedRecipientId}
                    onChange={(e) => setSelectedRecipientId(e.target.value)}
                    className={cn('ui-select ui-select-sm h-9 w-full')}
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
                  <span className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/70">
                    {selectedChannel === 'telegram' ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />}{' '}
                    {selectedChannel === 'telegram' ? 'Chat ID' : 'Phone number'}
                  </span>
                  <input
                    type="text"
                    value={manualRecipientId}
                    onChange={(e) => setManualRecipientId(e.target.value)}
                    placeholder={selectedChannel === 'telegram' ? '@my_channel or -1001234567890' : '+14155550101'}
                    className="w-full min-h-9 rounded-lg border border-violet-200/55 bg-white/85 px-3 py-2 text-sm text-ink shadow-sm outline-none backdrop-blur-md transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-canvas"
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
            <Badge variant="neutral" size="sm" className="border-success-border/80 bg-white/90 text-ink normal-case">
              {getChannelLabel(lastDeliverySummary.channel)}
            </Badge>
            <Badge variant="neutral" size="sm" className="border-success-border/80 bg-white/90 text-ink normal-case">
              {lastDeliverySummary.mediaMode === 'image' ? 'Image post' : 'Text post'}
            </Badge>
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
