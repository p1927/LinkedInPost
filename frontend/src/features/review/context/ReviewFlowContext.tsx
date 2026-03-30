import { createContext, useContext } from 'react';
import { type ReviewFlowContextValue, type ReviewFlowProviderProps } from './types';
import { useReviewFlowState } from './useReviewFlowState';
import { useReviewFlowActions } from './useReviewFlowActions';

const ReviewFlowContext = createContext<ReviewFlowContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useReviewFlow(): ReviewFlowContextValue {
  const context = useContext(ReviewFlowContext);
  if (!context) {
    throw new Error('useReviewFlow must be used within a ReviewFlowProvider');
  }
  return context;
}

export function ReviewFlowProvider(props: ReviewFlowProviderProps) {
  const state = useReviewFlowState(props);
  const actions = useReviewFlowActions(props, state);

  // We omit `setChrome` from the context value since it's an internal detail of the state hook
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { setChrome, effectiveGenerationRules, suppressAutoImageSelection, setSuppressAutoImageSelection, ...restState } =
    state;
  void suppressAutoImageSelection;
  void setSuppressAutoImageSelection;

  const value: ReviewFlowContextValue = {
    // Props
    row: props.row,
    deliveryChannel: props.deliveryChannel,
    previewAuthorName: props.previewAuthorName,
    sharedRules: effectiveGenerationRules,
    globalGenerationRules: props.globalGenerationRules,
    isAdmin: props.isAdmin,
    googleModel: props.googleModel,
    routed: props.routed,
    editorStartMediaPanel: props.editorStartMediaPanel ?? false,
    onDownloadImage: props.onDownloadImage,
    onCancel: props.onCancel,
    pendingScheduledPublish: props.pendingScheduledPublish ?? null,
    scheduledPublishCancelBusy: props.scheduledPublishCancelBusy ?? false,
    onCancelScheduledPublish: props.onCancelScheduledPublish ?? (() => {}),
    onDismissScheduledPublish: props.onDismissScheduledPublish ?? (() => {}),

    // State & Actions
    ...restState,
    ...actions,
  };

  return <ReviewFlowContext.Provider value={value}>{props.children}</ReviewFlowContext.Provider>;
}
