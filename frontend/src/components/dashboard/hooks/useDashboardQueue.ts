import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { type DraftPreviewSelection, type SheetRow } from '../../../services/sheets';
import type { NewsResearchSearchPayload, NewsResearchSearchResult, GenWorkerGenerateRequest } from '../../../services/backendApi';
import {
  type ContentReviewReport,
  type ContentPattern,
  type GenerationRequest,
  type QuickChangePreviewResult,
  type VariantsPreviewResponse,
} from '../../../services/backendApi';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '../../../services/backendApi';
import type { LlmRef } from '../../../services/configService';
import { type DeliverySummary } from '../types';
import { FEATURE_CONTENT_FLOW } from '../../../generated/features';

import { type ChannelId, getChannelOption, getChannelLabel } from '../../../integrations/channels';
import { effectiveChannel, effectiveLlmRef } from '@/lib/topicEffectivePrefs';
import { buildRowActionKey, findRowByTopicId, getNormalizedRowStatus, isSameTopicId } from '../utils';
import { encodeTopicRouteId, normalizeTopicRouteParam } from '../../../features/topic-navigation/utils/topicRoute';

import { useAlert } from '../../useAlert';
import { rowMatchesPendingScheduledPublish, usePendingScheduledPublish } from '@/features/scheduled-publish';
import {
  DRAFT_IMAGE_SEARCH_CHOICE_COUNT,
  parseRowImageUrls,
  serializeRowImageUrls,
} from '@/services/selectedImageUrls';

/** Max time to keep a row's Draft control busy after dispatch if the sheet never updates. */
const DRAFT_DISPATCH_PENDING_MAX_MS = 20 * 60 * 1000;

