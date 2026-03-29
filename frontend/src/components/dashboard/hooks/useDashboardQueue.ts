import { useState, useCallback, useEffect } from 'react';
import { type SheetRow } from '../../../services/sheets';
import { type GenerationRequest, type QuickChangePreviewResult, type VariantsPreviewResponse } from '../../../services/backendApi';
import { type AppSession, type BackendApi, isAuthErrorMessage } from '../../../services/backendApi';
import { type DeliverySummary } from '../types';

import { type ChannelId, getChannelOption, getChannelLabel } from '../../../integrations/channels';
import { buildRowActionKey, getNormalizedRowStatus, isSameTopicDate } from '../utils';
import { encodeTopicRouteId, normalizeTopicRouteParam } from '../../../features/topic-navigation/utils/topicRoute';

import { useAlert } from '../../AlertProvider';

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
    
    setLoading(true);
    try {
      await api.addTopic(idToken, newTopic.trim());
      setNewTopic('');
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to add topic.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVariant = async (row: SheetRow, selectedText: string, selectedImageId: string, postTime: string, emailTo?: string, emailCc?: string, emailBcc?: string, emailSubject?: string) => {
    try {
      const normalizedStatus = getNormalizedRowStatus(row.status);
      if (normalizedStatus === 'published') {
        await api.updatePostSchedule(idToken, row, postTime);
        await loadData(true);
        void showAlert({
          title: 'Schedule Updated',
          description: 'The schedule was updated successfully. Use "Republish" from the dashboard to re-queue the post.',
        });
        onAfterApprove?.();
        return;
      }

      await api.updateRowStatus(idToken, row, 'Approved', selectedText, selectedImageId, postTime, emailTo, emailCc, emailBcc, emailSubject);
      await loadData(true);
      onAfterApprove?.();
    } catch (error) {
      handleFailure(error, 'Failed to approve variant.');
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

  const handleFetchReviewImages = async (row: SheetRow) => {
    const result = await api.fetchDraftImages(idToken, row.topic, 4);
    return result.imageUrls;
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

  const publishRowToSelectedChannel = async (row: SheetRow) => {
    if (actionLoading !== null) return;

    if (selectedChannel === 'telegram' && !telegramConfigured) {
      void showAlert({ title: 'Notice', description: session.isAdmin ? 'Complete the Telegram delivery settings in the workspace drawer first.' : 'A workspace admin still needs to configure Telegram delivery settings.' });
      return;
    }
    if (selectedChannel === 'whatsapp' && !whatsappConfigured) {
      void showAlert({ title: 'Notice', description: session.isAdmin ? 'Complete the WhatsApp settings in the workspace drawer first.' : 'A workspace admin still needs to configure WhatsApp delivery settings.' });
      return;
    }
    if (selectedChannel === 'instagram' && !instagramConfigured) {
      void showAlert({ title: 'Notice', description: session.isAdmin ? 'Complete the Instagram publishing settings in the workspace drawer first.' : 'A workspace admin still needs to configure Instagram publishing settings.' });
      return;
    }
    if (selectedChannel === 'linkedin' && !linkedinConfigured) {
      void showAlert({ title: 'Notice', description: session.isAdmin ? 'Complete the LinkedIn publishing settings in the workspace drawer first.' : 'A workspace admin still needs to configure LinkedIn publishing settings.' });
      return;
    }

    if (selectedChannelOption.requiresRecipient && !resolvedRecipientId) {
      void showAlert({ title: 'Notice', description: selectedChannel === 'telegram' ? 'Select a saved Telegram chat or enter a valid chat ID.' : 'Select a saved WhatsApp recipient or enter a valid phone number in international format.' });
      return;
    }

    const message = (row.selectedText || row.variant1 || '').trim();
    if (!message) {
      void showAlert({ title: 'Notice', description: 'This row does not have approved text yet. Review and approve a draft first.' });
      return;
    }

    if (selectedChannel === 'instagram' && !(row.selectedImageId || '').trim()) {
      void showAlert({ title: 'Notice', description: 'Instagram requires a selected image. Approve the row with an image before publishing.' });
      return;
    }

    const actionKey = buildRowActionKey('publish', row);
    setActionLoading(actionKey);
    try {
      const result = await api.publishContent(idToken, {
        row,
        channel: selectedChannel,
        recipientId: selectedChannelOption.requiresRecipient ? resolvedRecipientId : undefined,
        message,
        imageUrl: (row.selectedImageId || '').trim() || undefined,
      });

      if (result.deliveryMode === 'sent') {
        setLastDeliverySummary({
          topic: row.topic,
          channel: selectedChannel,
          mediaMode: result.mediaMode,
          recipientLabel: selectedChannelOption.requiresRecipient ? (selectedRecipientLabel || resolvedRecipientId) : (selectedChannel === 'instagram' ? (session.config.instagramUsername || 'connected account') : 'LinkedIn audience'),
        });
        await loadData(true);
        void showAlert({ title: 'Success', description: selectedChannelOption.requiresRecipient ? `Sent "${row.topic}" to ${selectedRecipientLabel || resolvedRecipientId} on ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.` : `Published "${row.topic}" to ${getChannelLabel(selectedChannel)} as a ${result.mediaMode} post.` });
      } else {
        void showAlert({ title: 'Notice', description: `Queued "${row.topic}" for ${getChannelLabel(selectedChannel)} publishing. Refresh the dashboard in a minute to confirm the updated status.` });
      }
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
    newTopic,
    setNewTopic,
    selectedApprovedRowPreview,
    setSelectedApprovedRowPreview,
    actionLoading,
    deletingRowIndex,
    loadData,
    handleAddTopic,
    handleApproveVariant,
    triggerRowGithubAction,
    handleGenerateQuickChange,
    handleGenerateVariantsPreview,
    handleSaveDraftVariants,
    handleFetchReviewImages,
    handleUploadReviewImage,
    handleDownloadReviewImage,
    publishRowToSelectedChannel,
    republishRowToSelectedChannel,
    handleDeleteTopic,
  };
}
