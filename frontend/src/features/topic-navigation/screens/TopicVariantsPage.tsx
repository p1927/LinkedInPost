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
        sharedRules={p.sharedRules}
        googleModel={p.googleModel}
        routed={routed}
        onApprove={(text, img, time) => p.onApprove(row, text, img, time)}
        onGenerateQuickChange={p.onGenerateQuickChange}
        onGenerateVariants={p.onGenerateVariants}
        onSaveVariants={p.onSaveVariants}
        onFetchMoreImages={() => p.onFetchMoreImages(row)}
        onUploadImage={(file) => p.onUploadImage(row, file)}
        onDownloadImage={p.onDownloadImage}
        onCancel={handleCancel}
        isAdmin={p.isAdmin}
        onSaveGenerationRules={p.onSaveGenerationRules}
      />
    </div>
  );
}
