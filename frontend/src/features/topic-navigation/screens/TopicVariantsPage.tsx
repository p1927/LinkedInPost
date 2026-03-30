import { useCallback } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { WORKSPACE_PATHS } from '../utils/workspaceRoutes';
import { findRowByTopicRouteId } from '../utils/topicRoute';
import { ReviewWorkspace } from '../../review/ReviewWorkspace';
import { type TopicReviewPagesBaseProps, reviewShellClass } from '../types';
import { useTopicNavigation } from '../hooks/useTopicNavigation';

export function TopicVariantsPage(p: TopicReviewPagesBaseProps) {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  
  const handleCancel = useCallback(() => {
    navigate(WORKSPACE_PATHS.topics);
  }, [navigate]);

  const row = topicId ? findRowByTopicRouteId(p.rows, topicId) : undefined;
  const routed = useTopicNavigation(topicId, 'variants');

  if (!topicId) {
    return <Navigate to={WORKSPACE_PATHS.topics} replace />;
  }
  if (p.queueLoading && !row) {
    return (
      <div
        className={`${reviewShellClass} flex flex-col items-center justify-center gap-3 py-20`}
        aria-busy="true"
        aria-label="Loading topic"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted">Loading topic…</p>
      </div>
    );
  }
  if (!row) {
    return <Navigate to={WORKSPACE_PATHS.topics} replace />;
  }

  return (
    <div className={reviewShellClass}>
      <ReviewWorkspace
        row={row}
        deliveryChannel={p.deliveryChannel}
        previewAuthorName={p.previewAuthorName}
        globalGenerationRules={p.globalGenerationRules}
        googleModel={p.googleModel}
        routed={routed}
        onApprove={(text, img, time, emailTo, emailCc, emailBcc, emailSubject, imgJson) =>
          p.onApprove(row, text, img, time, emailTo, emailCc, emailBcc, emailSubject, imgJson)
        }
        onPublishNow={(text, img, time, emailTo, emailCc, emailBcc, emailSubject, imgJson) =>
          p.onPublishNow(row, text, img, time, emailTo, emailCc, emailBcc, emailSubject, imgJson)
        }
        onSaveEmailFields={(emailTo, emailCc, emailBcc, emailSubject) => p.onSaveEmailFields(row, emailTo, emailCc, emailBcc, emailSubject)}
        globalEmailDefaults={p.globalEmailDefaults}
        onGenerateQuickChange={p.onGenerateQuickChange}
        onGenerateVariants={p.onGenerateVariants}
        onSaveVariants={p.onSaveVariants}
        onFetchMoreImages={(searchQuery) => p.onFetchMoreImages(row, searchQuery)}
        onPromoteRemoteImage={(sourceUrl) => p.onPromoteRemoteImage(row, sourceUrl)}
        onUploadImage={(file) => p.onUploadImage(row, file)}
        onDownloadImage={p.onDownloadImage}
        onCancel={handleCancel}
        isAdmin={p.isAdmin}
        onSaveTopicGenerationRules={p.onSaveTopicGenerationRules}
        loadPostTemplates={p.loadPostTemplates}
        onSaveGenerationTemplateId={p.onSaveGenerationTemplateId}
        pendingScheduledPublish={p.pendingScheduledPublish}
        scheduledPublishCancelBusy={p.scheduledPublishCancelBusy}
        onCancelScheduledPublish={p.onCancelScheduledPublish}
        newsResearch={p.newsResearch}
        newsProviderKeys={p.newsProviderKeys}
        onSearchNewsResearch={p.onSearchNewsResearch ? (payload) => p.onSearchNewsResearch!(row, payload) : undefined}
        onListNewsResearchHistory={p.onListNewsResearchHistory ? () => p.onListNewsResearchHistory!(row) : undefined}
        onGetNewsResearchSnapshot={
          p.onGetNewsResearchSnapshot ? (id) => p.onGetNewsResearchSnapshot!(row, id) : undefined
        }
      />
    </div>
  );
}
