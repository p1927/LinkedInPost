import { DraftEditor } from '../../editor/DraftEditor';
import { useReviewFlow } from '../../review/context/ReviewFlowContext';
import { EditorSidebar } from '../components/EditorSidebar';
import { LivePreviewSidebar } from '../components/LivePreviewSidebar';
import { Button } from '@/components/ui/button';

export function EditorScreen() {
  const {
    sheetRow,
    editorText,
    setEditorText,
    selection,
    setSelection,
    scope,
    setScope,
    editorDirty,
    handleFormatting,
    handleApprove,
    submitting,
  } = useReviewFlow();

  const isPublished = (sheetRow.status || '').trim().toLowerCase() === 'published';

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:grid xl:min-h-0 xl:grid-cols-[minmax(210px,0.22fr)_minmax(0,1fr)_minmax(280px,0.52fr)] xl:gap-0 xl:overflow-hidden">
        <EditorSidebar />

        <section
          aria-labelledby="review-draft-editor-heading"
          className="order-1 flex min-h-0 min-w-0 flex-col overflow-y-auto border-b border-violet-200/30 px-3 py-3 xl:order-none xl:h-full xl:max-h-full xl:overflow-hidden xl:border-b-0 xl:border-r xl:border-violet-200/30"
        >
          <h3 id="review-draft-editor-heading" className="sr-only">
            Draft editor
          </h3>
          <DraftEditor
            value={editorText}
            selection={selection}
            preferredScope={scope}
            dirty={editorDirty}
            onChange={setEditorText}
            onSelectionChange={setSelection}
            onScopeChange={setScope}
            onFormatting={handleFormatting}
            compact
            className="min-h-0 flex-1"
          />
        </section>

        <LivePreviewSidebar />
      </div>

      <footer className="shrink-0 border-t border-violet-200/35 px-4 py-3.5 sm:px-5">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => void handleApprove()}
            disabled={submitting}
            className="min-h-[44px] w-full cursor-pointer shadow-[0_6px_20px_rgba(124,58,237,0.32)] transition-all duration-200 hover:shadow-[0_10px_28px_rgba(109,40,217,0.36)] active:shadow-[0_4px_12px_rgba(109,40,217,0.28)] disabled:opacity-75 focus:ring-2 focus:ring-primary/50 focus:outline-none sm:w-auto sm:min-w-[9rem]"
          >
            {submitting
              ? isPublished ? 'Saving…' : 'Approving…'
              : isPublished ? '✓ Save Schedule' : '✓ Approve & Publish'}
          </Button>
        </div>
      </footer>
    </>
  );
}
