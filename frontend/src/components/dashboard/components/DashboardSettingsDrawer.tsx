import { Plus, RefreshCw, MessageCircle, Trash2, X } from 'lucide-react';
import { type AppSession } from '../../../services/backendApi';
import { type ChannelId, CHANNEL_OPTIONS } from '../../../integrations/channels';
import { type GoogleModelOption } from '../../../services/configService';
import { type TelegramChatVerificationResult, type WhatsAppPhoneOption } from '../../../services/backendApi';
import { type PopupProvider } from '../types';
import { type TelegramRecipient } from '../../../integrations/telegram';

export function DashboardSettingsDrawer({
  session,
  setSettingsOpen,
  sheetIdInput,
  setSheetIdInput,
  selectedChannel,
  setSelectedChannel,
  githubRepo,
  setGithubRepo,
  googleModel,
  setGoogleModel,
  availableModels,
  generationRules,
  setGenerationRules,
  githubTokenInput,
  setGithubTokenInput,
  telegramBotTokenInput,
  setTelegramBotTokenInput,
  telegramDraftLabel,
  setTelegramDraftLabel,
  telegramDraftChatId,
  setTelegramDraftChatId,
  verifyingTelegramChat,
  handleVerifyTelegramChat,
  handleAddTelegramRecipient,
  telegramVerification,
  setTelegramVerification,
  recipientMode,
  handleUseManualTelegramChat,
  parsedTelegramRecipients,
  handleRemoveTelegramRecipient,
  telegramRecipientsInput,
  setTelegramRecipientsInput,
  channelActionBusy,
  handleInstagramConnection,
  connectingChannel,
  handleDisconnectChannel,
  disconnectingChannel,
  handleLinkedInConnection,
  handleWhatsAppConnection,
  pendingWhatsAppOptions,
  selectedWhatsAppPhoneId,
  setSelectedWhatsAppPhoneId,
  completeWhatsAppPhoneSelection,
  whatsappRecipientsInput,
  setWhatsappRecipientsInput,
  saveSettings,
  savingConfig,
}: {
  session: AppSession;
  setSettingsOpen: (open: boolean) => void;
  sheetIdInput: string;
  setSheetIdInput: (val: string) => void;
  selectedChannel: ChannelId;
  setSelectedChannel: (val: ChannelId) => void;
  githubRepo: string;
  setGithubRepo: (val: string) => void;
  googleModel: string;
  setGoogleModel: (val: string) => void;
  availableModels: GoogleModelOption[];
  generationRules: string;
  setGenerationRules: (val: string) => void;
  githubTokenInput: string;
  setGithubTokenInput: (val: string) => void;
  telegramBotTokenInput: string;
  setTelegramBotTokenInput: (val: string) => void;
  telegramDraftLabel: string;
  setTelegramDraftLabel: (val: string) => void;
  telegramDraftChatId: string;
  setTelegramDraftChatId: (val: string) => void;
  verifyingTelegramChat: boolean;
  handleVerifyTelegramChat: () => Promise<void>;
  handleAddTelegramRecipient: () => void;
  telegramVerification: { kind: 'success' | 'error'; message: string; result?: TelegramChatVerificationResult } | null;
  setTelegramVerification: (val: { kind: 'success' | 'error'; message: string; result?: TelegramChatVerificationResult } | null) => void;
  recipientMode: 'saved' | 'manual';
  handleUseManualTelegramChat: () => void;
  parsedTelegramRecipients: TelegramRecipient[];
  handleRemoveTelegramRecipient: (chatId: string) => void;
  telegramRecipientsInput: string;
  setTelegramRecipientsInput: (val: string) => void;
  channelActionBusy: boolean;
  handleInstagramConnection: () => Promise<void>;
  connectingChannel: PopupProvider | null;
  handleDisconnectChannel: (provider: PopupProvider) => Promise<void>;
  disconnectingChannel: PopupProvider | null;
  handleLinkedInConnection: () => Promise<void>;
  handleWhatsAppConnection: () => Promise<void>;
  pendingWhatsAppOptions: WhatsAppPhoneOption[];
  selectedWhatsAppPhoneId: string;
  setSelectedWhatsAppPhoneId: (val: string) => void;
  completeWhatsAppPhoneSelection: () => Promise<void>;
  whatsappRecipientsInput: string;
  setWhatsappRecipientsInput: (val: string) => void;
  saveSettings: () => Promise<void>;
  savingConfig: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-slate-900/45 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[760px] flex-col overflow-hidden border-r border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace drawer</p>
            <h3 className="mt-2 text-2xl font-bold text-deep-indigo font-heading">Settings and channel setup</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Configuration lives here now so the dashboard tabs can stay focused on publishing work.</p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-700"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-3">
            <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden" open>
              <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                Workspace core
                <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 p-4 pt-0">
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Google Spreadsheet ID</label>
                    <input
                      type="text"
                      value={sheetIdInput}
                      onChange={(e) => setSheetIdInput(e.target.value)}
                      placeholder="e.g. 1BxiMVs0XRYFgwnV_v..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Found in the URL of your Google Sheet.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Default Channel</label>
                    <select
                      value={selectedChannel}
                      onChange={(e) => setSelectedChannel(e.target.value as ChannelId)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {CHANNEL_OPTIONS.map((channel) => (
                        <option key={channel.value} value={channel.value}>
                          {channel.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500">Used as the default destination in the delivery panel.</p>
                  </div>
                </div>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                GitHub Actions
                <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 p-4 pt-0">
                <p className="mt-2 text-xs leading-5 text-slate-500">GitHub is still used for full draft jobs. Preview generation inside review uses the Worker model and shared rules below.</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">GitHub Repository</label>
                    <input
                      type="text"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                      placeholder="e.g. username/repo-name"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Google Model</label>
                    <select
                      value={googleModel}
                      onChange={(e) => setGoogleModel(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {availableModels.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Shared Generation Rules</label>
                    <textarea
                      value={generationRules}
                      onChange={(e) => setGenerationRules(e.target.value)}
                      placeholder="Examples: keep the tone crisp, avoid emoji, stay under 180 words, always end with one clear takeaway."
                      className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Applied by the Worker to Quick Change and 4-variant preview runs.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Replace GitHub Personal Access Token</label>
                    <input
                      type="password"
                      value={githubTokenInput}
                      onChange={(e) => setGithubTokenInput(e.target.value)}
                      placeholder={session.config.hasGitHubToken ? 'Leave blank to keep the current token' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      {session.config.hasGitHubToken
                        ? 'A token is already stored. Enter a new one only when you want to rotate it.'
                        : 'Required once so the backend can dispatch the GitHub workflows.'}
                    </p>
                  </div>
                </div>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                Instagram Publishing
                <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 p-4 pt-0">
                <p className="mt-2 text-xs leading-5 text-slate-500">Approved Instagram posts are published directly from the Worker using Instagram Login for professional accounts.</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasInstagramAccessToken && session.config.instagramUserId ? 'bg-[#E1306C]' : 'bg-slate-300'}`}></div>
                      <p className="text-sm font-medium text-slate-700">
                        {session.config.hasInstagramAccessToken && session.config.instagramUserId
                          ? `Connected as ${session.config.instagramUsername ? `@${session.config.instagramUsername}` : session.config.instagramUserId}.`
                          : session.config.instagramAuthAvailable
                            ? 'No Instagram professional account connected yet.'
                            : 'Instagram app credentials are still missing from the Worker environment.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => void handleInstagramConnection()}
                      disabled={channelActionBusy || !session.config.instagramAuthAvailable}
                      className="w-full rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {connectingChannel === 'instagram'
                        ? 'Opening Instagram approval...'
                        : session.config.hasInstagramAccessToken
                          ? 'Reconnect Instagram'
                          : 'Connect Instagram'}
                    </button>
                    {session.config.hasInstagramAccessToken ? (
                      <button
                        type="button"
                        onClick={() => void handleDisconnectChannel('instagram')}
                        disabled={channelActionBusy}
                        className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-all duration-200 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {disconnectingChannel === 'instagram' ? 'Disconnecting Instagram...' : 'Disconnect Instagram'}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {session.config.instagramAuthAvailable
                      ? 'The Worker opens Instagram approval in a popup, exchanges the code server-side, and stores the long-lived token securely.'
                      : 'Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in the Worker before this button can be used.'}
                  </p>
                </div>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                LinkedIn Publishing
                <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 p-4 pt-0">
                <p className="mt-2 text-xs leading-5 text-slate-500">Approved LinkedIn posts are published directly from the Worker, without going through GitHub Actions.</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasLinkedInAccessToken ? 'bg-[#0A66C2]' : 'bg-slate-300'}`}></div>
                      <p className="text-sm font-medium text-slate-700">
                        {session.config.hasLinkedInAccessToken
                          ? `Connected as ${session.config.linkedinPersonUrn || 'a LinkedIn member account'}.`
                          : session.config.linkedinAuthAvailable
                            ? 'No LinkedIn account connected yet.'
                            : 'LinkedIn OAuth app credentials are still missing from the Worker environment.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => void handleLinkedInConnection()}
                      disabled={channelActionBusy || !session.config.linkedinAuthAvailable}
                      className="w-full rounded-xl bg-[#0A66C2] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[#004182] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {connectingChannel === 'linkedin'
                        ? 'Opening LinkedIn approval...'
                        : session.config.hasLinkedInAccessToken
                          ? 'Reconnect LinkedIn'
                          : 'Connect LinkedIn'}
                    </button>
                    {session.config.hasLinkedInAccessToken ? (
                      <button
                        type="button"
                        onClick={() => void handleDisconnectChannel('linkedin')}
                        disabled={channelActionBusy}
                        className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-all duration-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {disconnectingChannel === 'linkedin' ? 'Disconnecting LinkedIn...' : 'Disconnect LinkedIn'}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {session.config.linkedinAuthAvailable
                      ? 'The Worker opens LinkedIn approval in a popup, exchanges the code server-side, and stores the token securely.'
                      : 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in the Worker before this button can be used.'}
                  </p>
                </div>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                Telegram Delivery
                <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 p-4 pt-0">
                <p className="mt-2 text-xs leading-5 text-slate-500">This path sends approved content directly through the Telegram Bot API.</p>
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasTelegramBotToken ? 'bg-[#0088cc]' : 'bg-slate-300'}`}></div>
                        <p className="text-sm font-medium text-slate-700">
                          {session.config.hasTelegramBotToken
                            ? 'Telegram bot token is stored in the Worker.'
                            : 'No Telegram bot token stored yet.'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Replace Telegram Bot Token</label>
                      <input
                        type="password"
                        value={telegramBotTokenInput}
                        onChange={(e) => setTelegramBotTokenInput(e.target.value)}
                        placeholder={session.config.hasTelegramBotToken ? 'Leave blank to keep the current bot token' : '123456789:AA...'}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">
                        {session.config.hasTelegramBotToken
                          ? 'A bot token is already stored. Enter a new one only when you want to rotate it.'
                          : 'Create a bot with BotFather, then paste the token here once so the Worker can deliver messages.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Saved Chats</label>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quick add</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
                        <input
                          type="text"
                          value={telegramDraftLabel}
                          onChange={(e) => {
                            setTelegramDraftLabel(e.target.value);
                            setTelegramVerification(null);
                          }}
                          placeholder="Team channel"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <input
                          type="text"
                          value={telegramDraftChatId}
                          onChange={(e) => {
                            setTelegramDraftChatId(e.target.value);
                            setTelegramVerification(null);
                          }}
                          placeholder="@my_channel or 123456789 / -1001234567890"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                          <button
                            type="button"
                            onClick={() => void handleVerifyTelegramChat()}
                            disabled={verifyingTelegramChat}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RefreshCw className={`h-4 w-4 ${verifyingTelegramChat ? 'animate-spin' : ''}`} />
                            {verifyingTelegramChat ? 'Verifying...' : 'Verify chat'}
                          </button>
                          <button
                            type="button"
                            onClick={handleAddTelegramRecipient}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800"
                          >
                            <Plus className="h-4 w-4" /> Add chat
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Use @channelusername only for public channels or public supergroups. For people, private groups, and private channels, start or add the bot first and use the numeric chat ID instead.</p>
                      {telegramVerification ? (
                        <div className={`mt-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${telegramVerification.kind === 'success' ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800' : 'border-rose-200 bg-rose-50/80 text-rose-700'}`}>
                          <p className="font-semibold">{telegramVerification.message}</p>
                          {telegramVerification.kind === 'success' && telegramVerification.result ? (
                            <p className="mt-1 text-xs opacity-80">
                              Saved target will use {telegramVerification.result.chatId}
                              {telegramVerification.result.username ? ` as @${telegramVerification.result.username}` : ''}.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {selectedChannel === 'telegram' && recipientMode === 'manual' ? (
                        <button
                          type="button"
                          onClick={handleUseManualTelegramChat}
                          className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary transition hover:text-indigo-600"
                        >
                          <MessageCircle className="h-4 w-4" /> Use the manual chat ID from the delivery panel
                        </button>
                      ) : null}
                    </div>

                    {parsedTelegramRecipients.length > 0 ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Saved now</p>
                        <div className="mt-3 space-y-2">
                          {parsedTelegramRecipients.map((recipient) => (
                            <div
                              key={`${recipient.label}-${recipient.chatId}`}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
                            >
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{recipient.label}</p>
                                <p className="text-xs text-slate-500">{recipient.chatId}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveTelegramRecipient(recipient.chatId)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" /> Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <textarea
                      className="mt-3 min-h-[176px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={telegramRecipientsInput}
                      onChange={(e) => setTelegramRecipientsInput(e.target.value)}
                      placeholder={['Channel | @my_channel', 'Founders group | -1001234567890'].join('\n')}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Bulk editor. One chat per line using the format "Label | @channelusername" or "Label | -1001234567890".</p>
                  </div>
                </div>
              </div>
            </details>

            <details className="group rounded-2xl border border-slate-200 bg-white/80 shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between p-4 font-bold text-deep-indigo list-none">
                WhatsApp Delivery
                <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 p-4 pt-0">
                <p className="mt-2 text-xs leading-5 text-slate-500">This path sends non-template WhatsApp messages directly through Meta Cloud API.</p>
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</p>
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasWhatsAppAccessToken && session.config.whatsappPhoneNumberId ? 'bg-[#25D366]' : 'bg-slate-300'}`}></div>
                        <p className="text-sm font-medium text-slate-700">
                          {session.config.hasWhatsAppAccessToken && session.config.whatsappPhoneNumberId
                            ? `Connected to WhatsApp phone ${session.config.whatsappPhoneNumberId}.`
                            : session.config.whatsappAuthAvailable
                              ? 'No WhatsApp Business phone connected yet.'
                              : 'Meta OAuth app credentials are still missing from the Worker environment.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => void handleWhatsAppConnection()}
                        disabled={channelActionBusy || !session.config.whatsappAuthAvailable}
                        className="w-full rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[#128C7E] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {connectingChannel === 'whatsapp'
                          ? 'Opening Meta approval...'
                          : session.config.hasWhatsAppAccessToken
                            ? 'Reconnect WhatsApp'
                            : 'Connect WhatsApp Business'}
                      </button>
                      {session.config.hasWhatsAppAccessToken ? (
                        <button
                          type="button"
                          onClick={() => void handleDisconnectChannel('whatsapp')}
                          disabled={channelActionBusy}
                          className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {disconnectingChannel === 'whatsapp' ? 'Disconnecting WhatsApp...' : 'Disconnect WhatsApp'}
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">
                      {session.config.whatsappAuthAvailable
                        ? 'The Worker opens Meta approval in a popup, exchanges the code server-side, and discovers your available WhatsApp Business phone numbers.'
                        : 'Set META_APP_ID and META_APP_SECRET in the Worker before this button can be used.'}
                    </p>

                    {pendingWhatsAppOptions.length > 0 ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700/80">Choose a phone</p>
                        <select
                          value={selectedWhatsAppPhoneId}
                          onChange={(e) => setSelectedWhatsAppPhoneId(e.target.value)}
                          className="mt-3 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                        >
                          {pendingWhatsAppOptions.map((option) => (
                            <option key={option.phoneNumberId} value={option.phoneNumberId}>
                              {option.displayPhoneNumber || option.phoneNumberId} - {option.verifiedName || option.businessAccountName}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void completeWhatsAppPhoneSelection()}
                          disabled={channelActionBusy || !selectedWhatsAppPhoneId}
                          className="mt-3 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Save selected phone
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Saved Recipients</label>
                    <textarea
                      value={whatsappRecipientsInput}
                      onChange={(e) => setWhatsappRecipientsInput(e.target.value)}
                      placeholder={['Founders group | +14155550101', 'Ops lead | +919876543210'].join('\n')}
                      className="min-h-[176px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">One recipient per line using the format "Label | +15551234567".</p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Secrets stay in the backend. The browser no longer talks to Google Sheets, Instagram, LinkedIn, Telegram, or Meta directly.
          </p>
          <button
            onClick={saveSettings}
            disabled={savingConfig}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition-all duration-200 hover:bg-indigo-600 disabled:opacity-50"
          >
            {savingConfig ? 'Saving shared configuration...' : 'Save settings'}
          </button>
        </div>
      </div>
      <button type="button" className="flex-1" aria-label="Close settings overlay" onClick={() => setSettingsOpen(false)} />
    </div>
  );
}
