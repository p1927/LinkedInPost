import { useState, useEffect, useCallback, useMemo } from 'react';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '../../../services/backendApi';
import {
  type BotConfig,
  type BotConfigUpdate,
  type GoogleModelOption,
  type LlmProviderId,
  type LlmRef,
  type ImageGenProvider,
  AVAILABLE_GOOGLE_MODELS,
  DEFAULT_GOOGLE_MODEL,
  DEFAULT_NEWS_RESEARCH_CONFIG,
  DEFAULT_CONTENT_REVIEW_STORED,
  loadAvailableGoogleModels,
  normalizeGoogleModelOptions,
  normalizeContentReviewStored,
  type NewsResearchStored,
  type ContentReviewStored,
  type EnrichmentSkillConfig,
  type EnrichmentSkillId,
} from '../../../services/configService';
import { FEATURE_CONTENT_REVIEW, FEATURE_MULTI_PROVIDER_LLM, FEATURE_NEWS_RESEARCH } from '../../../generated/features';
import { type ChannelId } from '../../../integrations/channels';
import { formatTelegramRecipientsInput, parseTelegramRecipientsInput, type TelegramRecipient } from '../../../integrations/telegram';
import { formatRecipientsInput, parseRecipientsInput, type WhatsAppRecipient } from '../../../integrations/whatsapp';
import { useAlert } from '../../useAlert';

function recipientsInputMatchesSaved<T extends TelegramRecipient | WhatsAppRecipient>(
  input: string,
  saved: T[],
  parse: (raw: string) => T[],
  format: (list: T[]) => string,
): boolean {
  const canonical = format(saved);
  if (input.trim() === canonical.trim()) return true;
  try {
    return format(parse(input)) === canonical;
  } catch {
    return false;
  }
}

function normalizeGrokOptions(models: GoogleModelOption[], selected?: string): GoogleModelOption[] {
  const deduped = Array.from(
    new Map(models.filter((m) => m.value.trim() && m.label.trim()).map((m) => [m.value.trim(), m])).values(),
  );
  if (selected && !deduped.some((m) => m.value === selected)) {
    deduped.unshift({ value: selected, label: selected, provider: 'grok' as const });
  }
  return deduped;
}

function normalizeOpenrouterOptions(models: GoogleModelOption[], selected?: string): GoogleModelOption[] {
  const deduped = Array.from(
    new Map(models.filter((m) => m.value.trim() && m.label.trim()).map((m) => [m.value.trim(), m])).values(),
  );
  if (selected && !deduped.some((m) => m.value === selected)) {
    deduped.unshift({ value: selected, label: selected, provider: 'openrouter' as const });
  }
  return deduped;
}

function normalizeMinimaxOptions(models: GoogleModelOption[], selected?: string): GoogleModelOption[] {
  const deduped = Array.from(
    new Map(models.filter((m) => m.value.trim() && m.label.trim()).map((m) => [m.value.trim(), m])).values(),
  );
  if (selected && !deduped.some((m) => m.value === selected)) {
    deduped.unshift({ value: selected, label: selected, provider: 'minimax' as const });
  }
  return deduped;
}

