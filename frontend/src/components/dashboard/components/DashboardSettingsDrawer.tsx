import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, MessageCircle, Trash2 } from 'lucide-react';
import { type AppSession, type OAuthProvider } from '../../../services/backendApi';
import { type GoogleModelOption } from '../../../services/configService';
import { type ChannelId } from '../../../integrations/channels';
import { type TelegramChatVerificationResult, type WhatsAppPhoneOption } from '../../../services/backendApi';
import { type TelegramRecipient } from '../../../integrations/telegram';
import { cn } from '../../../lib/cn';
import { WORKSPACE_PATHS } from '../../../features/topic-navigation/utils/workspaceRoutes';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { NewsResearchSettingsSection } from '../../../features/news-research';
import { ContentReviewSettings } from '../../../features/content-review/ContentReviewSettings';
import type {
  LlmProviderId,
  LlmRef,
  NewsResearchStored,
  NewsProviderKeys,
  ContentReviewStored,
} from '../../../services/configService';
import { FEATURE_CONTENT_REVIEW, FEATURE_MULTI_PROVIDER_LLM, FEATURE_NEWS_RESEARCH } from '../../../generated/features';
import { PostGenerateSettings } from '../../../features/review/components/PostGenerateSettings';
import {
  type SettingsSectionId,
  type DashboardSettingsDrawerHandle,
  PUBLISHING_CHANNEL_TO_SETTINGS_SECTION_ID,
  ALL_SETTINGS_SECTIONS,
} from './DashboardSettingsDrawer.types';

export type { SettingsSectionId, DashboardSettingsDrawerHandle };
export { PUBLISHING_CHANNEL_TO_SETTINGS_SECTION_ID };

type DashboardSettingsDrawerProps = {
  session: AppSession;
  sheetIdInput: string;
  setSheetIdInput: (val: string) => void;
  selectedChannel: ChannelId;
  githubRepo: string;
  setGithubRepo: (val: string) => void;
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
  telegramVerification: {
    kind: 'success' | 'error';
    message: string;
    result?: TelegramChatVerificationResult;
  } | null;
  setTelegramVerification: (
    val: {
      kind: 'success' | 'error';
      message: string;
      result?: TelegramChatVerificationResult;
    } | null,
  ) => void;
  recipientMode: 'saved' | 'manual';
  handleUseManualTelegramChat: () => void;
  parsedTelegramRecipients: TelegramRecipient[];
  handleRemoveTelegramRecipient: (chatId: string) => void;
  telegramRecipientsInput: string;
  setTelegramRecipientsInput: (val: string) => void;
  channelActionBusy: boolean;
  handleInstagramConnection: () => Promise<void>;
  connectingChannel: OAuthProvider | null;
  handleDisconnectChannel: (provider: OAuthProvider) => Promise<void>;
  disconnectingChannel: OAuthProvider | null;
  handleLinkedInConnection: () => Promise<void>;
  handleWhatsAppConnection: () => Promise<void>;
  handleGmailConnection: () => Promise<void>;
  gmailDefaultTo: string;
  setGmailDefaultTo: (val: string) => void;
  gmailDefaultCc: string;
  setGmailDefaultCc: (val: string) => void;
  gmailDefaultBcc: string;
  setGmailDefaultBcc: (val: string) => void;
  gmailDefaultSubject: string;
  setGmailDefaultSubject: (val: string) => void;
  pendingWhatsAppOptions: WhatsAppPhoneOption[];
  selectedWhatsAppPhoneId: string;
  setSelectedWhatsAppPhoneId: (val: string) => void;
  completeWhatsAppPhoneSelection: () => Promise<void>;
  whatsappRecipientsInput: string;
  setWhatsappRecipientsInput: (val: string) => void;
  saveSettings: () => Promise<void>;
  savingConfig: boolean;
  hasUnsavedSettingsChanges: boolean;
  adminModelCatalog: GoogleModelOption[];
  allowedGoogleModels: string[];
  toggleAllowedGoogleModel: (modelId: string, enabled: boolean) => void;
  newsResearch?: NewsResearchStored;
  setNewsResearch?: (next: NewsResearchStored) => void;
  newsProviderKeys?: NewsProviderKeys;
  contentReview?: ContentReviewStored;
  setContentReview?: (next: ContentReviewStored) => void;
  newsResearchEnabledForContentReview?: boolean;
  llmPrimaryProvider?: LlmProviderId;
  setLlmPrimaryProvider?: (v: LlmProviderId) => void;
  llmModelId?: string;
  setLlmModelId?: (v: string) => void;
  llmFallback?: LlmRef | null;
  setLlmFallback?: (v: LlmRef | null) => void;
  grokAdminCatalog?: GoogleModelOption[];
  allowedGrokModels?: string[];
  toggleAllowedGrokModel?: (modelId: string, enabled: boolean) => void;
  refreshGrokModels?: () => void;
  onSaveGenerationLlm?: (llm: LlmRef) => Promise<void>;
};

