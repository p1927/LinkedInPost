import { useState, useEffect, useCallback, useMemo } from 'react';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '../../../services/backendApi';
import { type BotConfig, type BotConfigUpdate, type GoogleModelOption, AVAILABLE_GOOGLE_MODELS, DEFAULT_GOOGLE_MODEL, loadAvailableGoogleModels, normalizeGoogleModelOptions } from '../../../services/configService';
import { type ChannelId } from '../../../integrations/channels';
import { parseTelegramRecipientsInput } from '../../../integrations/telegram';
import { parseRecipientsInput } from '../../../integrations/whatsapp';
import { useAlert } from '../../AlertProvider';

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
  const [googleModel, setGoogleModel] = useState(session.config.googleModel);
  const [allowedGoogleModels, setAllowedGoogleModels] = useState<string[]>(() => [...session.config.allowedGoogleModels]);
  const [generationRules, setGenerationRules] = useState(session.config.generationRules);
  const [catalogModels, setCatalogModels] = useState<GoogleModelOption[]>(AVAILABLE_GOOGLE_MODELS);
  const [savingConfig, setSavingConfig] = useState(false);
  const [telegramBotTokenInput, setTelegramBotTokenInput] = useState('');
  const [gmailDefaultTo, setGmailDefaultTo] = useState(session.config.gmailDefaultTo || '');
  const [gmailDefaultCc, setGmailDefaultCc] = useState(session.config.gmailDefaultCc || '');
  const [gmailDefaultBcc, setGmailDefaultBcc] = useState(session.config.gmailDefaultBcc || '');
  const [gmailDefaultSubject, setGmailDefaultSubject] = useState(session.config.gmailDefaultSubject || '');

  const handleFailure = useCallback((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    console.error(error);
    if (isAuthErrorMessage(message)) {
      onAuthExpired();
      return;
    }
    void showAlert({ title: 'Notice', description: message || fallbackMessage });
  }, [onAuthExpired, showAlert]);

  useEffect(() => {
    setGenerationRules(session.config.generationRules);
  }, [session.config.generationRules]);

  useEffect(() => {
    setAllowedGoogleModels([...session.config.allowedGoogleModels]);
  }, [session.config.allowedGoogleModels]);

  useEffect(() => {
    if (!session.isAdmin) {
      setGoogleModel(session.config.googleModel);
    }
  }, [session.isAdmin, session.config.googleModel]);

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

  const effectiveAllowedIds = session.isAdmin ? allowedGoogleModels : session.config.allowedGoogleModels;

  const availableModels = useMemo(() => {
    const allow = new Set(effectiveAllowedIds.length > 0 ? effectiveAllowedIds : [DEFAULT_GOOGLE_MODEL]);
    return catalogModels.filter((model) => allow.has(model.value));
  }, [catalogModels, effectiveAllowedIds]);

  useEffect(() => {
    if (availableModels.length === 0) return;
    if (availableModels.some((model) => model.value === googleModel)) return;
    const fallbackModel = availableModels.find((model) => model.value === session.config.googleModel)?.value
      || availableModels[0]?.value
      || DEFAULT_GOOGLE_MODEL;
    if (fallbackModel !== googleModel) {
      setGoogleModel(fallbackModel);
    }
  }, [availableModels, googleModel, session.config.googleModel]);

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

  const saveSettings = async () => {
    if (!session.isAdmin) return;

    setSavingConfig(true);
    try {
      await onSaveConfig({
        spreadsheetId: sheetIdInput.trim(),
        githubRepo: githubRepo.trim(),
        googleModel,
        allowedGoogleModels,
        generationRules: generationRules.trim(),
        githubToken: githubTokenInput.trim() || undefined,
        defaultChannel: selectedChannel,
        telegramBotToken: telegramBotTokenInput.trim() || undefined,
        telegramRecipients: parseTelegramRecipientsInput(telegramRecipientsInput),
        whatsappRecipients: parseRecipientsInput(whatsappRecipientsInput),
        gmailDefaultTo: gmailDefaultTo.trim(),
        gmailDefaultCc: gmailDefaultCc.trim(),
        gmailDefaultBcc: gmailDefaultBcc.trim(),
        gmailDefaultSubject: gmailDefaultSubject.trim(),
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

  return {
    sheetIdInput,
    setSheetIdInput,
    githubRepo,
    setGithubRepo,
    githubTokenInput,
    setGithubTokenInput,
    googleModel,
    setGoogleModel,
    allowedGoogleModels,
    toggleAllowedGoogleModel,
    adminModelCatalog: catalogModels,
    modelPickerLocked: availableModels.length <= 1,
    generationRules,
    setGenerationRules,
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
    saveSettings,
  };
}
