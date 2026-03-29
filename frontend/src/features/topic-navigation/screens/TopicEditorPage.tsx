import { useCallback } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { WORKSPACE_PATHS, topicVariantsPathFromSegment } from '../utils/workspaceRoutes';
import { findRowByTopicRouteId, normalizeTopicRouteParam, encodeTopicIdForPath, getVariantSlotContent } from '../utils/topicRoute';
import { ReviewWorkspace } from '../../review/ReviewWorkspace';
import { type TopicReviewPagesBaseProps, reviewShellClass } from '../types';
import { useTopicNavigation } from '../hooks/useTopicNavigation';

export function TopicEditorPage(p: TopicReviewPagesBaseProps) {
  const { topicId, variantSlot } = useParams<{ topicId: string; variantSlot: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const handleCancel = useCallback(() => {
    navigate(WORKSPACE_PATHS.topics);
  }, [navigate]);

  const row = topicId ? findRowByTopicRouteId(p.rows, topicId) : undefined;
  const slot = Number.parseInt(variantSlot ?? '', 10);
  const editorStartMediaPanel = searchParams.get('media') === '1';
  
  const topicIdNorm = topicId ? normalizeTopicRouteParam(topicId) : '';
  const topicSeg = topicIdNorm ? encodeTopicIdForPath(topicIdNorm) : '';

  const routed = useTopicNavigation(topicId, 'editor', slot);

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
  if (!Number.isInteger(slot) || slot < 0 || slot > 3) {
    return <Navigate to={topicVariantsPathFromSegment(topicSeg)} replace />;
  }
  const slotContent = getVariantSlotContent(row, slot);
  if (!slotContent?.text.trim()) {
    return <Navigate to={topicVariantsPathFromSegment(topicSeg)} replace />;
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
        editorStartMediaPanel={editorStartMediaPanel}
        onApprove={(text, img, time, emailTo, emailCc, emailBcc, emailSubject) => p.onApprove(row, text, img, time, emailTo, emailCc, emailBcc, emailSubject)}
        onSaveEmailFields={(emailTo, emailCc, emailBcc, emailSubject) => p.onSaveEmailFields(row, emailTo, emailCc, emailBcc, emailSubject)}
        globalEmailDefaults={p.globalEmailDefaults}
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