function SettingsSectionCard({
  id,
  title,
  variant = 'surface',
  children,
}: {
  id: string;
  title: string;
  variant?: 'canvas' | 'surface';
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-6 rounded-xl border border-border shadow-sm',
        variant === 'canvas' ? 'bg-canvas' : 'bg-surface',
      )}
    >
      <h2 className="border-b border-border px-4 py-3 font-heading text-base font-semibold text-ink">{title}</h2>
      <div className="p-4 pt-4">{children}</div>
    </section>
  );
}

export const DashboardSettingsDrawer = forwardRef<DashboardSettingsDrawerHandle, DashboardSettingsDrawerProps>(
  function DashboardSettingsDrawer(
    {
      session,
      sheetIdInput,
      setSheetIdInput,
      selectedChannel,
      githubRepo,
      setGithubRepo,
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
      handleGmailConnection,
      gmailDefaultTo,
      setGmailDefaultTo,
      gmailDefaultCc,
      setGmailDefaultCc,
      gmailDefaultBcc,
      setGmailDefaultBcc,
      gmailDefaultSubject,
      setGmailDefaultSubject,
      pendingWhatsAppOptions,
      selectedWhatsAppPhoneId,
      setSelectedWhatsAppPhoneId,
      completeWhatsAppPhoneSelection,
      whatsappRecipientsInput,
      setWhatsappRecipientsInput,
      saveSettings,
      savingConfig,
      hasUnsavedSettingsChanges,
      adminModelCatalog,
      allowedGoogleModels,
      toggleAllowedGoogleModel,
      newsResearch,
      setNewsResearch,
      newsProviderKeys,
      contentReview,
      setContentReview,
      newsResearchEnabledForContentReview,
      llmPrimaryProvider,
      setLlmPrimaryProvider,
      llmModelId,
      setLlmModelId,
      llmFallback,
      setLlmFallback,
      grokAdminCatalog,
      allowedGrokModels,
      toggleAllowedGrokModel,
      refreshGrokModels,
      onSaveGenerationLlm,
    },
    ref,
  ) {
    const multiLlmReady =
      FEATURE_MULTI_PROVIDER_LLM &&
      llmPrimaryProvider != null &&
      setLlmPrimaryProvider != null &&
      llmModelId !== undefined &&
      setLlmModelId != null &&
      llmFallback !== undefined &&
      setLlmFallback != null &&
      grokAdminCatalog != null &&
      allowedGrokModels != null &&
      toggleAllowedGrokModel != null &&
      refreshGrokModels != null;

    const settingsSections = useMemo(() => {
      let s = [...ALL_SETTINGS_SECTIONS];
      if (!FEATURE_NEWS_RESEARCH) {
        s = s.filter((sec) => sec.id !== 'settings-news');
      }
      if (!FEATURE_CONTENT_REVIEW) {
        s = s.filter((sec) => sec.id !== 'settings-content-review');
      }
      if (!session.isAdmin) {
        s = s.filter((sec) => sec.id !== 'settings-llm');
      }
      return s;
    }, [session.isAdmin]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeSectionId, setActiveSectionId] = useState<string>(settingsSections[0]?.id ?? ALL_SETTINGS_SECTIONS[0].id);

    const scrollToSection = useCallback((id: SettingsSectionId) => {
      setActiveSectionId(id);
      const root = scrollRef.current;
      const el = (root?.querySelector(`#${CSS.escape(id)}`) ?? document.getElementById(id)) as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    useImperativeHandle(ref, () => ({ scrollToSection }), [scrollToSection]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const elements = settingsSections.map(({ id }) => root.querySelector(`#${CSS.escape(id)}`)).filter(
      (n): n is Element => Boolean(n),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio > 0.12)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.id;
        if (id) setActiveSectionId(id);
      },
      { root, rootMargin: '-12% 0px -52% 0px', threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.75, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [settingsSections]);

  const saveEnabled = session.isAdmin && hasUnsavedSettingsChanges && !savingConfig;

  return (
    <div className="flex min-h-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside className="sticky top-4 z-20 shrink-0 rounded-xl border border-border/60 bg-surface/95 p-3 shadow-sm backdrop-blur-md lg:w-52 lg:max-w-[13rem] lg:self-start">
        <nav
          className="flex flex-row gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0 lg:pr-1"
          aria-label="Settings sections"
        >
          <p className="mb-2 hidden text-xs font-bold uppercase tracking-[0.14em] text-muted lg:block">Jump to</p>
          {settingsSections.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => scrollToSection(id)}
              className={cn(
                'w-full shrink-0 justify-start rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                activeSectionId === id
                  ? 'bg-primary/12 font-semibold text-ink'
                  : 'text-muted hover:bg-white/60 hover:text-ink',
              )}
            >
              {label}
            </Button>
          ))}
        </nav>
        <div className="mt-3 border-t border-border pt-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => void saveSettings()}
            disabled={!saveEnabled}
            className="w-full rounded-xl font-semibold disabled:opacity-50"
          >
            {savingConfig ? 'Saving...' : 'Save settings'}
          </Button>
          {!session.isAdmin ? (
            <p className="mt-2 text-center text-[11px] leading-snug text-muted">Only workspace admins can save shared settings.</p>
          ) : null}
        </div>
      </aside>

      <div
        ref={scrollRef}
        className="custom-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto lg:max-h-[min(72vh,calc(100vh-10rem))] lg:pr-1"
      >
        <SettingsSectionCard id="settings-workspace-core" title="Workspace core" variant="canvas">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Google Spreadsheet ID</label>
              <Input
                type="text"
                value={sheetIdInput}
                onChange={(e) => setSheetIdInput(e.target.value)}
                placeholder="e.g. 1BxiMVs0XRYFgwnV_v..."
                className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="mt-1.5 text-xs text-muted">Found in the URL of your Google Sheet.</p>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard id="settings-github-actions" title="GitHub Actions">
          <p className="text-xs leading-5 text-muted">
            GitHub is still used for full draft jobs. Preview generation inside review uses the Worker model and workspace generation rules from the{' '}
            <Link to={WORKSPACE_PATHS.rules} className="font-semibold text-primary underline-offset-2 hover:underline">
              Rules
            </Link>{' '}
            page.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">GitHub Repository</label>
              <Input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="e.g. username/repo-name"
                className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Replace GitHub Personal Access Token</label>
              <Input
                type="password"
                value={githubTokenInput}
                onChange={(e) => setGithubTokenInput(e.target.value)}
                placeholder={session.config.hasGitHubToken ? 'Leave blank to keep the current token' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="mt-1.5 text-xs text-muted">
                {session.config.hasGitHubToken
                  ? 'A token is already stored. Enter a new one only when you want to rotate it.'
                  : 'Required once so the backend can dispatch the GitHub workflows.'}
              </p>
            </div>
          </div>
        </SettingsSectionCard>

        {session.isAdmin ? (
          <SettingsSectionCard id="settings-llm" title="AI / LLM" variant="canvas">
            {multiLlmReady ? (
              <p className="text-xs leading-relaxed text-muted">
                Preview generation uses the Worker. Set <code className="rounded bg-border/40 px-1">GEMINI_API_KEY</code> and optional{' '}
                <code className="rounded bg-border/40 px-1">XAI_API_KEY</code> in the Worker. GitHub Actions draft jobs stay Gemini-only; the worker picks a valid Gemini model for dispatch when your primary is Grok.
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-muted">
                Preview generation uses the Worker. Set <code className="rounded bg-border/40 px-1">GEMINI_API_KEY</code> in the Worker. Allowed Gemini models below apply to GitHub Actions draft workflows and the model picker on Home.
              </p>
            )}
            {multiLlmReady ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => refreshGrokModels!()}>
                    <RefreshCw className="mr-1.5 size-4" aria-hidden />
                    Refresh Grok models
                  </Button>
                  <span className="text-xs leading-snug text-muted">
                    Gemini: {session.config.llmProviderKeys?.gemini ? 'key present' : 'no key'} · Grok:{' '}
                    {session.config.llmProviderKeys?.grok ? 'key present' : 'no key'}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink">Primary provider</label>
                  <Select
                    value={llmPrimaryProvider!}
                    onValueChange={(v) => setLlmPrimaryProvider!(v as LlmProviderId)}
                    itemToStringLabel={(v) =>
                      v === 'gemini' ? 'Gemini' : v === 'grok' ? 'Grok (xAI)' : String(v ?? '')
                    }
                  >
                    <SelectTrigger className="h-auto min-h-10 w-full max-w-xs rounded-xl py-2.5 font-medium">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[min(100vw-1.5rem,24rem)]">
                      <SelectItem value="gemini">Gemini</SelectItem>
                      <SelectItem value="grok">Grok (xAI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink">Primary model</label>
                  <Select
                    value={llmModelId!}
                    onValueChange={(v) => setLlmModelId!(v as string)}
                    itemToStringLabel={(v) => {
                      const cat = llmPrimaryProvider === 'grok' ? grokAdminCatalog! : adminModelCatalog;
                      return cat.find((m) => m.value === v)?.label ?? String(v ?? '');
                    }}
                  >
                    <SelectTrigger className="h-auto min-h-10 w-full rounded-xl py-2.5 font-medium">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[min(100vw-1.5rem,36rem)]">
                      {(llmPrimaryProvider === 'grok' ? grokAdminCatalog! : adminModelCatalog).map((m) => (
                        <SelectItem key={m.value} value={m.value} className="items-start py-2.5">
                          <span className="whitespace-normal leading-snug">{m.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink">Fallback (optional)</label>
                  <p className="mb-2 text-xs leading-relaxed text-muted">
                    Used when the primary call fails with a retryable error (e.g. rate limit).
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <Select
                      value={llmFallback ? llmFallback.provider : 'none'}
                      onValueChange={(v) => {
                        if (v === 'none') {
                          setLlmFallback!(null);
                          return;
                        }
                        const prov = v as LlmProviderId;
                        const catalog = prov === 'grok' ? grokAdminCatalog! : adminModelCatalog;
                        const first = catalog[0]?.value ?? '';
                        setLlmFallback!({
                          provider: prov,
                          model: llmFallback?.provider === prov ? llmFallback.model : first,
                        });
                      }}
                      itemToStringLabel={(v) =>
                        v === 'none' ? 'None' : v === 'gemini' ? 'Gemini' : v === 'grok' ? 'Grok (xAI)' : String(v ?? '')
                      }
                    >
                      <SelectTrigger className="h-auto min-h-10 w-full rounded-xl py-2.5 font-medium sm:max-w-[11rem]">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="gemini">Gemini</SelectItem>
                        <SelectItem value="grok">Grok (xAI)</SelectItem>
                      </SelectContent>
                    </Select>
                    {llmFallback ? (
                      <Select
                        value={llmFallback.model}
                        onValueChange={(v) => setLlmFallback!({ ...llmFallback, model: v ?? llmFallback.model })}
                        itemToStringLabel={(v) => {
                          const cat = llmFallback.provider === 'grok' ? grokAdminCatalog! : adminModelCatalog;
                          return cat.find((m) => m.value === v)?.label ?? String(v ?? '');
                        }}
                      >
                        <SelectTrigger className="h-auto min-h-10 min-w-0 w-full flex-1 rounded-xl py-2.5 font-medium">
                          <SelectValue placeholder="Model" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[min(100vw-1.5rem,36rem)]">
                          {(llmFallback.provider === 'grok' ? grokAdminCatalog! : adminModelCatalog).map((m) => (
                            <SelectItem key={m.value} value={m.value} className="items-start py-2.5">
                              <span className="whitespace-normal leading-snug">{m.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            <div className={multiLlmReady ? 'mt-6 space-y-4' : 'mt-4 space-y-4'}>
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Allowed Gemini models</label>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  These models are used for GitHub Actions draft workflows and appear in the Home model picker when Gemini is available. Only admins can change this list. Everyone else can choose among allowed models (or use the single model when only one is enabled).
                </p>
                <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-canvas px-3 py-2.5">
                  {adminModelCatalog.map((m) => {
                    const checked = allowedGoogleModels.includes(m.value);
                    const soleChecked = checked && allowedGoogleModels.length <= 1;
                    return (
                      <label
                        key={m.value}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink transition-colors hover:bg-violet-100/40',
                          soleChecked && 'cursor-default',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
                          checked={checked}
                          disabled={soleChecked}
                          onChange={(e) => toggleAllowedGoogleModel(m.value, e.target.checked)}
                        />
                        <span className="min-w-0 leading-snug">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            {multiLlmReady ? (
              <div className="mt-6">
                <label className="mb-1 block text-sm font-semibold text-ink">Allowed Grok models</label>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">Non-admins only see models you enable here when Grok is primary.</p>
                <div className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-canvas px-3 py-2.5">
                  {grokAdminCatalog!.map((m) => {
                    const checked = allowedGrokModels!.includes(m.value);
                    const soleChecked = checked && allowedGrokModels!.length <= 1;
                    return (
                      <label
                        key={m.value}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-ink transition-colors hover:bg-violet-100/40',
                          soleChecked && 'cursor-default',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
                          checked={checked}
                          disabled={soleChecked}
                          onChange={(e) => toggleAllowedGrokModel!(m.value, e.target.checked)}
                        />
                        <span className="min-w-0 leading-snug">{m.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </SettingsSectionCard>
        ) : null}

        <SettingsSectionCard id="settings-generate-posts" title="Generate Posts">
          <p className="text-xs leading-5 text-muted mb-4">
            Configure the LLM provider and model used for generating post content and variations.
          </p>
          <PostGenerateSettings
            onSettingsChange={(settings) => {
              void onSaveGenerationLlm?.({
                provider: settings.provider,
                model: settings.model,
              });
            }}
          />
        </SettingsSectionCard>

        <SettingsSectionCard id="settings-instagram" title="Instagram Publishing">
          <p className="text-xs leading-5 text-muted">
            Approved Instagram posts are published directly from the Worker using Instagram Login for professional accounts.
          </p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">Status</p>
              <div className="flex items-center gap-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${session.config.hasInstagramAccessToken && session.config.instagramUserId ? 'bg-[#E1306C]' : 'bg-border-strong'}`}
                />
                <p className="text-sm font-medium text-ink">
                  {session.config.hasInstagramAccessToken && session.config.instagramUserId
                    ? `Connected as ${session.config.instagramUsername ? `@${session.config.instagramUsername}` : session.config.instagramUserId}.`
                    : session.config.instagramAuthAvailable
                      ? 'No Instagram professional account connected yet.'
                      : 'Instagram app credentials are still missing from the Worker environment.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => void handleInstagramConnection()}
                disabled={channelActionBusy || !session.config.instagramAuthAvailable}
                className="w-full rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] px-4 py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {connectingChannel === 'instagram'
                  ? 'Opening Instagram approval...'
                  : session.config.hasInstagramAccessToken
                    ? 'Reconnect Instagram'
                    : 'Connect Instagram'}
              </Button>
              {session.config.hasInstagramAccessToken ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => void handleDisconnectChannel('instagram')}
                  disabled={channelActionBusy}
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  {disconnectingChannel === 'instagram' ? 'Disconnecting Instagram...' : 'Disconnect Instagram'}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted">
              {session.config.instagramAuthAvailable
                ? 'The Worker opens Instagram approval in a popup, exchanges the code server-side, and stores the long-lived token securely.'
                : 'Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in the Worker before this button can be used.'}
            </p>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard id="settings-linkedin" title="LinkedIn Publishing">
          <p className="text-xs leading-5 text-muted">
            Approved LinkedIn posts are published directly from the Worker, without going through GitHub Actions.
          </p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">Status</p>
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasLinkedInAccessToken ? 'bg-[#0A66C2]' : 'bg-border-strong'}`} />
                <p className="text-sm font-medium text-ink">
                  {session.config.hasLinkedInAccessToken
                    ? `Connected as ${session.config.linkedinPersonUrn || 'a LinkedIn member account'}.`
                    : session.config.linkedinAuthAvailable
                      ? 'No LinkedIn account connected yet.'
                      : 'LinkedIn OAuth app credentials are still missing from the Worker environment.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => void handleLinkedInConnection()}
                disabled={channelActionBusy || !session.config.linkedinAuthAvailable}
                className="w-full rounded-xl bg-[#0A66C2] px-4 py-3 text-sm font-bold text-white hover:bg-[#004182] disabled:opacity-50"
              >
                {connectingChannel === 'linkedin'
                  ? 'Opening LinkedIn approval...'
                  : session.config.hasLinkedInAccessToken
                    ? 'Reconnect LinkedIn'
                    : 'Connect LinkedIn'}
              </Button>
              {session.config.hasLinkedInAccessToken ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => void handleDisconnectChannel('linkedin')}
                  disabled={channelActionBusy}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {disconnectingChannel === 'linkedin' ? 'Disconnecting LinkedIn...' : 'Disconnect LinkedIn'}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted">
              {session.config.linkedinAuthAvailable
                ? 'The Worker opens LinkedIn approval in a popup, exchanges the code server-side, and stores the token securely.'
                : 'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in the Worker before this button can be used.'}
            </p>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard id="settings-telegram" title="Telegram Delivery">
          <p className="text-xs leading-5 text-muted">This path sends approved content directly through the Telegram Bot API.</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">Status</p>
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${session.config.hasTelegramBotToken ? 'bg-[#0088cc]' : 'bg-border-strong'}`} />
                  <p className="text-sm font-medium text-ink">
                    {session.config.hasTelegramBotToken
                      ? 'Telegram bot token is stored in the Worker.'
                      : 'No Telegram bot token stored yet.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Replace Telegram Bot Token</label>
                <Input
                  type="password"
                  value={telegramBotTokenInput}
                  onChange={(e) => setTelegramBotTokenInput(e.target.value)}
                  placeholder={session.config.hasTelegramBotToken ? 'Leave blank to keep the current bot token' : '123456789:AA...'}
                  className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="mt-1.5 text-xs text-muted">
                  {session.config.hasTelegramBotToken
                    ? 'A bot token is already stored. Enter a new one only when you want to rotate it.'
                    : 'Create a bot with BotFather, then paste the token here once so the Worker can deliver messages.'}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Saved Chats</label>
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Quick add</p>
                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
                  <Input
                    type="text"
                    value={telegramDraftLabel}
                    onChange={(e) => {
                      setTelegramDraftLabel(e.target.value);
                      setTelegramVerification(null);
                    }}
                    placeholder="Team channel"
                    className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Input
                    type="text"
                    value={telegramDraftChatId}
                    onChange={(e) => {
                      setTelegramDraftChatId(e.target.value);
                      setTelegramVerification(null);
                    }}
                    placeholder="@my_channel or 123456789 / -1001234567890"
                    className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => void handleVerifyTelegramChat()}
                      disabled={verifyingTelegramChat}
                      className="gap-2 rounded-xl border-success-border bg-success-surface text-success-ink hover:bg-emerald-100/90 disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${verifyingTelegramChat ? 'animate-spin' : ''}`} />
                      {verifyingTelegramChat ? 'Verifying...' : 'Verify chat'}
                    </Button>
                    <Button
                      type="button"
                      variant="ink"
                      size="md"
                      onClick={handleAddTelegramRecipient}
                      className="gap-2 rounded-xl"
                    >
                      <Plus className="h-4 w-4" /> Add chat
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Use @channelusername only for public channels or public supergroups. For people, private groups, and private channels, start or add the bot first and use the numeric chat ID instead.
                </p>
                {telegramVerification ? (
                  <div
                    className={`mt-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${telegramVerification.kind === 'success' ? 'border-success-border bg-success-surface/90 text-success-ink' : 'border-rose-200 bg-rose-50/80 text-rose-700'}`}
                  >
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
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleUseManualTelegramChat}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold"
                  >
                    <MessageCircle className="h-4 w-4" /> Use the manual chat ID from the delivery panel
                  </Button>
                ) : null}
              </div>

              {parsedTelegramRecipients.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Saved now</p>
                  <div className="mt-3 space-y-2">
                    {parsedTelegramRecipients.map((recipient) => (
                      <div
                        key={`${recipient.label}-${recipient.chatId}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-canvas px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink">{recipient.label}</p>
                          <p className="text-xs text-muted">{recipient.chatId}</p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRemoveTelegramRecipient(recipient.chatId)}
                          className="gap-2 rounded-lg text-muted hover:border-rose-200 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Textarea
                className="mt-3 min-h-[176px] w-full rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={telegramRecipientsInput}
                onChange={(e) => setTelegramRecipientsInput(e.target.value)}
                placeholder={['Channel | @my_channel', 'Founders group | -1001234567890'].join('\n')}
              />
              <p className="mt-1.5 text-xs text-muted">Bulk editor. One chat per line using the format &quot;Label | @channelusername&quot; or &quot;Label | -1001234567890&quot;.</p>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard id="settings-whatsapp" title="WhatsApp Delivery">
          <p className="text-xs leading-5 text-muted">This path sends non-template WhatsApp messages directly through Meta Cloud API.</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">Status</p>
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${session.config.hasWhatsAppAccessToken && session.config.whatsappPhoneNumberId ? 'bg-[#25D366]' : 'bg-border-strong'}`}
                  />
                  <p className="text-sm font-medium text-ink">
                    {session.config.hasWhatsAppAccessToken && session.config.whatsappPhoneNumberId
                      ? `Connected to WhatsApp phone ${session.config.whatsappPhoneNumberId}.`
                      : session.config.whatsappAuthAvailable
                        ? 'No WhatsApp Business phone connected yet.'
                        : 'Meta OAuth app credentials are still missing from the Worker environment.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => void handleWhatsAppConnection()}
                  disabled={channelActionBusy || !session.config.whatsappAuthAvailable}
                  className="w-full rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white hover:bg-[#128C7E] disabled:opacity-50"
                >
                  {connectingChannel === 'whatsapp'
                    ? 'Opening Meta approval...'
                    : session.config.hasWhatsAppAccessToken
                      ? 'Reconnect WhatsApp'
                      : 'Connect WhatsApp Business'}
                </Button>
                {session.config.hasWhatsAppAccessToken ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => void handleDisconnectChannel('whatsapp')}
                    disabled={channelActionBusy}
                    className="w-full rounded-xl border-success-border bg-success-surface text-success-ink hover:bg-emerald-100/90 disabled:opacity-50"
                  >
                    {disconnectingChannel === 'whatsapp' ? 'Disconnecting WhatsApp...' : 'Disconnect WhatsApp'}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted">
                {session.config.whatsappAuthAvailable
                  ? 'The Worker opens Meta approval in a popup, exchanges the code server-side, and discovers your available WhatsApp Business phone numbers.'
                  : 'Set META_APP_ID and META_APP_SECRET in the Worker before this button can be used.'}
              </p>

              {pendingWhatsAppOptions.length > 0 ? (
                <div className="rounded-2xl border border-success-border bg-success-surface/80 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success-ink/85">Choose a phone</p>
                  <Select
                    value={selectedWhatsAppPhoneId}
                    onValueChange={(val) => setSelectedWhatsAppPhoneId(val as string)}
                    itemToStringLabel={(v) => {
                      const o = pendingWhatsAppOptions.find((opt) => opt.phoneNumberId === v);
                      if (!o) return String(v ?? '');
                      const line = o.displayPhoneNumber || o.phoneNumberId;
                      const name = o.verifiedName || o.businessAccountName;
                      return name ? `${line} - ${name}` : line;
                    }}
                  >
                    <SelectTrigger className="mt-3 min-h-[44px] w-full rounded-xl border border-success-border bg-success-surface/90 px-3.5 py-3 text-sm font-semibold text-ink shadow-sm backdrop-blur-md transition-[box-shadow,border-color,background-color] focus:border-cta focus:ring-2 focus:ring-cta/30">
                      <SelectValue placeholder="Select a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingWhatsAppOptions.map((option) => (
                        <SelectItem key={option.phoneNumberId} value={option.phoneNumberId}>
                          {option.displayPhoneNumber || option.phoneNumberId} - {option.verifiedName || option.businessAccountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ink"
                    size="md"
                    onClick={() => void completeWhatsAppPhoneSelection()}
                    disabled={channelActionBusy || !selectedWhatsAppPhoneId}
                    className="mt-3 w-full rounded-xl disabled:opacity-50"
                  >
                    Save selected phone
                  </Button>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-ink">Saved Recipients</label>
              <Textarea
                value={whatsappRecipientsInput}
                onChange={(e) => setWhatsappRecipientsInput(e.target.value)}
                placeholder={['Founders group | +14155550101', 'Ops lead | +919876543210'].join('\n')}
                className="min-h-[176px] w-full rounded-xl border border-border bg-canvas px-4 py-3 text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="mt-1.5 text-xs text-muted">One recipient per line using the format &quot;Label | +15551234567&quot;.</p>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard id="settings-gmail" title="Gmail Delivery">
          <p className="text-xs leading-5 text-muted">This path sends emails directly through the Gmail API.</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">Status</p>
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${session.config.hasGmailAccessToken ? 'bg-[#EA4335]' : 'bg-border-strong'}`}
                  />
                  <p className="text-sm font-medium text-ink">
                    {session.config.hasGmailAccessToken
                      ? `Connected as ${session.config.gmailEmailAddress || 'a Gmail account'}.`
                      : session.config.gmailAuthAvailable
                        ? 'No Gmail account connected yet.'
                        : 'Gmail OAuth app credentials are still missing from the Worker environment.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => void handleGmailConnection()}
                  disabled={channelActionBusy || !session.config.gmailAuthAvailable}
                  className="w-full rounded-xl bg-[#EA4335] px-4 py-3 text-sm font-bold text-white hover:bg-[#D93025] disabled:opacity-50"
                >
                  {connectingChannel === 'gmail'
                    ? 'Opening Google approval...'
                    : session.config.hasGmailAccessToken
                      ? 'Reconnect Gmail'
                      : 'Connect Gmail'}
                </Button>
                {session.config.hasGmailAccessToken ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => void handleDisconnectChannel('gmail')}
                    disabled={channelActionBusy}
                    className="w-full rounded-xl border-success-border bg-success-surface text-success-ink hover:bg-emerald-100/90 disabled:opacity-50"
                  >
                    {disconnectingChannel === 'gmail' ? 'Disconnecting Gmail...' : 'Disconnect Gmail'}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted">
                {session.config.gmailAuthAvailable
                  ? 'The Worker opens Google approval in a popup and exchanges the code server-side.'
                  : 'Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in the Worker before this button can be used.'}
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Default recipient (global)</p>
              <p className="text-xs text-muted">Applied to all topics that don't have their own email settings saved in the editor.</p>
              <div>
                <label htmlFor="gmail-default-to" className="block text-xs font-semibold text-ink mb-1">
                  Default To
                </label>
                <Input
                  id="gmail-default-to"
                  value={gmailDefaultTo}
                  onChange={(e) => setGmailDefaultTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="text-sm"
                  aria-label="Default Gmail To"
                />
              </div>
              <div>
                <label htmlFor="gmail-default-cc" className="block text-xs font-semibold text-ink mb-1">
                  Default Cc
                </label>
                <Input
                  id="gmail-default-cc"
                  value={gmailDefaultCc}
                  onChange={(e) => setGmailDefaultCc(e.target.value)}
                  className="text-sm"
                  placeholder="Optional Cc addresses"
                  aria-label="Default Gmail Cc"
                />
              </div>
              <div>
                <label htmlFor="gmail-default-bcc" className="block text-xs font-semibold text-ink mb-1">
                  Default Bcc
                </label>
                <Input
                  id="gmail-default-bcc"
                  value={gmailDefaultBcc}
                  onChange={(e) => setGmailDefaultBcc(e.target.value)}
                  className="text-sm"
                  placeholder="Optional Bcc addresses"
                  aria-label="Default Gmail Bcc"
                />
              </div>
              <div>
                <label htmlFor="gmail-default-subject" className="block text-xs font-semibold text-ink mb-1">
                  Default Subject
                </label>
                <Input
                  id="gmail-default-subject"
                  value={gmailDefaultSubject}
                  onChange={(e) => setGmailDefaultSubject(e.target.value)}
                  placeholder="Subject line"
                  className="text-sm"
                  aria-label="Default Gmail subject"
                />
              </div>
            </div>
          </div>
        </SettingsSectionCard>

        {FEATURE_NEWS_RESEARCH && newsResearch && setNewsResearch && newsProviderKeys ? (
          <SettingsSectionCard id="settings-news" title="News">
            <NewsResearchSettingsSection
              value={newsResearch}
              onChange={setNewsResearch}
              newsProviderKeys={newsProviderKeys}
            />
          </SettingsSectionCard>
        ) : null}

        {FEATURE_CONTENT_REVIEW && contentReview && setContentReview ? (
          <SettingsSectionCard id="settings-content-review" title="Content review">
            <p className="mb-4 text-xs leading-relaxed text-muted">
              Models used for the editor <strong className="text-ink">Content checker</strong> (text guardrails and image review). Requires{' '}
              <code className="rounded bg-border/40 px-1 font-mono text-[0.65rem]">GEMINI_API_KEY</code> on the Worker.
            </p>
            <ContentReviewSettings
              value={contentReview}
              onChange={setContentReview}
              newsResearchEnabled={Boolean(newsResearchEnabledForContentReview)}
            />
          </SettingsSectionCard>
        ) : null}
      </div>
    </div>
  );
  }
);

DashboardSettingsDrawer.displayName = 'DashboardSettingsDrawer';