export function useDashboardQueue({
  idToken,
  api,
  session,
  onAuthExpired,
  workspaceLlm,
  selectedChannel,
  resolvedRecipientId,
  selectedRecipientLabel,
  telegramConfigured,
  whatsappConfigured,
  instagramConfigured,
  linkedinConfigured,
  gmailConfigured,
  setLastDeliverySummary,
  viewingTopicRouteId,
  onLeaveTopicRoute,
  onAfterApprove,
  /** Called after a draft GitHub dispatch succeeds and the queue refresh finishes — e.g. to hint “refresh again” in the header. */
  onDraftWorkflowStarted,
}: {
  idToken: string;
  api: BackendApi;
  session: AppSession;
  onAuthExpired: () => void;
  /** Workspace primary LLM; used with per-topic overrides for generation and GitHub dispatch. */
  workspaceLlm: LlmRef;
  selectedChannel: ChannelId;
  resolvedRecipientId: string;
  selectedRecipientLabel: string;
  telegramConfigured: boolean;
  whatsappConfigured: boolean;
  instagramConfigured: boolean;
  linkedinConfigured: boolean;
  gmailConfigured: boolean;
  setLastDeliverySummary: (summary: DeliverySummary) => void;
  /** When set, deleting this row navigates away from the topic route. */
  viewingTopicRouteId?: string | null;
  onLeaveTopicRoute?: () => void;
  onAfterApprove?: () => void;
  onDraftWorkflowStarted?: () => void;
}) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  /** Start true when a sheet is configured so first paint does not run “loaded” logic before loadData runs. */
  const [loading, setLoading] = useState(() => Boolean(session.config.spreadsheetId));
  /** True only while add-topic API + follow-up refresh run (not general queue loads). */
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  /** Topic IDs with a draft GitHub dispatch already sent; row stays busy until sheet leaves Pending or timeout. */
  const [draftDispatchPendingTopicIds, setDraftDispatchPendingTopicIds] = useState<string[]>([]);
  const draftPendingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { showAlert, showConfirm } = useAlert();

  useEffect(() => {
    return () => {
      draftPendingTimersRef.current.forEach(clearTimeout);
      draftPendingTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setDraftDispatchPendingTopicIds((prev) => {
      const next = prev.filter((id) => {
        const row = rows.find((r) => (r.topicId || '').trim() === id);
        const keep = Boolean(row && getNormalizedRowStatus(row.status) === 'pending');
        if (!keep) {
          const t = draftPendingTimersRef.current.get(id);
          if (t) clearTimeout(t);
          draftPendingTimersRef.current.delete(id);
        }
        return keep;
      });
      return next.length === prev.length && next.every((x, i) => x === prev[i]) ? prev : next;
    });
  }, [rows]);

  const handleFailure = useCallback((error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    console.error(error);
    if (isAuthErrorMessage(message)) {
      onAuthExpired();
      return;
    }
    void showAlert({ title: 'Notice', description: message || fallbackMessage });
  }, [onAuthExpired, showAlert]);

  const {
    pendingScheduledPublish,
    scheduledPublishCancelBusy,
    applyQueuedPublishResult,
    cancelPendingScheduledPublish,
    clearPendingIfMatchesRow,
  } = usePendingScheduledPublish({
    idToken,
    api,
    onError: useCallback(
      (message: string) => {
        void showAlert({ title: 'Notice', description: message });
      },
      [showAlert],
    ),
  });

  const loadData = useCallback(async (quiet = false) => {
    if (!session.config.spreadsheetId) return;

    setLoading(true);
    try {
      const data = await api.getRows(idToken);
      setRows([...data].reverse());
    } catch (error) {
      if (!quiet) {
        handleFailure(error, 'Failed to load data. Verify the backend deployment and spreadsheet configuration.');
      } else if (error instanceof Error && isAuthErrorMessage(error.message)) {
        onAuthExpired();
      }
    } finally {
      setLoading(false);
    }
  }, [api, idToken, session.config.spreadsheetId, handleFailure, onAuthExpired]);

  useEffect(() => {
    if (!session.config.spreadsheetId) {
      setRows([]);
      setLoading(false);
      return;
    }
    // Use quiet=false so API/Sheets failures surface instead of leaving an empty queue with no explanation.
    void loadData(false);
  }, [idToken, session.config.spreadsheetId, loadData]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !session.config.spreadsheetId) return;

    setAddingTopic(true);
    try {
      await api.addTopic(idToken, newTopic.trim());
      setNewTopic('');
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to add topic.');
    } finally {
      setLoading(false);
      setAddingTopic(false);
    }
  };

  const handleApproveVariant = async (
    row: SheetRow,
    selectedText: string,
    selectedImageId: string,
    postTime: string,
    emailTo?: string,
    emailCc?: string,
    emailBcc?: string,
    emailSubject?: string,
    selectedImageUrlsJson?: string,
  ) => {
    try {
      const normalizedStatus = getNormalizedRowStatus(row.status);
      const urlsJson = selectedImageUrlsJson ?? '';
      if (normalizedStatus === 'published') {
        await api.createDraftFromPublished(
          idToken,
          row,
          selectedText,
          selectedImageId,
          postTime,
          emailTo || '',
          emailCc || '',
          emailBcc || '',
          emailSubject || '',
          urlsJson,
        );
        await loadData(true);
        void showAlert({
          title: 'Draft saved',
          description: `A new drafted copy of "${row.topic}" was added. The original published post is unchanged — open it from the queue to edit further or publish.`,
        });
        onAfterApprove?.();
        return;
      }

      await api.updateRowStatus(
        idToken,
        row,
        'Approved',
        selectedText,
        selectedImageId,
        postTime,
        emailTo,
        emailCc,
        emailBcc,
        emailSubject,
        urlsJson,
      );
      await loadData(true);
      onAfterApprove?.();
    } catch (error) {
      handleFailure(error, 'Failed to approve variant.');
    }
  };

  const handleSaveEmailFields = async (row: SheetRow, emailTo: string, emailCc: string, emailBcc: string, emailSubject: string) => {
    try {
      await api.saveEmailFields(idToken, row, emailTo, emailCc, emailBcc, emailSubject);
    } catch (error) {
      handleFailure(error, 'Failed to save email settings.');
      throw error;
    }
  };

  const dispatchGithubAction = async (
    rowForModel: SheetRow,
    action: 'draft' | 'publish' | 'refine',
    eventType: 'trigger-draft' | 'trigger-publish',
    payload: Record<string, unknown>,
    successMessage: string,
    loadingKey: string = action,
  ): Promise<boolean> => {
    if (!session.config.githubRepo || !session.config.hasGitHubToken) {
      if (session.isAdmin) {
        void showAlert({ title: 'Notice', description: 'Complete the GitHub settings in the workspace drawer first.' });
      } else {
        void showAlert({ title: 'Notice', description: 'A workspace admin still needs to configure GitHub dispatch settings.' });
      }
      return false;
    }

    setActionLoading(loadingKey);
    try {
      await api.triggerGithubAction(idToken, action, eventType, {
        google_model: effectiveLlmRef(rowForModel, workspaceLlm).model,
        ...payload,
      });
      void showAlert({ title: 'Success', description: successMessage });
      return true;
    } catch (error) {
      setActionLoading(null);
      handleFailure(error, 'Failed to trigger the GitHub Action.');
      throw error;
    }
  };

  const triggerRowGithubAction = async (row: SheetRow, action: 'draft' | 'publish') => {
    const actionKey = buildRowActionKey(action, row);
    try {
      const ok = await dispatchGithubAction(
        row,
        action,
        action === 'draft' ? 'trigger-draft' : 'trigger-publish',
        {
          target_topic: row.topic,
          target_date: row.date,
        },
        action === 'draft'
          ? `Requested post generation for "${row.topic}" using ${effectiveLlmRef(row, workspaceLlm).model}. GitHub is generating the draft — the sheet updates when the workflow finishes. Refresh the queue in a few seconds if status is still Pending.`
          : `Requested publishing for "${row.topic}". The queue will refresh from the sheet shortly.`,
        actionKey,
      );
      if (ok) {
        if (action === 'draft') {
          const tid = (row.topicId || '').trim();
          if (tid) {
            setDraftDispatchPendingTopicIds((prev) => (prev.includes(tid) ? prev : [...prev, tid]));
            const timers = draftPendingTimersRef.current;
            const old = timers.get(tid);
            if (old) clearTimeout(old);
            timers.set(
              tid,
              setTimeout(() => {
                timers.delete(tid);
                setDraftDispatchPendingTopicIds((p) => p.filter((x) => x !== tid));
              }, DRAFT_DISPATCH_PENDING_MAX_MS),
            );
          }
          onDraftWorkflowStarted?.();
        }
        await loadData(true);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const draftWithGenerationWorker = async (row: SheetRow, request: GenWorkerGenerateRequest): Promise<void> => {
    try {
      const result = await api.callGenerationWorker(idToken, session.config.spreadsheetId, request);
      const variantTexts = result.variants.map((v) => v.text);
      const updated = await api.saveDraftVariants(idToken, row, variantTexts);
      setRows((prev) => prev.map((r) => (isSameTopicId(r, updated) ? updated : r)));
      void showAlert({
        title: 'Draft generated',
        description: `Generated ${variantTexts.length} variant${variantTexts.length !== 1 ? 's' : ''} for "${row.topic}". Open the topic to review and select one.`,
      });
    } catch (error) {
      handleFailure(error, 'Failed to generate draft via generation worker.');
      throw error;
    }
  };

  const handleGenerateQuickChange = async (request: GenerationRequest): Promise<QuickChangePreviewResult> => {
    try {
      return await api.generateQuickChange(idToken, request);
    } catch (error) {
      handleFailure(error, 'Failed to generate the quick-change preview.');
      throw error;
    }
  };

  const handleGenerateVariantsPreview = async (request: GenerationRequest): Promise<VariantsPreviewResponse> => {
    try {
      return await api.generateVariantsPreview(idToken, request);
    } catch (error) {
      handleFailure(error, 'Failed to generate preview variants.');
      throw error;
    }
  };

  const handleRunContentReview = async (
    row: SheetRow,
    editorText: string,
    selectedImageUrls: string[],
    deliveryChannel: ChannelId,
  ): Promise<ContentReviewReport> => {
    try {
      return await api.runContentReview(idToken, {
        row,
        editorText,
        selectedImageUrls,
        deliveryChannel,
      });
    } catch (error) {
      handleFailure(error, 'Content review failed. Check that Gemini is configured and try again.');
      throw error;
    }
  };

  const handleSearchNewsResearch = async (row: SheetRow, payload: NewsResearchSearchPayload): Promise<NewsResearchSearchResult> => {
    try {
      return await api.searchNewsResearch(idToken, {
        ...payload,
        topicId: row.topicId,
        topic: row.topic,
        date: row.date,
      });
    } catch (error) {
      handleFailure(error, 'News search failed.');
      throw error;
    }
  };

  const handleListNewsResearchHistory = async (row: SheetRow) => {
    try {
      return await api.listNewsResearchHistory(idToken, row.topicId);
    } catch (error) {
      handleFailure(error, 'Failed to load news search history.');
      throw error;
    }
  };

  const handleGetNewsResearchSnapshot = async (_row: SheetRow, snapshotId: string) => {
    try {
      return await api.getNewsResearchSnapshot(idToken, snapshotId);
    } catch (error) {
      handleFailure(error, 'Failed to load news snapshot.');
      throw error;
    }
  };

  const handleSaveDraftVariants = async (
    row: SheetRow,
    variants: string[],
    previewSelection?: DraftPreviewSelection,
  ): Promise<SheetRow> => {
    try {
      const updatedRow = await api.saveDraftVariants(idToken, row, variants, previewSelection);
      setRows((current: SheetRow[]) => current.map((entry) => (isSameTopicId(entry, updatedRow) ? updatedRow : entry)));
      return updatedRow;
    } catch (error) {
      handleFailure(error, 'Failed to save preview variants to Sheets.');
      throw error;
    }
  };

  const handleSaveTopicGenerationRules = async (row: SheetRow, topicRules: string): Promise<SheetRow> => {
    try {
      const updatedRow = await api.saveTopicGenerationRules(idToken, row, topicRules);
      setRows((current: SheetRow[]) => current.map((entry) => (isSameTopicId(entry, updatedRow) ? updatedRow : entry)));
      return updatedRow;
    } catch (error) {
      handleFailure(error, 'Failed to save topic rules to the sheet.');
      throw error;
    }
  };

  const loadPostTemplates = useCallback(async () => {
    return api.listPostTemplates(idToken);
  }, [api, idToken]);

  // E8: Load patterns once so queue items can display pattern names.
  const [postTemplates, setPostTemplates] = useState<ContentPattern[]>([]);
  useEffect(() => {
    if (!FEATURE_CONTENT_FLOW || !session.config.spreadsheetId) return;
    let cancelled = false;
    void api.listPostTemplates(idToken)
      .then((list) => { if (!cancelled) setPostTemplates(list as ContentPattern[]); })
      .catch(() => { /* non-critical */ });
    return () => { cancelled = true; };
  }, [api, idToken, session.config.spreadsheetId]);

  /** Returns the pattern name for a generationTemplateId, or null when not found. */
  const getPatternName = useCallback(
    (templateId: string | undefined): string | null => {
      if (!templateId?.trim() || !FEATURE_CONTENT_FLOW) return null;
      return postTemplates.find((p) => p.id === templateId)?.name ?? null;
    },
    [postTemplates],
  );

  const handleSaveGenerationTemplateId = async (row: SheetRow, generationTemplateId: string): Promise<SheetRow> => {
    try {
      const updatedRow = await api.saveGenerationTemplateId(idToken, row, generationTemplateId);
      setRows((current: SheetRow[]) => current.map((entry) => (isSameTopicId(entry, updatedRow) ? updatedRow : entry)));
      return updatedRow;
    } catch (error) {
      handleFailure(error, 'Failed to save generation template on the draft row.');
      throw error;
    }
  };

  const handleSaveTopicDeliveryPreferences = async (
    row: SheetRow,
    prefs: { topicDeliveryChannel?: string; topicGenerationModel?: string },
  ): Promise<SheetRow> => {
    const updatedRow = await api.saveTopicDeliveryPreferences(idToken, row, prefs);
    setRows((current: SheetRow[]) => current.map((entry) => (isSameTopicId(entry, updatedRow) ? updatedRow : entry)));
    return updatedRow;
  };

  const handleFetchReviewImages = async (row: SheetRow, searchQuery?: string) => {
    const result = await api.fetchDraftImages(idToken, row.topic, DRAFT_IMAGE_SEARCH_CHOICE_COUNT, searchQuery);
    return result.imageUrls;
  };

  const handlePromoteReviewImage = async (row: SheetRow, sourceUrl: string) => {
    const result = await api.promoteDraftImageUrl(idToken, sourceUrl, row.topicId);
    return result.imageUrl;
  };

  const handleUploadReviewImage = async (row: SheetRow, file: File) => {
    const result = await api.uploadDraftImage(idToken, file, row.topicId);
    return result.imageUrl;
  };

  const handleDownloadReviewImage = async (imageUrl: string, fileName: string) => {
    const blob = await api.downloadDraftImage(idToken, imageUrl, fileName);
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const describePublishPrerequisiteFailure = useMemo(
    () =>
      (message: string, rowForImages: SheetRow, emailToForGmail: string, emptyTextHint: 'queue' | 'editor'): string | null => {
        const ch = effectiveChannel(rowForImages, selectedChannel);
        const chOpt = getChannelOption(ch);
        if (ch === 'telegram' && !telegramConfigured) {
          return session.isAdmin
            ? 'Complete the Telegram delivery settings in the workspace drawer first.'
            : 'A workspace admin still needs to configure Telegram delivery settings.';
        }
        if (ch === 'whatsapp' && !whatsappConfigured) {
          return session.isAdmin
            ? 'Complete the WhatsApp settings in the workspace drawer first.'
            : 'A workspace admin still needs to configure WhatsApp delivery settings.';
        }
        if (ch === 'instagram' && !instagramConfigured) {
          return session.isAdmin
            ? 'Complete the Instagram publishing settings in the workspace drawer first.'
            : 'A workspace admin still needs to configure Instagram publishing settings.';
        }
        if (ch === 'linkedin' && !linkedinConfigured) {
          return session.isAdmin
            ? 'Complete the LinkedIn publishing settings in the workspace drawer first.'
            : 'A workspace admin still needs to configure LinkedIn publishing settings.';
        }
        if (ch === 'gmail' && !gmailConfigured) {
          return session.isAdmin
            ? 'Connect Gmail in the workspace settings drawer first.'
            : 'A workspace admin still needs to connect Gmail for this workspace.';
        }
        if (chOpt.requiresRecipient && !resolvedRecipientId) {
          return ch === 'telegram'
            ? 'Select a saved Telegram chat or enter a valid chat ID.'
            : 'Select a saved WhatsApp recipient or enter a valid phone number in international format.';
        }
        if (!message.trim()) {
          return emptyTextHint === 'queue'
            ? 'This row does not have approved text yet. Review and approve a draft first.'
            : 'Post text is empty. Write or select content before publishing.';
        }
        if (ch === 'instagram' && parseRowImageUrls(rowForImages).length === 0) {
          return 'Instagram requires a selected image. Choose an image in the Media panel before publishing.';
        }
        if (ch === 'gmail' && !emailToForGmail.trim()) {
          return emptyTextHint === 'queue'
            ? 'Gmail needs at least one To address on this row. Open the topic in the editor, use the Email tab, fill To (and optional Cc, Bcc, Subject), then approve again so the sheet is updated — or enter addresses before the first approve.'
            : 'Gmail needs at least one To address. Open the Email tab, fill To (and optional Cc, Bcc, Subject), then publish again.';
        }
        return null;
      },
    [
      selectedChannel,
      telegramConfigured,
      whatsappConfigured,
      instagramConfigured,
      linkedinConfigured,
      gmailConfigured,
      session.isAdmin,
      resolvedRecipientId,
    ],
  );

  const publishRowToSelectedChannel = async (row: SheetRow) => {
    if (actionLoading !== null) return;

    const rowChannel = effectiveChannel(row, selectedChannel);
    const rowChannelOption = getChannelOption(rowChannel);

    if (rowMatchesPendingScheduledPublish(row, pendingScheduledPublish, rowChannel)) {
      void showAlert({
        title: 'Notice',
        description:
          'This topic is already queued for that scheduled time on the selected channel. Cancel it in the delivery panel first, or open Edit and change the schedule before publishing again.',
      });
      return;
    }

    const message = (row.selectedText || row.variant1 || '').trim();
    const fail = describePublishPrerequisiteFailure(message, row, (row.emailTo || '').trim(), 'queue');
    if (fail) {
      void showAlert({ title: 'Notice', description: fail });
      return;
    }

    const actionKey = buildRowActionKey('publish', row);
    setActionLoading(actionKey);
    try {
      const imageUrls = parseRowImageUrls(row);
      const { selectedImageId: primaryId } = serializeRowImageUrls(imageUrls);
      const result = await api.publishContent(idToken, {
        row,
        channel: rowChannel,
        recipientId: rowChannelOption.requiresRecipient ? resolvedRecipientId : undefined,
        message,
        imageUrl: primaryId || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      if (result.deliveryMode === 'sent') {
        clearPendingIfMatchesRow(row);
        setLastDeliverySummary({
          topic: row.topic,
          channel: rowChannel,
          mediaMode: result.mediaMode,
          recipientLabel: rowChannelOption.requiresRecipient
            ? selectedRecipientLabel || resolvedRecipientId
            : rowChannel === 'instagram'
              ? session.config.instagramUsername || 'connected account'
              : rowChannel === 'gmail'
                ? (result.recipientId || row.emailTo || '').trim() || session.config.gmailEmailAddress || 'recipient'
                : 'LinkedIn audience',
        });
        await loadData(true);
        void showAlert({ title: 'Success', description: rowChannelOption.requiresRecipient ? `Sent "${row.topic}" to ${selectedRecipientLabel || resolvedRecipientId} on ${getChannelLabel(rowChannel)} as a ${result.mediaMode} post.` : `Published "${row.topic}" to ${getChannelLabel(rowChannel)} as a ${result.mediaMode} post.` });
      } else {
        applyQueuedPublishResult(result, row);
        void showAlert({
          title: 'Scheduled',
          description: `Publishing for "${row.topic}" is queued for ${getChannelLabel(rowChannel)} at ${result.scheduledTime || row.postTime}. You can cancel from the delivery panel until then.`,
        });
      }
    } catch (error) {
      handleFailure(error, `Failed to send the approved message to ${getChannelLabel(rowChannel)}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const publishFromReviewEditor = async (
    row: SheetRow,
    selectedText: string,
    selectedImageId: string,
    postTime: string,
    emailTo?: string,
    emailCc?: string,
    emailBcc?: string,
    emailSubject?: string,
    selectedImageUrlsJson?: string,
  ) => {
    if (actionLoading !== null) return;

    if (
      rowMatchesPendingScheduledPublish(
        { topicId: row.topicId, postTime },
        pendingScheduledPublish,
        effectiveChannel(row, selectedChannel),
      )
    ) {
      void showAlert({
        title: 'Notice',
        description:
          'This topic is already queued for that scheduled time on the selected channel. Cancel it in the delivery panel first, or change the schedule above before publishing again.',
      });
      return;
    }

    const message = selectedText.trim();
    const urlsJson = selectedImageUrlsJson ?? '';
    const emailToResolved = (emailTo ?? row.emailTo ?? '').trim();

    const rowPreview: SheetRow = { ...row, selectedImageId, selectedImageUrlsJson: urlsJson };
    const fail = describePublishPrerequisiteFailure(message, rowPreview, emailToResolved, 'editor');
    if (fail) {
      void showAlert({ title: 'Notice', description: fail });
      return;
    }

    const actionKey = buildRowActionKey('publish', row);
    setActionLoading(actionKey);
    try {
      let rowToPublish: SheetRow = row;

      if (getNormalizedRowStatus(row.status) === 'published') {
        const created = await api.createDraftFromPublished(
          idToken,
          row,
          message,
          selectedImageId,
          postTime,
          emailTo ?? '',
          emailCc ?? '',
          emailBcc ?? '',
          emailSubject ?? '',
          urlsJson,
        );
        const data = await api.getRows(idToken);
        const nextRows = [...data].reverse();
        setRows(nextRows);
        const found = findRowByTopicId(nextRows, created.topicId);
        if (!found) {
          void showAlert({
            title: 'Notice',
            description:
              'A draft copy was saved, but it could not be selected automatically to publish. Open the new draft from the queue and use Publish there.',
          });
          return;
        }
        rowToPublish = found;
      }

      await api.updateRowStatus(
        idToken,
        rowToPublish,
        'Approved',
        selectedText,
        selectedImageId,
        postTime,
        emailTo ?? '',
        emailCc ?? '',
        emailBcc ?? '',
        emailSubject ?? '',
        urlsJson,
      );

      const mergedRow: SheetRow = {
        ...rowToPublish,
        status: 'Approved',
        selectedText: message,
        selectedImageId,
        selectedImageUrlsJson: urlsJson,
        postTime,
        emailTo: emailTo ?? rowToPublish.emailTo,
        emailCc: emailCc ?? rowToPublish.emailCc,
        emailBcc: emailBcc ?? rowToPublish.emailBcc,
        emailSubject: emailSubject ?? rowToPublish.emailSubject,
      };

      const imageUrls = parseRowImageUrls(mergedRow);
      const { selectedImageId: primaryId } = serializeRowImageUrls(imageUrls);

      const mergedChannel = effectiveChannel(mergedRow, selectedChannel);
      const mergedChannelOption = getChannelOption(mergedChannel);

      const result = await api.publishContent(idToken, {
        row: mergedRow,
        channel: mergedChannel,
        recipientId: mergedChannelOption.requiresRecipient ? resolvedRecipientId : undefined,
        message,
        imageUrl: primaryId || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      if (result.deliveryMode === 'sent') {
        clearPendingIfMatchesRow(mergedRow);
        setLastDeliverySummary({
          topic: mergedRow.topic,
          channel: mergedChannel,
          mediaMode: result.mediaMode,
          recipientLabel: mergedChannelOption.requiresRecipient
            ? selectedRecipientLabel || resolvedRecipientId
            : mergedChannel === 'instagram'
              ? session.config.instagramUsername || 'connected account'
              : mergedChannel === 'gmail'
                ? (result.recipientId || mergedRow.emailTo || '').trim() || session.config.gmailEmailAddress || 'recipient'
                : 'LinkedIn audience',
        });
        await loadData(true);
        void showAlert({
          title: 'Success',
          description: mergedChannelOption.requiresRecipient
            ? `Sent "${mergedRow.topic}" to ${selectedRecipientLabel || resolvedRecipientId} on ${getChannelLabel(mergedChannel)} as a ${result.mediaMode} post.`
            : `Published "${mergedRow.topic}" to ${getChannelLabel(mergedChannel)} as a ${result.mediaMode} post.`,
        });
      } else {
        applyQueuedPublishResult(result, mergedRow);
        void showAlert({
          title: 'Scheduled',
          description: `Publishing for "${mergedRow.topic}" is queued for ${getChannelLabel(mergedChannel)} at ${result.scheduledTime || mergedRow.postTime}. You can cancel from the editor or delivery panel until then.`,
        });
      }
      onAfterApprove?.();
    } catch (error) {
      handleFailure(error, `Failed to send the approved message to ${getChannelLabel(effectiveChannel(row, selectedChannel))}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const republishRowToSelectedChannel = async (row: SheetRow) => {
    const ch = effectiveChannel(row, selectedChannel);
    if (!await showConfirm({ title: 'Confirm Publish', description: `Publish "${row.topic}" again to ${getChannelLabel(ch)}? This will send the currently approved text and selected media one more time.` })) return;
    await publishRowToSelectedChannel(row);
  };

  const handleDeleteTopic = async (row: SheetRow) => {
    if (!await showConfirm({ title: 'Confirm Delete', description: `Delete "${row.topic}" from the content calendar?` })) return;
    setDeletingRowIndex(row.rowIndex);
    try {
      if (
        pendingScheduledPublish
        && rowMatchesPendingScheduledPublish(row, pendingScheduledPublish, effectiveChannel(row, selectedChannel))
      ) {
        try {
          await api.cancelScheduledPublish(idToken, {
            topicId: pendingScheduledPublish.topicId,
            channel: pendingScheduledPublish.channel,
            scheduledTime: pendingScheduledPublish.scheduledTime,
          });
        } catch (cancelError) {
          console.warn(cancelError);
        }
      }
      await api.deleteRow(idToken, row);
      clearPendingIfMatchesRow(row);
      const viewingId = viewingTopicRouteId ? normalizeTopicRouteParam(viewingTopicRouteId) : '';
      if (viewingTopicRouteId && encodeTopicRouteId(row) === viewingId) {
        onLeaveTopicRoute?.();
      }
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to delete topic entry. Please try again.');
    } finally {
      setDeletingRowIndex(null);
    }
  };

  return {
    rows,
    loading,
    addingTopic,
    newTopic,
    setNewTopic,
    actionLoading,
    draftDispatchPendingTopicIds,
    deletingRowIndex,
    loadData,
    handleAddTopic,
    handleApproveVariant,
    handleSaveEmailFields,
    triggerRowGithubAction,
    draftWithGenerationWorker,
    handleGenerateQuickChange,
    handleGenerateVariantsPreview,
    handleRunContentReview,
    handleSaveDraftVariants,
    handleSaveTopicGenerationRules,
    loadPostTemplates,
    handleSaveGenerationTemplateId,
    handleSaveTopicDeliveryPreferences,
    handleFetchReviewImages,
    handlePromoteReviewImage,
    handleUploadReviewImage,
    handleDownloadReviewImage,
    publishRowToSelectedChannel,
    publishFromReviewEditor,
    republishRowToSelectedChannel,
    handleDeleteTopic,
    pendingScheduledPublish,
    scheduledPublishCancelBusy,
    cancelPendingScheduledPublish,
    handleSearchNewsResearch,
    handleListNewsResearchHistory,
    handleGetNewsResearchSnapshot,
    // E8: pattern metadata for queue display
    postTemplates,
    getPatternName,
  };
}
