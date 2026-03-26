import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { SheetRow } from '../services/sheets';
import { LinkedInPostPreview } from './LinkedInPostPreview';
import { normalizePreviewImageUrl } from '../services/imageUrls';
import { Dialog } from './Dialog';
import { ImageAssetManager, type ImageAssetOption } from './ImageAssetManager';
import { useAlert } from './AlertProvider';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
  row: SheetRow;
  onApprove: (selectedText: string, selectedImageId: string, postTime: string) => Promise<void>;
  onRefine: (baseText: string, instructions: string) => Promise<void>;
  onFetchMoreImages: () => Promise<string[]>;
  onUploadImage: (file: File) => Promise<string>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  onCancel: () => void;
}

type PendingAction =
  | { type: 'close' }
  | { type: 'select'; nextIndex: number };

export function VariantSelection({
  row,
  onApprove,
  onRefine,
  onFetchMoreImages,
  onUploadImage,
  onDownloadImage,
  onCancel,
}: Props) {
  const { showAlert } = useAlert();
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [expandedOptions, setExpandedOptions] = useState<number[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [editableText, setEditableText] = useState('');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [postTime, setPostTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [refining, setRefining] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [alternateImageOptions, setAlternateImageOptions] = useState<ImageAssetOption[]>([]);
  const [uploadedImageOptions, setUploadedImageOptions] = useState<ImageAssetOption[]>([]);
  const lastNavigationAtRef = useRef(0);

  const options = useMemo(
    () => [
      { text: row.variant1, imageUrl: row.imageLink1, originalIndex: 0 },
      { text: row.variant2, imageUrl: row.imageLink2, originalIndex: 1 },
      { text: row.variant3, imageUrl: row.imageLink3, originalIndex: 2 },
      { text: row.variant4, imageUrl: row.imageLink4, originalIndex: 3 },
    ].filter((option) => option.text.trim()),
    [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4, row.variant1, row.variant2, row.variant3, row.variant4]
  );

  const generatedImageOptions = useMemo<ImageAssetOption[]>(
    () => [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4]
      .map((imageUrl, originalIndex) => ({
        id: `generated-${originalIndex}`,
        imageUrl,
        originalIndex,
        label: `Generated ${originalIndex + 1}`,
        kind: 'generated' as const,
      }))
      .filter((option) => option.imageUrl.trim()),
    [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4]
  );

  const imageOptions = useMemo(
    () => [...uploadedImageOptions, ...generatedImageOptions, ...alternateImageOptions],
    [alternateImageOptions, generatedImageOptions, uploadedImageOptions]
  );

  useEffect(() => {
    setAlternateImageOptions([]);
    setUploadedImageOptions([]);
  }, [row.topic, row.date]);

  useEffect(() => {
    if (options.length === 0) {
      setSelectedOptionIndex(null);
      return;
    }

    setSelectedOptionIndex((current) => {
      if (current === null || current >= options.length) {
        return 0;
      }

      return current;
    });
  }, [options.length]);

  useEffect(() => {
    if (selectedOptionIndex === null) {
      setEditableText('');
      setRefinementPrompt('');
      return;
    }

    const selectedOption = options[selectedOptionIndex];
    setEditableText(selectedOption?.text || '');
    setRefinementPrompt('');

    const matchingImage = generatedImageOptions.find(
      (imageOption) => imageOption.originalIndex === selectedOption?.originalIndex && imageOption.imageUrl
    );

    if (matchingImage?.imageUrl) {
      setSelectedImageUrl(matchingImage.imageUrl);
    } else if (imageOptions.length > 0) {
      setSelectedImageUrl(imageOptions[0]?.imageUrl || '');
    } else {
      setSelectedImageUrl('');
    }
  }, [generatedImageOptions, imageOptions, options, selectedOptionIndex]);

  useEffect(() => {
    if (!selectedImageUrl) {
      if (imageOptions.length > 0) {
        setSelectedImageUrl(imageOptions[0]?.imageUrl || '');
      }
      return;
    }

    if (!imageOptions.some((imageOption) => imageOption.imageUrl === selectedImageUrl)) {
      const selectedOption = selectedOptionIndex === null ? null : options[selectedOptionIndex] || null;
      const matchingImage = generatedImageOptions.find(
        (imageOption) => imageOption.originalIndex === selectedOption?.originalIndex && imageOption.imageUrl
      );
      setSelectedImageUrl(matchingImage?.imageUrl || imageOptions[0]?.imageUrl || '');
    }
  }, [generatedImageOptions, imageOptions, options, selectedImageUrl, selectedOptionIndex]);

  useEffect(() => {
    console.info('Draft review payload', {
      topic: row.topic,
      optionCount: options.length,
      imageCount: imageOptions.length,
      rawImageUrls: imageOptions.map((option) => option.imageUrl),
      normalizedImageUrls: imageOptions.map((option) => normalizePreviewImageUrl(option.imageUrl)),
    });
  }, [imageOptions, options.length, row.topic]);

  const toggleExpanded = (index: number) => {
    setExpandedOptions((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index]
    );
  };

  const selectedOption = selectedOptionIndex === null ? null : options[selectedOptionIndex] || null;

  const hasUnsavedChanges = Boolean(
    selectedOption
      && (editableText !== selectedOption.text || refinementPrompt.trim().length > 0)
  );

  const mergeUniqueImageOptions = (nextOptions: ImageAssetOption[]) => {
    const seen = new Set<string>();
    return nextOptions.filter((option) => {
      const key = option.imageUrl.trim();
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  };

  const handleFetchMoreImageOptions = async () => {
    const nextImageUrls = await onFetchMoreImages();
    const nextOptions = nextImageUrls.map((imageUrl, index) => ({
      id: `alternate-${Date.now()}-${index}`,
      imageUrl,
      label: `Alternative ${index + 1}`,
      kind: 'alternate' as const,
    }));

    const dedupedAlternates = mergeUniqueImageOptions([
      ...nextOptions,
      ...alternateImageOptions.filter((existingOption) => existingOption.kind === 'alternate'),
    ]).slice(0, Math.max(nextOptions.length, 4));
    setAlternateImageOptions(dedupedAlternates);
    if (dedupedAlternates[0]?.imageUrl) {
      setSelectedImageUrl(dedupedAlternates[0].imageUrl);
    }
  };

  const handleUploadImageOption = async (file: File) => {
    const imageUrl = await onUploadImage(file);
    const uploadedOption: ImageAssetOption = {
      id: `upload-${Date.now()}`,
      imageUrl,
      label: file.name ? file.name.replace(/\.[^.]+$/, '') : 'Uploaded image',
      kind: 'upload',
    };

    setUploadedImageOptions((current) => mergeUniqueImageOptions([uploadedOption, ...current]).slice(0, 4));
    setSelectedImageUrl(imageUrl);
  };

  const applyPendingAction = (action: PendingAction) => {
    if (action.type === 'close') {
      onCancel();
      return;
    }

    setSelectedOptionIndex(action.nextIndex);
  };

  const requestAction = (action: PendingAction) => {
    if (action.type === 'select' && action.nextIndex === selectedOptionIndex) {
      return;
    }

    if (hasUnsavedChanges) {
      setPendingAction(action);
      return;
    }

    applyPendingAction(action);
  };

  const changeVariantBy = (direction: -1 | 1) => {
    if (options.length <= 1 || selectedOptionIndex === null) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(options.length - 1, selectedOptionIndex + direction));
    requestAction({ type: 'select', nextIndex });
  };

  const handleCarouselWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (options.length <= 1 || selectedOptionIndex === null || Math.abs(event.deltaY) < 24) {
      return;
    }

    event.preventDefault();

    const now = Date.now();
    if (now - lastNavigationAtRef.current < 380) {
      return;
    }

    lastNavigationAtRef.current = now;
    changeVariantBy(event.deltaY > 0 ? 1 : -1);
  };

  const handleCarouselKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      changeVariantBy(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      changeVariantBy(-1);
    }
  };

  const selectOption = (index: number) => {
    requestAction({ type: 'select', nextIndex: index });
  };

  const handleRefine = async () => {
    if (selectedOptionIndex === null) {
      void showAlert({ title: 'Notice', description: 'Select a draft first, then refine it.' });
      return;
    }

    if (!editableText.trim()) {
      void showAlert({ title: 'Notice', description: 'Add or keep some draft text before asking Gemini to refine it.' });
      return;
    }

    setRefining(true);
    try {
      await onRefine(editableText.trim(), refinementPrompt.trim());
    } catch (error) {
      console.error(error);
      void showAlert({ title: 'Error', description: 'Failed to request refined variants.' });
    } finally {
      setRefining(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedOptionIndex === null) {
      void showAlert({ title: 'Notice', description: 'Please select one of the draft post previews.' });
      return;
    }

    if (!editableText.trim()) {
      void showAlert({ title: 'Notice', description: 'Post text cannot be empty.' });
      return;
    }

    setSubmitting(true);
    try {
      const selectedText = editableText.trim();
      const selectedImageId = selectedImageUrl;
      
      // Convert local datetime-local to format expected by backend (YYYY-MM-DD HH:MM)
      let formattedTime = '';
      if (postTime) {
        const date = new Date(postTime);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        formattedTime = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      }

      await onApprove(selectedText, selectedImageId, formattedTime);
    } catch (error) {
      console.error(error);
      void showAlert({ title: 'Error', description: 'Failed to approve variant.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/55 px-4 py-6 backdrop-blur-sm sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto flex min-h-full w-full max-w-[min(100vw-2rem,1760px)] items-center justify-center">
        <div className="flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-lift">
          <div className="grid flex-1 gap-0 overflow-y-auto overflow-x-hidden xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] xl:overflow-hidden">
            <section className="relative flex min-h-[460px] flex-col border-b border-border bg-canvas p-3 xl:min-h-0 xl:border-b-0 xl:border-r xl:border-border xl:p-4">
              {options.length > 0 ? (
                <>
                  <div className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-3 rounded-full border border-border bg-surface px-2 py-3 shadow-card">
                    {options.map((_, index) => {
                      const isActive = index === selectedOptionIndex;

                      return (
                        <Button
                          key={`variant-dot-${index}`}
                          type="button"
                          variant="ghost"
                          size="icon-lg"
                          onClick={() => selectOption(index)}
                          className={`group relative size-11 rounded-full transition-colors duration-200 ${
                            isActive
                              ? 'bg-primary text-primary-fg shadow-md hover:bg-primary hover:text-primary-fg'
                              : 'border border-border bg-surface text-muted hover:border-border-strong hover:text-ink'
                          }`}
                          aria-label={`Jump to draft ${index + 1}`}
                          aria-pressed={isActive}
                        >
                          <span className="text-sm font-semibold">{index + 1}</span>
                          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-medium text-primary-fg opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                            Draft {index + 1}
                          </span>
                        </Button>
                      );
                    })}
                  </div>

                  <div className="absolute right-5 top-5 z-10 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-lg"
                      onClick={() => changeVariantBy(-1)}
                      disabled={selectedOptionIndex === null || selectedOptionIndex === 0}
                      className="size-11 rounded-full shadow-md"
                      aria-label="Previous draft"
                    >
                      <ChevronUp className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-lg"
                      onClick={() => changeVariantBy(1)}
                      disabled={selectedOptionIndex === null || selectedOptionIndex === options.length - 1}
                      className="size-11 rounded-full shadow-md"
                      aria-label="Next draft"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="mb-3 pl-16 pr-16 sm:pr-20">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted">Draft Carousel</p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="font-heading text-2xl font-semibold text-ink">Review one variant at a time</h3>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
                          Scroll the preview, use the arrow keys, or tap the left rail to move through drafts. The refine panel stays in sync with the active variant.
                        </p>
                      </div>
                      <div className="hidden rounded-2xl border border-border bg-surface px-4 py-3 text-right shadow-card sm:block">
                        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Active draft</p>
                        <p className="mt-1 text-lg font-semibold text-ink">
                          {(selectedOptionIndex ?? 0) + 1}
                          <span className="ml-1 text-sm font-medium text-muted">/ {options.length}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="min-h-0 flex-1 overflow-hidden pl-16 pr-2 sm:pr-4"
                    onWheel={handleCarouselWheel}
                    onKeyDown={handleCarouselKeyDown}
                    tabIndex={0}
                  >
                    <div className="h-full overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
                      <div
                        className="flex h-full flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ transform: `translateY(-${(selectedOptionIndex ?? 0) * 100}%)` }}
                      >
                        {options.map((option, index) => (
                          <div key={`option-${index}`} className="flex min-h-full flex-shrink-0 items-center px-4 py-5 sm:px-6 sm:py-6">
                            <LinkedInPostPreview
                              optionNumber={index + 1}
                              text={option.text}
                              imageUrl={option.imageUrl}
                              selected={selectedOptionIndex === index}
                              expanded={expandedOptions.includes(index)}
                              onSelect={() => selectOption(index)}
                              onToggleExpanded={() => toggleExpanded(index)}
                              mode="hero"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border-2 border-dashed border-border bg-canvas px-6 py-16 text-center text-muted shadow-sm">
                  No draft variants are available for this topic yet.
                </div>
              )}
            </section>

            <aside className="flex min-h-fit flex-col bg-canvas p-3 xl:min-h-0 xl:p-4">
              <div className="flex h-full min-h-fit flex-col rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8 xl:min-h-0">
                <div className="min-h-fit xl:min-h-0 xl:flex-1 xl:overflow-y-auto pr-2 custom-scrollbar">
                <section>
                  <div className="mb-3 flex items-center justify-between gap-4 text-ink">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">Improve this draft</h4>
                    </div>
                    {selectedOptionIndex !== null ? (
                      <span className="rounded-full border border-ai-border bg-ai-surface px-3 py-1 text-xs font-semibold text-ai-ink">
                        Draft {selectedOptionIndex + 1}
                      </span>
                    ) : null}
                  </div>
                  <label className="block text-sm font-medium text-ink" htmlFor="editable-post-text">
                    Edit the post directly
                  </label>
                  <Textarea
                    id="editable-post-text"
                    value={editableText}
                    onChange={(event) => setEditableText(event.target.value)}
                    placeholder="Edit the selected draft here before approval or refinement."
                    className="mt-2 min-h-[160px] w-full rounded-2xl border border-border bg-canvas px-4 py-4 text-sm leading-6 text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <label className="mt-4 block text-sm font-medium text-ink" htmlFor="refinement-notes">
                    Tell Gemini what to improve
                  </label>
                  <Textarea
                    id="refinement-notes"
                    value={refinementPrompt}
                    onChange={(event) => setRefinementPrompt(event.target.value)}
                    placeholder="Examples: make it more founder-like, remove jargon, add a stronger hook, keep it under 180 words."
                    className="mt-2 min-h-[80px] w-full rounded-2xl border border-border bg-canvas px-4 py-4 text-sm leading-6 text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Approval uses the edited copy above immediately. Refinement sends the edited draft plus these notes to Gemini and replaces the four sheet variants with a fresh set.
                  </p>
                  <Button
                    onClick={handleRefine}
                    type="button"
                    variant="ai"
                    size="md"
                    disabled={refining || submitting || selectedOptionIndex === null}
                    className="mt-4 w-full rounded-xl disabled:opacity-50"
                  >
                    {refining ? 'Requesting 4 refined variants...' : 'Generate 4 improved variants'}
                  </Button>
                </section>

                <section className="mt-8 border-t border-border pt-6">
                  <ImageAssetManager
                    topic={row.topic}
                    images={imageOptions}
                    selectedImageUrl={selectedImageUrl}
                    onSelectImage={setSelectedImageUrl}
                    onFetchMoreImages={handleFetchMoreImageOptions}
                    onUploadImage={handleUploadImageOption}
                    onDownloadImage={onDownloadImage}
                  />
                </section>

                <section className="mt-8 border-t border-border pt-6">
                  <div className="mb-3 flex items-center gap-2 text-ink">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <h4 className="text-sm font-semibold">Schedule Delivery</h4>
                  </div>
                  <label className="block text-sm font-medium text-ink" htmlFor="post-time-input">
                    Post time (optional)
                  </label>
                  <Input
                    id="post-time-input"
                    type="datetime-local"
                    value={postTime}
                    onChange={(e) => setPostTime(e.target.value)}
                    className="mt-2 w-full max-w-sm cursor-pointer rounded-xl border border-border bg-canvas px-4 py-3 text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-2 text-xs leading-5 text-muted">Leave this empty if the post should publish the next time the publishing workflow runs.</p>
                </section>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    onClick={handleSubmit}
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={submitting || selectedOptionIndex === null}
                    className="rounded-xl px-6 disabled:opacity-50"
                  >
                    {submitting ? 'Approving...' : 'Approve selected post'}
                  </Button>
                  <Button
                    onClick={() => requestAction({ type: 'close' })}
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={submitting}
                    className="rounded-xl px-6 disabled:opacity-50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          <Dialog
            open={pendingAction !== null}
            title="Discard unsaved draft edits?"
            description={pendingAction?.type === 'close'
              ? 'You have draft changes that have not been approved or refined yet. Closing now will remove those edits.'
              : 'You have draft changes that have not been approved or refined yet. Switching variants will replace the edited draft and refinement notes.'}
            confirmLabel={pendingAction?.type === 'close' ? 'Discard and close' : 'Discard and switch'}
            onCancel={() => setPendingAction(null)}
            onConfirm={() => {
              if (!pendingAction) {
                return;
              }

              const action = pendingAction;
              setPendingAction(null);
              applyPendingAction(action);
            }}
          />
        </div>
      </div>
    </div>
  );
}