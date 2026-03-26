import { MessageCircle, Phone, Settings } from 'lucide-react';
import { type AppSession } from '../../../services/backendApi';
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
  session,
  setSettingsOpen,
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
  session: AppSession;
  setSettingsOpen: (open: boolean) => void;
  lastDeliverySummary: DeliverySummary | null;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active delivery target</p>
            <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">{getChannelLabel(selectedChannel)}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Approved posts will use this destination until you change it.</p>
          </div>
          <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Channel</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as ChannelId)}
              className="w-full bg-transparent text-base font-semibold text-deep-indigo outline-none"
            >
              {CHANNEL_OPTIONS.map((channel) => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current destination</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{deliveryTargetSummary}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{selectedChannelOption.description}</p>

          {selectedChannelOption.requiresRecipient ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientMode('saved')}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${recipientMode === 'saved' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                >
                  {selectedChannel === 'telegram' ? 'Saved chat' : 'Saved recipient'}
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('manual')}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${recipientMode === 'manual' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                >
                  {selectedChannel === 'telegram' ? 'Manual chat ID' : 'Manual number'}
                </button>
              </div>

              {recipientMode === 'saved' ? (
                <label className="mt-3 block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <MessageCircle className="h-4 w-4" /> {selectedChannel === 'telegram' ? 'Chat' : 'Recipient'}
                  </span>
                  <select
                    value={selectedRecipientId}
                    onChange={(e) => setSelectedRecipientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
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
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {selectedChannel === 'telegram' ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />} {selectedChannel === 'telegram' ? 'Chat ID' : 'Phone number'}
                  </span>
                  <input
                    type="text"
                    value={manualRecipientId}
                    onChange={(e) => setManualRecipientId(e.target.value)}
                    placeholder={selectedChannel === 'telegram' ? '@my_channel or -1001234567890' : '+14155550101'}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </label>
              )}
            </>
          ) : selectedChannel === 'instagram' ? (
            <>
              <p className="mt-4 text-sm leading-6 text-slate-700">{getInstagramDeliveryDescription()}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{getInstagramDeliveryHint()}</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-6 text-slate-700">{getLinkedInDeliveryDescription()}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{getLinkedInDeliveryHint()}</p>
            </>
          )}
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Setup access</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Channel auth and shared publishing configuration stay in the workspace drawer so this tab can stay focused on the active destination.
          </p>
          {session.isAdmin ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Settings className="h-4 w-4" />
              Open workspace drawer
            </button>
          ) : null}
        </section>

        {lastDeliverySummary ? (
          <section className="rounded-[32px] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96)_0%,rgba(240,249,255,0.92)_100%)] p-5 shadow-[0_12px_30px_rgba(16,185,129,0.08)]">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/70">Last delivery</p>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-emerald-200">
                {getChannelLabel(lastDeliverySummary.channel)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Last confirmed destination: {lastDeliverySummary.recipientLabel}.
            </p>
          </section>
        ) : null}
      </div>
    </section>
  );
}