export function useDashboardSettings({
  idToken,
  api,
  session,
  onSaveConfig,
  onAuthExpired,
  loadData,
  selectedChannel,
  telegramRecipientsInput,
  whatsappRecipientsInput,
}: {
  idToken: string;
  api: BackendApi;
  session: AppSession;
  onSaveConfig: (config: BotConfigUpdate) => Promise<BotConfig>;
  onAuthExpired: () => void;
  loadData: (quiet?: boolean) => Promise<void>;
  selectedChannel: ChannelId;
  telegramRecipientsInput: string;
  whatsappRecipientsInput: string;
}) {
  const { showAlert } = useAlert();
  const [sheetIdInput, setSheetIdInput] = useState(session.config.spreadsheetId);
  const [githubRepo, setGithubRepo] = useState(session.config.githubRepo);
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [llmPrimaryProvider, setLlmPrimaryProvider] = useState<LlmProviderId>(() =>
    FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.primary ? session.config.llm.primary.provider : 'gemini',
  );
  const [googleModel, setGoogleModel] = useState(() =>
    FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.primary
      ? session.config.llm.primary.model
      : session.config.googleModel,
  );
  const [llmFallback, setLlmFallback] = useState<LlmRef | null>(() =>
    FEATURE_MULTI_PROVIDER_LLM ? (session.config.llm?.fallback ?? null) : null,
  );
  const [allowedGoogleModels, setAllowedGoogleModels] = useState<string[]>(() => [...session.config.allowedGoogleModels]);
  const [allowedGrokModels, setAllowedGrokModels] = useState<string[]>(() =>
    FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedGrokModels?.length
      ? [...session.config.llm.allowedGrokModels]
      : [],
  );
  const [catalogModels, setCatalogModels] = useState<GoogleModelOption[]>(AVAILABLE_GOOGLE_MODELS);
  const [grokCatalogModels, setGrokCatalogModels] = useState<GoogleModelOption[]>([]);
  const [openrouterCatalogModels, setOpenrouterCatalogModels] = useState<GoogleModelOption[]>([]);
  const [allowedOpenrouterModels, setAllowedOpenrouterModels] = useState<string[]>(() =>
    FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedOpenrouterModels?.length
      ? [...session.config.llm.allowedOpenrouterModels]
      : [],
  );
  const [minimaxCatalogModels, setMinimaxCatalogModels] = useState<GoogleModelOption[]>([]);
  const [allowedMinimaxModels, setAllowedMinimaxModels] = useState<string[]>(() =>
    FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedMinimaxModels?.length
      ? [...session.config.llm.allowedMinimaxModels]
      : [],
  );
  const [savingConfig, setSavingConfig] = useState(false);
  const [telegramBotTokenInput, setTelegramBotTokenInput] = useState('');
  const [gmailDefaultTo, setGmailDefaultTo] = useState(session.config.gmailDefaultTo || '');
  const [gmailDefaultCc, setGmailDefaultCc] = useState(session.config.gmailDefaultCc || '');
  const [gmailDefaultBcc, setGmailDefaultBcc] = useState(session.config.gmailDefaultBcc || '');
  const [gmailDefaultSubject, setGmailDefaultSubject] = useState(session.config.gmailDefaultSubject || '');
  const [newsResearch, setNewsResearch] = useState<NewsResearchStored>(() =>
    session.config.newsResearch || DEFAULT_NEWS_RESEARCH_CONFIG,
  );
  const [contentReview, setContentReview] = useState<ContentReviewStored>(() =>
    FEATURE_CONTENT_REVIEW
      ? normalizeContentReviewStored(session.config.contentReview)
      : DEFAULT_CONTENT_REVIEW_STORED,
  );
  const [imageGenProvider, setImageGenProvider] = useState<ImageGenProvider>(
    () => (session.config.imageGen?.provider as ImageGenProvider) ?? 'pixazo',
  );
  const [imageGenModel, setImageGenModel] = useState<string>(
    () => session.config.imageGen?.model ?? '',
  );
  const [enrichmentSkills, setEnrichmentSkills] = useState<EnrichmentSkillConfig[]>(
    () => session.config.enrichmentSkills ?? [],
  );

  const handleFailure = useCallback((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    console.error(error);
    if (isAuthErrorMessage(message)) {
      onAuthExpired();
      return;
    }
    void showAlert({ title: 'Notice', description: message || fallbackMessage });
  }, [onAuthExpired, showAlert]);

  const refreshGrokModels = useCallback(async () => {
    if (!FEATURE_MULTI_PROVIDER_LLM) return;
    try {
      const models = normalizeGrokOptions(await api.listLlmModels(idToken, 'grok'), googleModel);
      setGrokCatalogModels(models);
    } catch (error) {
      handleFailure(error, 'Failed to load Grok models.');
    }
  }, [api, idToken, googleModel, handleFailure]);

  useEffect(() => {
    setAllowedGoogleModels([...session.config.allowedGoogleModels]);
    if (FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedGrokModels?.length) {
      setAllowedGrokModels([...session.config.llm.allowedGrokModels]);
    }
    if (FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedOpenrouterModels?.length) {
      setAllowedOpenrouterModels([...session.config.llm.allowedOpenrouterModels]);
    }
    if (FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.allowedMinimaxModels?.length) {
      setAllowedMinimaxModels([...session.config.llm.allowedMinimaxModels]);
    }
  }, [session.config.allowedGoogleModels, session.config.llm?.allowedGrokModels, session.config.llm?.allowedOpenrouterModels, session.config.llm?.allowedMinimaxModels]);

  const llmSnapshot = JSON.stringify(session.config.llm ?? null);
  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM) return;
    const p = session.config.llm?.primary;
    if (p) {
      setLlmPrimaryProvider(p.provider);
      setGoogleModel(p.model);
    } else {
      setLlmPrimaryProvider('gemini');
      setGoogleModel(session.config.googleModel);
    }
    setLlmFallback(session.config.llm?.fallback ?? null);
  }, [llmSnapshot, session.config.googleModel, session.config.llm?.fallback, session.config.llm?.primary]);

  useEffect(() => {
    if (!FEATURE_NEWS_RESEARCH) return;
    setNewsResearch(session.config.newsResearch || DEFAULT_NEWS_RESEARCH_CONFIG);
  }, [session.config.newsResearch]);

  useEffect(() => {
    if (!FEATURE_CONTENT_REVIEW) return;
    setContentReview(normalizeContentReviewStored(session.config.contentReview));
  }, [session.config.contentReview]);

  useEffect(() => {
    setImageGenProvider((session.config.imageGen?.provider as ImageGenProvider) ?? 'pixazo');
    setImageGenModel(session.config.imageGen?.model ?? '');
  }, [session.config.imageGen]);

  useEffect(() => {
    let cancelled = false;
    const syncModels = async () => {
      try {
        const models = normalizeGoogleModelOptions(await api.getGoogleModels(idToken), session.config.googleModel);
        if (!cancelled) {
          setCatalogModels(models);
        }
      } catch {
        const fallbackModels = await loadAvailableGoogleModels(session.config.googleModel);
        if (!cancelled) {
          setCatalogModels(fallbackModels);
        }
      }
    };
    void syncModels();
    return () => {
      cancelled = true;
    };
  }, [api, idToken, session.config.googleModel, session.isAdmin]);

  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM) return;
    let cancelled = false;
    const run = async () => {
      try {
        const models = normalizeGrokOptions(await api.listLlmModels(idToken, 'grok'));
        if (!cancelled) setGrokCatalogModels(models);
      } catch {
        if (!cancelled) setGrokCatalogModels([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [api, idToken]);

  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM) return;
    let cancelled = false;
    const run = async () => {
      try {
        const models = normalizeOpenrouterOptions(await api.listLlmModels(idToken, 'openrouter'));
        if (!cancelled) setOpenrouterCatalogModels(models);
      } catch {
        if (!cancelled) setOpenrouterCatalogModels([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [api, idToken]);

  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM || !session.isAdmin) return;
    if (allowedGrokModels.length > 0) return;
    if (grokCatalogModels.length === 0) return;
    setAllowedGrokModels(grokCatalogModels.map((m) => m.value));
  }, [session.isAdmin, grokCatalogModels, allowedGrokModels.length]);

  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM || !session.isAdmin) return;
    if (allowedOpenrouterModels.length > 0) return;
    if (openrouterCatalogModels.length === 0) return;
    setAllowedOpenrouterModels(openrouterCatalogModels.map((m) => m.value));
  }, [session.isAdmin, openrouterCatalogModels, allowedOpenrouterModels.length]);

  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM) return;
    let cancelled = false;
    const run = async () => {
      try {
        const models = normalizeMinimaxOptions(await api.listLlmModels(idToken, 'minimax'));
        if (!cancelled) setMinimaxCatalogModels(models);
      } catch {
        if (!cancelled) setMinimaxCatalogModels([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [api, idToken]);

  useEffect(() => {
    if (!FEATURE_MULTI_PROVIDER_LLM || !session.isAdmin) return;
    if (allowedMinimaxModels.length > 0) return;
    if (minimaxCatalogModels.length === 0) return;
    setAllowedMinimaxModels(minimaxCatalogModels.map((m) => m.value));
  }, [session.isAdmin, minimaxCatalogModels, allowedMinimaxModels.length]);

  const effectiveAllowedGemini = session.isAdmin ? allowedGoogleModels : session.config.allowedGoogleModels;
  const effectiveAllowedGrok = session.isAdmin
    ? allowedGrokModels
    : session.config.llm?.allowedGrokModels || [];

  const effectiveAllowedOpenrouter = session.isAdmin
    ? allowedOpenrouterModels
    : session.config.llm?.allowedOpenrouterModels || [];

  const effectiveAllowedMinimax = session.isAdmin
    ? allowedMinimaxModels
    : session.config.llm?.allowedMinimaxModels || [];

  const availableModels = useMemo(() => {
    if (FEATURE_MULTI_PROVIDER_LLM && llmPrimaryProvider === 'grok') {
      const catalog = grokCatalogModels.length > 0 ? grokCatalogModels : normalizeGrokOptions([], googleModel);
      const allow = new Set(effectiveAllowedGrok.length > 0 ? effectiveAllowedGrok : catalog.map((m) => m.value));
      return catalog.filter((model) => allow.has(model.value));
    }
    if (FEATURE_MULTI_PROVIDER_LLM && llmPrimaryProvider === 'openrouter') {
      const catalog = openrouterCatalogModels.length > 0 ? openrouterCatalogModels : normalizeOpenrouterOptions([], googleModel);
      const allow = new Set(effectiveAllowedOpenrouter.length > 0 ? effectiveAllowedOpenrouter : catalog.map((m) => m.value));
      return catalog.filter((model) => allow.has(model.value));
    }
    if (FEATURE_MULTI_PROVIDER_LLM && llmPrimaryProvider === 'minimax') {
      const catalog = minimaxCatalogModels.length > 0 ? minimaxCatalogModels : normalizeMinimaxOptions([], googleModel);
      const allow = new Set(effectiveAllowedMinimax.length > 0 ? effectiveAllowedMinimax : catalog.map((m) => m.value));
      return catalog.filter((model) => allow.has(model.value));
    }
    const allow = new Set(effectiveAllowedGemini.length > 0 ? effectiveAllowedGemini : [DEFAULT_GOOGLE_MODEL]);
    return catalogModels.filter((model) => allow.has(model.value));
  }, [
    llmPrimaryProvider,
    grokCatalogModels,
    openrouterCatalogModels,
    minimaxCatalogModels,
    catalogModels,
    effectiveAllowedGemini,
    effectiveAllowedGrok,
    effectiveAllowedOpenrouter,
    effectiveAllowedMinimax,
    googleModel,
  ]);

  useEffect(() => {
    if (availableModels.length === 0) return;
    if (availableModels.some((model) => model.value === googleModel)) return;
    const serverModel =
      FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.primary
        ? session.config.llm.primary.model
        : session.config.googleModel;
    const fallbackModel =
      availableModels.find((model) => model.value === serverModel)?.value
      || availableModels[0]?.value
      || (llmPrimaryProvider === 'grok' ? googleModel : DEFAULT_GOOGLE_MODEL);
    if (fallbackModel !== googleModel) {
      setGoogleModel(fallbackModel);
    }
  }, [availableModels, googleModel, session.config.googleModel, session.config.llm?.primary, llmPrimaryProvider]);

  const toggleAllowedGoogleModel = useCallback((modelId: string, enabled: boolean) => {
    setAllowedGoogleModels((prev) => {
      if (enabled) {
        return [...new Set([...prev, modelId])];
      }
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((id) => id !== modelId);
    });
  }, []);

  const toggleAllowedGrokModel = useCallback((modelId: string, enabled: boolean) => {
    setAllowedGrokModels((prev) => {
      if (enabled) {
        return [...new Set([...prev, modelId])];
      }
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((id) => id !== modelId);
    });
  }, []);

  const toggleAllowedOpenrouterModel = useCallback((modelId: string, enabled: boolean) => {
    setAllowedOpenrouterModels((prev) => {
      if (enabled) {
        return [...new Set([...prev, modelId])];
      }
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((id) => id !== modelId);
    });
  }, []);

  const toggleAllowedMinimaxModel = useCallback((modelId: string, enabled: boolean) => {
    setAllowedMinimaxModels((prev) => {
      if (enabled) {
        return [...new Set([...prev, modelId])];
      }
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((id) => id !== modelId);
    });
  }, []);

  const refreshOpenrouterModels = useCallback(async () => {
    if (!FEATURE_MULTI_PROVIDER_LLM) return;
    try {
      const models = normalizeOpenrouterOptions(await api.listLlmModels(idToken, 'openrouter'), googleModel);
      setOpenrouterCatalogModels(models);
    } catch (error) {
      handleFailure(error, 'Failed to load OpenRouter models.');
    }
  }, [api, idToken, googleModel, handleFailure]);

  const serverToolbarModel =
    FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.primary
      ? session.config.llm.primary.model
      : session.config.googleModel;
  const serverToolbarProvider: LlmProviderId =
    FEATURE_MULTI_PROVIDER_LLM && session.config.llm?.primary ? session.config.llm.primary.provider : 'gemini';
  const serverFallbackKey = JSON.stringify(session.config.llm?.fallback ?? null);
  const draftFallbackKey = JSON.stringify(llmFallback);

  const hasUnsavedSettingsChanges = useMemo(() => {
    const c = session.config;
    if (sheetIdInput.trim() !== c.spreadsheetId) return true;
    if (githubRepo.trim() !== c.githubRepo) return true;
    if (googleModel !== serverToolbarModel || llmPrimaryProvider !== serverToolbarProvider) return true;
    if (FEATURE_MULTI_PROVIDER_LLM && draftFallbackKey !== serverFallbackKey) return true;
    const a = [...allowedGoogleModels].sort();
    const b = [...c.allowedGoogleModels].sort();
    if (a.length !== b.length || a.some((id, i) => id !== b[i])) return true;
    if (FEATURE_MULTI_PROVIDER_LLM) {
      const ag = [...allowedGrokModels].sort();
      const bg = [...(c.llm?.allowedGrokModels || [])].sort();
      if (ag.length !== bg.length || ag.some((id, i) => id !== bg[i])) return true;
      const ao = [...allowedOpenrouterModels].sort();
      const bo = [...(c.llm?.allowedOpenrouterModels || [])].sort();
      if (ao.length !== bo.length || ao.some((id, i) => id !== bo[i])) return true;
      const am = [...allowedMinimaxModels].sort();
      const bm = [...(c.llm?.allowedMinimaxModels || [])].sort();
      if (am.length !== bm.length || am.some((id, i) => id !== bm[i])) return true;
    }
    if (githubTokenInput.trim() !== '') return true;
    if (telegramBotTokenInput.trim() !== '') return true;
    if (selectedChannel !== c.defaultChannel) return true;
    if (
      !recipientsInputMatchesSaved(telegramRecipientsInput, c.telegramRecipients, parseTelegramRecipientsInput, formatTelegramRecipientsInput)
    ) {
      return true;
    }
    if (
      !recipientsInputMatchesSaved(whatsappRecipientsInput, c.whatsappRecipients, parseRecipientsInput, formatRecipientsInput)
    ) {
      return true;
    }
    if (gmailDefaultTo.trim() !== (c.gmailDefaultTo || '').trim()) return true;
    if (gmailDefaultCc.trim() !== (c.gmailDefaultCc || '').trim()) return true;
    if (gmailDefaultBcc.trim() !== (c.gmailDefaultBcc || '').trim()) return true;
    if (gmailDefaultSubject.trim() !== (c.gmailDefaultSubject || '').trim()) return true;
    if (
      FEATURE_NEWS_RESEARCH
      && JSON.stringify(newsResearch) !== JSON.stringify(c.newsResearch ?? DEFAULT_NEWS_RESEARCH_CONFIG)
    ) {
      return true;
    }
    if (
      FEATURE_CONTENT_REVIEW
      && JSON.stringify(contentReview) !== JSON.stringify(normalizeContentReviewStored(c.contentReview))
    ) {
      return true;
    }
    if (imageGenProvider !== (c.imageGen?.provider ?? 'pixazo')) return true;
    if (imageGenModel !== (c.imageGen?.model ?? '')) return true;
    return false;
  }, [
    session.config,
    sheetIdInput,
    githubRepo,
    googleModel,
    serverToolbarModel,
    llmPrimaryProvider,
    serverToolbarProvider,
    draftFallbackKey,
    serverFallbackKey,
    allowedGoogleModels,
    allowedGrokModels,
    allowedOpenrouterModels,
    allowedMinimaxModels,
    githubTokenInput,
    telegramBotTokenInput,
    selectedChannel,
    telegramRecipientsInput,
    whatsappRecipientsInput,
    gmailDefaultTo,
    gmailDefaultCc,
    gmailDefaultBcc,
    gmailDefaultSubject,
    newsResearch,
    contentReview,
    llmFallback,
    imageGenProvider,
    imageGenModel,
  ]);

  const saveSettings = async () => {
    if (!session.isAdmin) return;

    setSavingConfig(true);
    try {
      await onSaveConfig({
        spreadsheetId: sheetIdInput.trim(),
        githubRepo: githubRepo.trim(),
        googleModel: llmPrimaryProvider === 'gemini' ? googleModel : session.config.googleModel,
        allowedGoogleModels,
        generationRules: session.config.generationRules.trim(),
        githubToken: githubTokenInput.trim() || undefined,
        defaultChannel: selectedChannel,
        telegramBotToken: telegramBotTokenInput.trim() || undefined,
        telegramRecipients: parseTelegramRecipientsInput(telegramRecipientsInput),
        whatsappRecipients: parseRecipientsInput(whatsappRecipientsInput),
        gmailDefaultTo: gmailDefaultTo.trim(),
        gmailDefaultCc: gmailDefaultCc.trim(),
        gmailDefaultBcc: gmailDefaultBcc.trim(),
        gmailDefaultSubject: gmailDefaultSubject.trim(),
        ...(FEATURE_NEWS_RESEARCH ? { newsResearch } : {}),
        ...(FEATURE_CONTENT_REVIEW ? { contentReview } : {}),
        ...(FEATURE_MULTI_PROVIDER_LLM
          ? {
              llm: {
                primary: { provider: llmPrimaryProvider, model: googleModel },
                fallback: llmFallback,
                allowedGrokModels,
                allowedOpenrouterModels,
                allowedMinimaxModels,
              },
            }
          : {}),
        imageGen: { provider: imageGenProvider, model: imageGenModel || undefined },
      });
      setGithubTokenInput('');
      setTelegramBotTokenInput('');
      if (sheetIdInput.trim()) {
        await loadData(true);
      }
    } catch (error) {
      handleFailure(error, 'Failed to save shared configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const fallbackLlm: LlmRef = { provider: llmPrimaryProvider, model: googleModel };
  const reviewGenerationLlm: LlmRef | undefined = FEATURE_MULTI_PROVIDER_LLM
    ? (session.config.llmSettings?.review_generation ?? fallbackLlm)
    : undefined;
  const generationWorkerLlm: LlmRef | undefined = FEATURE_MULTI_PROVIDER_LLM
    ? (session.config.llmSettings?.generation_worker ?? fallbackLlm)
    : undefined;

  return {
    sheetIdInput,
    setSheetIdInput,
    githubRepo,
    setGithubRepo,
    githubTokenInput,
    setGithubTokenInput,
    llmPrimaryProvider,
    setLlmPrimaryProvider,
    llmFallback,
    setLlmFallback,
    allowedGrokModels,
    toggleAllowedGrokModel,
    refreshGrokModels,
    grokAdminCatalog: grokCatalogModels.length > 0 ? grokCatalogModels : normalizeGrokOptions([], googleModel),
    openrouterAdminCatalog: openrouterCatalogModels.length > 0 ? openrouterCatalogModels : normalizeOpenrouterOptions([], googleModel),
    allowedOpenrouterModels,
    toggleAllowedOpenrouterModel,
    refreshOpenrouterModels,
    minimaxAdminCatalog: minimaxCatalogModels.length > 0 ? minimaxCatalogModels : normalizeMinimaxOptions([]),
    allowedMinimaxModels,
    toggleAllowedMinimaxModel,
    googleModel,
    setGoogleModel,
    allowedGoogleModels,
    toggleAllowedGoogleModel,
    adminModelCatalog: catalogModels,
    modelPickerLocked: availableModels.length <= 1,
    availableModels,
    savingConfig,
    telegramBotTokenInput,
    setTelegramBotTokenInput,
    gmailDefaultTo,
    setGmailDefaultTo,
    gmailDefaultCc,
    setGmailDefaultCc,
    gmailDefaultBcc,
    setGmailDefaultBcc,
    gmailDefaultSubject,
    setGmailDefaultSubject,
    newsResearch,
    setNewsResearch,
    contentReview,
    setContentReview,
    imageGenProvider,
    setImageGenProvider,
    imageGenModel,
    setImageGenModel,
    saveSettings,
    hasUnsavedSettingsChanges,
    reviewGenerationLlm,
    generationWorkerLlm,
    enrichmentSkills,
    handleToggleEnrichmentSkill,
  };

  async function handleToggleEnrichmentSkill(id: EnrichmentSkillId, enabled: boolean) {
    const current = enrichmentSkills;
    const existing = current.find((s) => s.id === id);
    const updated: EnrichmentSkillConfig[] = existing
      ? current.map((s) => (s.id === id ? { ...s, enabled } : s))
      : [...current, { id, enabled }];
    setEnrichmentSkills(updated);
    try {
      await onSaveConfig({ enrichmentSkills: updated });
    } catch (error) {
      setEnrichmentSkills(current);
      handleFailure(error, 'Failed to update enrichment skill.');
    }
  }
}
