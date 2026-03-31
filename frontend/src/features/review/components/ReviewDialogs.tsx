import { Dialog } from '../../../components/Dialog';
import { CompareDialog } from '../../compare/CompareDialog';
import { useReviewFlow } from '../context/useReviewFlow';
import { useReviewFlowEditor } from '../context/ReviewFlowEditorContext';

export function ReviewDialogs() {
  const {
    pendingVariantIndex,
    setPendingVariantIndex,
    setOpenMediaAfterVariantConfirm,
    openMediaAfterVariantConfirm,
    sheetVariants,
    routed,
    setActiveWorkspacePanel,
    pendingClose,
    setPendingClose,
    onCancel,
    pendingNavigateToVariants,
    setPendingNavigateToVariants,
    setReviewPhase,
  } = useReviewFlow();
  const {
    applySheetVariantBase,
    setEditorText,
    editorBaselineText,
    setSelection,
    setInstruction,
    setQuickChangePreview,
    setVariantsPreview,
    compareState,
    setCompareState,
  } = useReviewFlowEditor();

  return (
    <>
      <Dialog
        open={pendingVariantIndex !== null}
        title="Discard current editor changes?"
        description="Loading a different sheet variant will replace the current editor working state."
        confirmLabel="Discard and load"
        onCancel={() => {
          setOpenMediaAfterVariantConfirm(false);
          setPendingVariantIndex(null);
        }}
        onConfirm={() => {
          if (pendingVariantIndex === null) {
            return;
          }

          const variant = sheetVariants[pendingVariantIndex];
          const alsoMedia = openMediaAfterVariantConfirm;
          setPendingVariantIndex(null);
          setOpenMediaAfterVariantConfirm(false);
          if (!variant) {
            return;
          }

          if (routed?.screen === 'editor') {
            routed.onNavigateToEditor(variant.originalIndex, { openMedia: alsoMedia });
            return;
          }

          applySheetVariantBase(variant, pendingVariantIndex ?? undefined);
          if (alsoMedia) {
            setActiveWorkspacePanel('media');
          }
        }}
      />

      <Dialog
        open={pendingClose}
        title="Discard current editor changes?"
        description="Going back will remove the current local editor state and preview context. Sheet drafts will remain unchanged."
        confirmLabel="Discard and go back"
        onCancel={() => {
          setPendingClose(false);
        }}
        onConfirm={() => {
          setPendingClose(false);
          onCancel();
        }}
      />

      <Dialog
        open={pendingNavigateToVariants}
        title="Discard current editor changes?"
        description="Returning to variant selection will remove the current local editor state and preview context. Sheet drafts will remain unchanged."
        confirmLabel="Discard and continue"
        onCancel={() => setPendingNavigateToVariants(false)}
        onConfirm={() => {
          setPendingNavigateToVariants(false);
          if (routed) {
            routed.onNavigateToVariants();
            return;
          }
          setEditorText(editorBaselineText);
          setSelection(null);
          setInstruction('');
          setQuickChangePreview(null);
          setVariantsPreview(null);
          setReviewPhase('pick-variant');
        }}
      />

      <CompareDialog
        open={compareState !== null}
        scope={compareState?.scope || 'whole-post'}
        title={compareState?.title || 'Compare preview'}
        currentText={compareState?.currentText || ''}
        proposedText={compareState?.proposedText || ''}
        resultingText={compareState?.resultingText || ''}
        onCancel={() => setCompareState(null)}
        onConfirm={() => compareState?.onConfirm()}
      />
    </>
  );
}
