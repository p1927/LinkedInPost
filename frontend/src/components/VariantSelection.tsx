import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { SheetRow } from '../services/sheets';
import { LinkedInPostPreview } from './LinkedInPostPreview';
import { normalizePreviewImageUrl } from '../services/imageUrls';
import { Dialog } from './Dialog';
import { ImageAssetManager, type ImageAssetOption } from './ImageAssetManager';
import { useAlert } from './AlertProvider';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 px-4 py-6 backdrop-blur-md sm:px-6 sm:py-8 font-sans">
      <div className="mx-auto flex min-h-full w-full max-w-[min(100vw-2rem,1760px)] items-center justify-center">
        <div className="flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-b from-white/95 to-slate-50/95 shadow-2xl backdrop-blur-xl">
          <div className="grid flex-1 gap-0 overflow-y-auto overflow-x-hidden xl:overflow-hidden xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
            <section className="relative flex min-h-[460px] flex-col border-b border-slate-200/60 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(241,245,249,0.68))] p-3 xl:min-h-0 xl:border-b-0 xl:border-r xl:p-4">
              {options.length > 0 ? (
                <>
                  <div className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-3 rounded-full border border-white/60 bg-white/80 px-2 py-3 shadow-lg backdrop-blur-sm">
                    {options.map((_, index) => {
                      const isActive = index === selectedOptionIndex;

                      return (
                        <button
                          key={`variant-dot-${index}`}
                          type="button"
                          onClick={() => selectOption(index)}
                          className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${
                            isActive
                              ? 'bg-primary text-white shadow-md'
                              : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                          aria-label={`Jump to draft ${index + 1}`}
                          aria-pressed={isActive}
                        >
                          <span className="text-sm font-semibold">{index + 1}</span>
                          <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                            Draft {index + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="absolute right-5 top-5 z-10 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => changeVariantBy(-1)}
                      disabled={selectedOptionIndex === null || selectedOptionIndex === 0}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/85 text-slate-700 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                      aria-label="Previous draft"
                    >
                      <ChevronUp className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeVariantBy(1)}
                      disabled={selectedOptionIndex === null || selectedOptionIndex === options.length - 1}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/85 text-slate-700 shadow-md transition-all duration-200 hover:translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                      aria-label="Next draft"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mb-3 pl-16 pr-16 sm:pr-20">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Draft Carousel</p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-semibold text-slate-900">Review one variant at a time</h3>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                          Scroll the preview, use the arrow keys, or tap the left rail to move through drafts. The refine panel stays in sync with the active variant.
                        </p>
                      </div>
                      <div className="hidden rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-right shadow-sm sm:block">
                        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Active draft</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">
                          {(selectedOptionIndex ?? 0) + 1}
                          <span className="ml-1 text-sm font-medium text-slate-500">/ {options.length}</span>
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
                    <div className="h-full overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm">
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
                <div className="flex h-full items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center text-slate-500 shadow-sm">
                  No draft variants are available for this topic yet.
                </div>
              )}
            </section>

            <aside className="flex min-h-fit xl:min-h-0 flex-col bg-white/60 p-3 xl:p-4 backdrop-blur-sm">
              <div className="flex h-full min-h-fit xl:min-h-0 flex-col rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-xl sm:p-8 backdrop-blur-md">
                <div className="min-h-fit xl:min-h-0 xl:flex-1 xl:overflow-y-auto pr-2 custom-scrollbar">
                <section>
                  <div className="mb-3 flex items-center justify-between gap-4 text-[#1f2937]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <h4 className="text-sm font-semibold">Improve this draft</h4>
                    </div>
                    {selectedOptionIndex !== null ? (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-primary">
                        Draft {selectedOptionIndex + 1}
                      </span>
                    ) : null}
                  </div>
                  <label className="block text-sm font-medium text-[#374151]" htmlFor="editable-post-text">
                    Edit the post directly
                  </label>
                  <textarea
                    id="editable-post-text"
                    value={editableText}
                    onChange={(event) => setEditableText(event.target.value)}
                    placeholder="Edit the selected draft here before approval or refinement."
                    className="mt-2 min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/50"
                  />
                  <label className="mt-4 block text-sm font-medium text-[#374151]" htmlFor="refinement-notes">
                    Tell Gemini what to improve
                  </label>
                  <textarea
                    id="refinement-notes"
                    value={refinementPrompt}
                    onChange={(event) => setRefinementPrompt(event.target.value)}
                    placeholder="Examples: make it more founder-like, remove jargon, add a stronger hook, keep it under 180 words."
                    className="mt-2 min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white/50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#6b7280]">
                    Approval uses the edited copy above immediately. Refinement sends the edited draft plus these notes to Gemini and replaces the four sheet variants with a fresh set.
                  </p>
                  <button
                    onClick={handleRefine}
                    type="button"
                    disabled={refining || submitting || selectedOptionIndex === null}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-primary transition-all duration-200 hover:bg-indigo-100 hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    {refining ? 'Requesting 4 refined variants...' : 'Generate 4 improved variants'}
                  </button>
                </section>

                <section className="mt-8 pt-6 border-t border-slate-200">
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

                <section className="mt-8 pt-6 border-t border-slate-200">
                  <div className="mb-3 flex items-center gap-2 text-[#1f2937]">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <h4 className="text-sm font-semibold">Schedule Delivery</h4>
                  </div>
                  <label className="block text-sm font-medium text-[#374151]" htmlFor="post-time-input">
                    Post time (optional)
                  </label>
                  <input
                    id="post-time-input"
                    type="datetime-local"
                    value={postTime}
                    onChange={(e) => setPostTime(e.target.value)}
                    className="mt-2 w-full max-w-sm rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-slate-900 outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">Leave this empty if the post should publish the next time the publishing workflow runs.</p>
                </section>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || selectedOptionIndex === null}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-600 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    {submitting ? 'Approving...' : 'Approve selected post'}
                  </button>
                  <button
                    onClick={() => requestAction({ type: 'close' })}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/50 px-6 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    Cancel
                  </button>
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