import { useState, useCallback, useEffect, useMemo } from 'react';
import { type SheetRow } from '../../../services/sheets';
import { type GenerationRequest, type QuickChangePreviewResult, type VariantsPreviewResponse } from '../../../services/backendApi';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '../../../services/backendApi';
import { type DeliverySummary } from '../types';

import { type ChannelId, getChannelOption, getChannelLabel } from '../../../integrations/channels';
import { buildRowActionKey, findDraftRowAfterCreateFromPublished, getNormalizedRowStatus, isSameTopicDate } from '../utils';
import { encodeTopicRouteId, normalizeTopicRouteParam } from '../../../features/topic-navigation/utils/topicRoute';

import { useAlert } from '../../AlertProvider';
import { rowMatchesPendingScheduledPublish, usePendingScheduledPublish } from '@/features/scheduled-publish';
import {
  DRAFT_IMAGE_SEARCH_CHOICE_COUNT,
  parseRowImageUrls,
  serializeRowImageUrls,
} from '@/services/selectedImageUrls';

export function useDashboardQueue({
  idToken,
  api,
  session,
  onAuthExpired,
  googleModel,
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
}: {
  idToken: string;
  api: BackendApi;
  session: AppSession;
  onAuthExpired: () => void;
  googleModel: string;
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
}) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  /** Start true when a sheet is configured so first paint does not run “loaded” logic before loadData runs. */
  const [loading, setLoading] = useState(() => Boolean(session.config.spreadsheetId));
  /** True only while add-topic API + follow-up refresh run (not general queue loads). */
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [selectedApprovedRowPreview, setSelectedApprovedRowPreview] = useState<SheetRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);

  const { showAlert, showConfirm } = useAlert();

  const selectedChannelOption = getChannelOption(selectedChannel);

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
      setRows(data.reverse());
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
    void loadData(true);
  }, [idToken, session.config.spreadsheetId, loadData]);

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !session.config.spreadsheetId) return;

    setAddingTopic(true);
    setLoading(true);
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
    action: 'draft' | 'publish' | 'refine',
    eventType: 'trigger-draft' | 'trigger-publish',
    payload: Record<string, unknown>,
    successMessage: string,
    loadingKey: string = action,
  ) => {
    if (!session.config.githubRepo || !session.config.hasGitHubToken) {
      if (session.isAdmin) {
        void showAlert({ title: 'Notice', description: 'Complete the GitHub settings in the workspace drawer first.' });
      } else {
        void showAlert({ title: 'Notice', description: 'A workspace admin still needs to configure GitHub dispatch settings.' });
      }
      return;
    }

    setActionLoading(loadingKey);
    try {
      await api.triggerGithubAction(idToken, action, eventType, {
        google_model: googleModel,
        ...payload,
      });
      void showAlert({ title: 'Success', description: successMessage });
    } catch (error) {
      handleFailure(error, 'Failed to trigger the GitHub Action.');
      throw error;
    } finally {
      setActionLoading(null);
    }
  };

  const triggerRowGithubAction = async (row: SheetRow, action: 'draft' | 'publish') => {
    const actionKey = buildRowActionKey(action, row);
    await dispatchGithubAction(
      action,
      action === 'draft' ? 'trigger-draft' : 'trigger-publish',
      {
        target_topic: row.topic,
        target_date: row.date,
      },
      action === 'draft'
        ? `Requested post generation for "${row.topic}" using ${googleModel}. Refresh the dashboard in a minute to review the new draft.`
        : `Requested publishing for "${row.topic}". Refresh the dashboard in a minute to confirm the updated status.`,
      actionKey,
    );
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

  const handleSaveDraftVariants = async (row: SheetRow, variants: string[]): Promise<SheetRow> => {
    try {
      const updatedRow = await api.saveDraftVariants(idToken, row, variants);
      setRows((current: SheetRow[]) => current.map((entry) => (isSameTopicDate(entry, updatedRow) ? updatedRow : entry)));
      return updatedRow;
    } catch (error) {
      handleFailure(error, 'Failed to save preview variants to Sheets.');
      throw error;
    }
  };

  const handleSaveTopicGenerationRules = async (row: SheetRow, topicRules: string): Promise<SheetRow> => {
    try {
      const updatedRow = await api.saveTopicGenerationRules(idToken, row, topicRules);
      setRows((current: SheetRow[]) => current.map((entry) => (isSameTopicDate(entry, updatedRow) ? updatedRow : entry)));
      return updatedRow;
    } catch (error) {
      handleFailure(error, 'Failed to save topic rules to the sheet.');
      throw error;
    }
  };

  const handleFetchReviewImages = async (row: SheetRow, searchQuery?: string) => {
    const result = await api.fetchDraftImages(idToken, row.topic, DRAFT_IMAGE_SEARCH_CHOICE_COUNT, searchQuery);
    return result.imageUrls;
  };

  const handlePromoteReviewImage = async (row: SheetRow, sourceUrl: string) => {
    const result = await api.promoteDraftImageUrl(idToken, row.topic, sourceUrl);
    return result.imageUrl;
  };

  const handleUploadReviewImage = async (row: SheetRow, file: File) => {
    const result = await api.uploadDraftImage(idToken, row.topic, file);
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
        if (selectedChannel === 'telegram' && !telegramConfigured) {
          return session.isAdmin
            ? 'Complete the Telegram delivery settings in the workspace drawer first.'
            : 'A workspace admin still needs to configure Telegram delivery settings.';
        }
        if (selectedChannel === 'whatsapp' && !whatsappConfigured) {
          return session.isAdmin
            ? 'Complete the WhatsApp settings in the workspace drawer first.'
            : 'A workspace admin still needs to configure WhatsApp delivery settings.';
        }
        if (selectedChannel === 'instagram' && !instagramConfigured) {
          return session.isAdmin
            ? 'Complete the Instagram publishing settings in the workspace drawer first.'
            : 'A workspace admin still needs to configure Instagram publishing settings.';
        }
        if (selectedChannel === 'linkedin' && !linkedinConfigured) {
          return session.isAdmin
            ? 'Complete the LinkedIn publishing settings in the workspace drawer first.'
            : 'A workspace admin still needs to configure LinkedIn publishing settings.';
        }
        if (selectedChannel === 'gmail' && !gmailConfigured) {
          return session.isAdmin
            ? 'Connect Gmail in the workspace settings drawer first.'
            : 'A workspace admin still needs to connect Gmail for this workspace.';
        }
        if (selectedChannelOption.requiresRecipient && !resolvedRecipientId) {
          return selectedChannel === 'telegram'
            ? 'Select a saved Telegram chat or enter a valid chat ID.'
            : 'Select a saved WhatsApp recipient or enter a valid phone number in international format.';
        }
        if (!message.trim()) {
          return emptyTextHint === 'queue'
            ? 'This row does not have approved text yet. Review and approve a draft first.'
            : 'Post text is empty. Write or select content before publishing.';
        }
        if (selectedChannel === 'instagram' && parseRowImageUrls(rowForImages).length === 0) {
          return 'Instagram requires a selected image. Choose an image in the Media panel before publishing.';
        }
        if (selectedChannel === 'gmail' && !emailToForGmail.trim()) {
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
      selectedChannelOption.requiresRecipient,
      resolvedRecipientId,
    ],
  );

  const publishRowToSelectedChannel = async (row: SheetRow) => {
    if (actionLoading !== null) return;

    if (rowMatchesPendingScheduledPublish(row, pendingScheduledPublish, selectedChannel)) {
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
        channel: selectedChannel,
        recipientId: selectedChannelOption.requiresRecipient ? resolvedRecipientId : undefined,
        message,
        imageUrl: primaryId || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      if (result.deliveryMode === 'sent') {
        clearPendingIfMatchesRow(row);
        setLastDeliverySummary({
          topic: row.topic,
          channel: selectedChannel,
          mediaMode: result.mediaMode,
          recipientLabel: selectedChannelOption.requiresRecipient
            ? selectedRecipientLabel || resolvedRecipientId
            : selectedChannel === 'instagram'
              ? session.config.instagramUsername || 'connected account'
              : selectedChannel === 'gmail'
                ? (result.recipientId || row.emailTo || '').trim() || session.config.gmailEmailAddress || 'recipient'
                : 'LinkedIn audience',
        });
        await loadData(true);
        void showAlert({ title: 'Success', description: selectedChannelOption.requiresRecipient ? `Sent "${row.topic}" to ${selectedRecipientLabel || resolvedRecipientId} on ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.` : `Published "${row.topic}" to ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.` });
      } else {
        applyQueuedPublishResult(result, row);
        void showAlert({
          title: 'Scheduled',
          description: `Publishing for "${row.topic}" is queued for ${getChannelLabel(selectedChannel)} at ${result.scheduledTime || row.postTime}. You can cancel from the delivery panel until then.`,
        });
      }
    } catch (error) {
      handleFailure(error, `Failed to send the approved message to ${getChannelLabel(selectedChannel)}.`);
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
        { topic: row.topic, date: row.date, postTime },
        pendingScheduledPublish,
        selectedChannel,
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
        await api.createDraftFromPublished(
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
        const nextRows = data.reverse();
        setRows(nextRows);
        const found = findDraftRowAfterCreateFromPublished(nextRows, row, message);
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

      const result = await api.publishContent(idToken, {
        row: mergedRow,
        channel: selectedChannel,
        recipientId: selectedChannelOption.requiresRecipient ? resolvedRecipientId : undefined,
        message,
        imageUrl: primaryId || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });

      if (result.deliveryMode === 'sent') {
        clearPendingIfMatchesRow(mergedRow);
        setLastDeliverySummary({
          topic: mergedRow.topic,
          channel: selectedChannel,
          mediaMode: result.mediaMode,
          recipientLabel: selectedChannelOption.requiresRecipient
            ? selectedRecipientLabel || resolvedRecipientId
            : selectedChannel === 'instagram'
              ? session.config.instagramUsername || 'connected account'
              : selectedChannel === 'gmail'
                ? (result.recipientId || mergedRow.emailTo || '').trim() || session.config.gmailEmailAddress || 'recipient'
                : 'LinkedIn audience',
        });
        await loadData(true);
        void showAlert({
          title: 'Success',
          description: selectedChannelOption.requiresRecipient
            ? `Sent "${mergedRow.topic}" to ${selectedRecipientLabel || resolvedRecipientId} on ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.`
            : `Published "${mergedRow.topic}" to ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.`,
        });
      } else {
        applyQueuedPublishResult(result, mergedRow);
        void showAlert({
          title: 'Scheduled',
          description: `Publishing for "${mergedRow.topic}" is queued for ${getChannelLabel(selectedChannel)} at ${result.scheduledTime || mergedRow.postTime}. You can cancel from the editor or delivery panel until then.`,
        });
      }
      onAfterApprove?.();
    } catch (error) {
      handleFailure(error, `Failed to send the approved message to ${getChannelLabel(selectedChannel)}.`);
    } finally {
      setActionLoading(null);
    }
  };

  const republishRowToSelectedChannel = async (row: SheetRow) => {
    if (!await showConfirm({ title: 'Confirm Publish', description: `Publish "${row.topic}" again to ${getChannelLabel(selectedChannel)}? This will send the currently approved text and selected media one more time.` })) return;
    await publishRowToSelectedChannel(row);
  };

  const handleDeleteTopic = async (row: SheetRow) => {
    if (!await showConfirm({ title: 'Confirm Delete', description: `Delete "${row.topic}" from the content calendar?` })) return;
    setDeletingRowIndex(row.rowIndex);
    try {
      await api.deleteRow(idToken, row);
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
    selectedApprovedRowPreview,
    setSelectedApprovedRowPreview,
    actionLoading,
    deletingRowIndex,
    loadData,
    handleAddTopic,
    handleApproveVariant,
    handleSaveEmailFields,
    triggerRowGithubAction,
    handleGenerateQuickChange,
    handleGenerateVariantsPreview,
    handleSaveDraftVariants,
    handleSaveTopicGenerationRules,
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
  };
}
