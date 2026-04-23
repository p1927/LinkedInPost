import { useMemo } from 'react';
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

  const routed: ReviewRoutedNavigation = useMemo(() => {
    const pathSeg = () => {
      const id = topicId ? normalizeTopicRouteParam(topicId) : '';
      return id ? encodeTopicIdForPath(id) : '';
    };
    return {
      screen,
      editorVariantSlot: Number.isInteger(variantSlot) && variantSlot >= 0 && variantSlot <= 3 ? variantSlot : 0,
      onNavigateToTopics: () => navigate(WORKSPACE_PATHS.topics),
      onNavigateToVariants: () => {
        navigate(topicVariantsPathFromSegment(pathSeg()));
      },
      onNavigateToEditor: (slot, opts) => {
        const seg = pathSeg();
        if (!seg) return;
        // Replace the variant-picker entry so browser back from the editor returns to the topics list,
        // not the intermediate /topics/:id grid.
        navigate(topicEditorPathFromSegment(seg, slot, { openMedia: opts?.openMedia }), { replace: true });
      },
    };
  }, [screen, variantSlot, navigate, topicId]);

  return routed;
}
