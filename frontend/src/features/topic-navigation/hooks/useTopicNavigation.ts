import { useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type ReviewRoutedNavigation } from '../../review/ReviewWorkspace';
import { normalizeTopicRouteParam, encodeTopicIdForPath } from '../utils/topicRoute';
import { WORKSPACE_PATHS, topicVariantsPathFromSegment, topicEditorPathFromSegment } from '../utils/workspaceRoutes';

export function useTopicNavigation(
  topicId: string | undefined,
  screen: 'variants' | 'editor',
  variantSlot: number = 0,
) {
  const navigate = useNavigate();
  const topicIdRef = useRef(topicId);
  useEffect(() => {
    topicIdRef.current = topicId;
  }, [topicId]);

  const routed: ReviewRoutedNavigation = useMemo(() => {
    const pathSegFromRef = () => {
      const raw = topicIdRef.current;
      const id = raw ? normalizeTopicRouteParam(raw) : '';
      return id ? encodeTopicIdForPath(id) : '';
    };
    return {
      screen,
      editorVariantSlot: Number.isInteger(variantSlot) && variantSlot >= 0 && variantSlot <= 3 ? variantSlot : 0,
      onNavigateToTopics: () => navigate(WORKSPACE_PATHS.topics),
      onNavigateToVariants: () => {
        navigate(topicVariantsPathFromSegment(pathSegFromRef()));
      },
      onNavigateToEditor: (slot, opts) => {
        const seg = pathSegFromRef();
        if (!seg) return;
        navigate(topicEditorPathFromSegment(seg, slot, { openMedia: opts?.openMedia }));
      },
    };
  }, [screen, variantSlot, navigate]);

  return routed;
}
