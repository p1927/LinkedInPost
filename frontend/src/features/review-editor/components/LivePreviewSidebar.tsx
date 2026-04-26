import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChannelPostPreview } from '../../../components/channel-previews/ChannelPostPreview';
import { useReviewFlow } from '../../review/context/useReviewFlow';
import { useReviewFlowEditor } from '../../review/context/ReviewFlowEditorContext';

interface LivePreviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LivePreviewSidebar({ isOpen, onClose }: LivePreviewSidebarProps) {
  const {
    selectedImageUrls,
    deliveryChannel,
    previewAuthorName,
    setActiveWorkspacePanel,
    emailTo,
    emailSubject,
  } = useReviewFlow();
  const { editorText } = useReviewFlowEditor();

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const badgeLabel =
    deliveryChannel === 'gmail'
      ? selectedImageUrls.length > 1
        ? `Gmail · ${selectedImageUrls.length} images`
        : selectedImageUrls.length === 1
          ? 'Gmail · image'
          : 'Gmail · text'
      : selectedImageUrls.length > 1
        ? `${selectedImageUrls.length} images`
        : selectedImageUrls.length === 1
          ? 'Image'
          : 'Text only';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-preview-heading"
        className={`fixed inset-y-0 right-0 z-50 flex w-[540px] max-w-[92vw] flex-col bg-canvas shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-violet-200/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <p
              id="live-preview-heading"
              className="text-[10px] font-semibold uppercase tracking-wider text-ink/65"
            >
              Live preview
            </p>
            <Badge variant="neutral" size="xs" className="normal-case shrink-0">
              {badgeLabel}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="inline"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-md p-1.5 text-ink/50 hover:bg-violet-50 hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="flex w-full justify-center">
            <div className="w-full max-w-[460px]">
              <ChannelPostPreview
                optionNumber={1}
                text={editorText}
                imageUrl={selectedImageUrls[0]}
                imageUrls={selectedImageUrls.length > 1 ? selectedImageUrls : undefined}
                previewChannel={deliveryChannel}
                previewAuthorName={previewAuthorName}
                gmailTo={emailTo}
                gmailSubject={emailSubject}
                layout="sidebar"
                selected
                expanded
                onSelect={() => undefined}
                onToggleExpanded={() => undefined}
                onOpenMedia={() => setActiveWorkspacePanel('media')}
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
