import { Bot, MessageCircle, Phone, RefreshCw } from 'lucide-react';
import { type ChannelId, CHANNEL_OPTIONS, getChannelLabel } from '../../../integrations/channels';
import { type RecipientOption } from '../types';
import { getInstagramDeliveryDescription, getInstagramDeliveryHint } from '../../../integrations/instagram';
import { getLinkedInDeliveryDescription, getLinkedInDeliveryHint } from '../../../integrations/linkedin';

import { type ChannelOption } from '../../../integrations/channels';
import { type DeliverySummary } from '../types';
import { type GoogleModelOption } from '../../../services/configService';

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
  googleModel,
  setGoogleModel,
  availableModels,
  linkedinConfigured,
  instagramConfigured,
  telegramConfigured,
  whatsappConfigured,
  onRefreshQueue,
  queueLoading,
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
  googleModel: string;
  setGoogleModel: (val: string) => void;
  availableModels: GoogleModelOption[];
  linkedinConfigured: boolean;
  instagramConfigured: boolean;
  telegramConfigured: boolean;
  whatsappConfigured: boolean;
  onRefreshQueue: () => void;
  queueLoading: boolean;
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

      <div className="rounded-2xl border border-border bg-canvas p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Publishing health</p>
        <div className="mt-2 space-y-1.5">
          {[
            { label: 'LinkedIn', ready: linkedinConfigured },
            { label: 'Instagram', ready: instagramConfigured },
            { label: 'Telegram', ready: telegramConfigured },
            { label: 'WhatsApp', ready: whatsappConfigured },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-surface px-2.5 py-1.5">
              <span className="text-[11px] font-medium text-ink">{item.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  item.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {item.ready ? 'Ready' : 'Setup'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-canvas p-4">
        <label className="flex cursor-pointer flex-col gap-1">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
            AI model
          </span>
          <span className="text-[11px] leading-4 text-muted">Used for Quick Change and variants in review.</span>
          <select
            value={googleModel}
            onChange={(e) => setGoogleModel(e.target.value)}
            className="mt-1 w-full cursor-pointer rounded-lg border border-border bg-surface px-2 py-2 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-primary/25"
          >
            {availableModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => onRefreshQueue()}
        disabled={queueLoading}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${queueLoading ? 'animate-spin' : ''}`} aria-hidden />
        Refresh queue from Sheets
      </button>

      {lastDeliverySummary ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Last delivery</p>
            <span className="rounded-full border border-emerald-200 bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink">
              {getChannelLabel(lastDeliverySummary.channel)}
            </span>
            <span className="rounded-full border border-emerald-200 bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink">
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
