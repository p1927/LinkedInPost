import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { DraftEditor } from '../../editor/DraftEditor';
import { useReviewFlow } from '../../review/context/ReviewFlowContext';
import { EditorSidebar } from '../components/EditorSidebar';
import { LivePreviewSidebar } from '../components/LivePreviewSidebar';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery';

function ResizeHandle() {
  return (
    <PanelResizeHandle className="relative flex w-2 items-center justify-center bg-transparent group outline-none">
      <div className="z-10 flex h-8 w-1 items-center justify-center rounded-full bg-violet-200/50 transition-colors group-hover:bg-violet-400 group-active:bg-violet-500" />
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-violet-200/30 transition-colors group-hover:bg-violet-300" />
    </PanelResizeHandle>
  );
}

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
  const isDesktop = useMediaQuery('(min-width: 1280px)');

  const editorSection = (
    <section
      aria-labelledby="review-draft-editor-heading"
      className="order-1 flex min-h-0 min-w-0 flex-col overflow-y-auto border-b border-violet-200/30 px-4 py-4 xl:order-none xl:h-full xl:max-h-full xl:overflow-hidden xl:border-b-0"
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
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto xl:min-h-0 xl:overflow-hidden">
        {isDesktop ? (
          <PanelGroup orientation="horizontal" className="h-full w-full">
            <Panel defaultSize={27} minSize={20} maxSize={38} className="flex min-h-0 flex-col">
              <EditorSidebar />
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={44} minSize={30} className="flex min-h-0 flex-col">
              {editorSection}
            </Panel>
            <ResizeHandle />
            <Panel defaultSize={29} minSize={20} maxSize={40} className="flex min-h-0 flex-col">
              <LivePreviewSidebar />
            </Panel>
          </PanelGroup>
        ) : (
          <>
            {editorSection}
            <EditorSidebar />
            <LivePreviewSidebar />
          </>
        )}
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
