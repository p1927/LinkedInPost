import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import type { SheetRow } from '../services/sheets';
import { LinkedInPostPreview } from './LinkedInPostPreview';
import { normalizePreviewImageUrl } from '../services/imageUrls';

interface Props {
  row: SheetRow;
  onApprove: (selectedText: string, selectedImageId: string, postTime: string) => Promise<void>;
  onRefine: (baseText: string, instructions: string) => Promise<void>;
  onCancel: () => void;
}

export function VariantSelection({ row, onApprove, onRefine, onCancel }: Props) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [expandedOptions, setExpandedOptions] = useState<number[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [editableText, setEditableText] = useState('');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [postTime, setPostTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [refining, setRefining] = useState(false);

  const options = useMemo(
    () => [
      { text: row.variant1, imageUrl: row.imageLink1, originalIndex: 0 },
      { text: row.variant2, imageUrl: row.imageLink2, originalIndex: 1 },
      { text: row.variant3, imageUrl: row.imageLink3, originalIndex: 2 },
      { text: row.variant4, imageUrl: row.imageLink4, originalIndex: 3 },
    ].filter((option) => option.text.trim()),
    [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4, row.variant1, row.variant2, row.variant3, row.variant4]
  );

  const imageOptions = useMemo(
    () => [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4]
      .map((imageUrl, originalIndex) => ({ imageUrl, originalIndex }))
      .filter((option) => option.imageUrl.trim()),
    [row.imageLink1, row.imageLink2, row.imageLink3, row.imageLink4]
  );

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
      return;
    }

    const selectedOption = options[selectedOptionIndex];
    setEditableText(selectedOption?.text || '');

    const matchingImageIndex = imageOptions.findIndex(
      (imageOption) => imageOption.originalIndex === selectedOption?.originalIndex && imageOption.imageUrl
    );

    if (matchingImageIndex >= 0) {
      setSelectedImageIndex(matchingImageIndex);
    } else if (imageOptions.length > 0) {
      setSelectedImageIndex(0);
    } else {
      setSelectedImageIndex(null);
    }
  }, [imageOptions, options, selectedOptionIndex]);

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

  const selectedImageUrl = selectedImageIndex === null ? '' : imageOptions[selectedImageIndex]?.imageUrl || '';

  const selectOption = (index: number) => {
    setSelectedOptionIndex(index);
  };

  const handleRefine = async () => {
    if (selectedOptionIndex === null) {
      alert('Select a draft first, then refine it.');
      return;
    }

    if (!editableText.trim()) {
      alert('Add or keep some draft text before asking Gemini to refine it.');
      return;
    }

    setRefining(true);
    try {
      await onRefine(editableText.trim(), refinementPrompt.trim());
    } catch (error) {
      console.error(error);
      alert('Failed to request refined variants.');
    } finally {
      setRefining(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedOptionIndex === null) {
      alert('Please select one of the draft post previews.');
      return;
    }

    if (!editableText.trim()) {
      alert('Post text cannot be empty.');
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
      alert('Failed to approve variant.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(17,24,39,0.66)] px-2 py-2 backdrop-blur-sm sm:px-3 sm:py-3">
      <div className="mx-auto flex min-h-full w-full max-w-[min(100vw-1rem,1760px)] items-center justify-center">
        <div className="flex max-h-[calc(100vh-1rem)] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,#fcfaf6_0%,#f3f6fb_100%)] shadow-[0_28px_100px_rgba(15,23,42,0.35)]">
          <div className="grid flex-1 gap-0 overflow-hidden xl:grid-cols-[minmax(300px,0.58fr)_minmax(0,0.92fr)_minmax(420px,0.92fr)]">
            <section className="flex min-h-0 flex-col border-b border-[#d9dee8] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,249,252,0.96)_100%)] p-4 xl:border-b-0 xl:border-r xl:p-5">
              <div className="min-h-0 overflow-y-auto pr-1">
                {options.length > 0 ? (
                  <div className="rounded-[28px] border border-[#d8dce6] bg-white/80 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] sm:p-5">
                    <div className="space-y-4">
                      {options.map((option, index) => (
                        <div key={`option-${index}`}>
                          <LinkedInPostPreview
                            optionNumber={index + 1}
                            text={option.text}
                            imageUrl={option.imageUrl}
                            selected={selectedOptionIndex === index}
                            expanded={expandedOptions.includes(index)}
                            onSelect={() => selectOption(index)}
                            onToggleExpanded={() => toggleExpanded(index)}
                            mode="carousel"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-dashed border-[#cfd6e1] bg-white/70 px-6 py-12 text-center text-sm text-[#596577]">
                    No draft variants are available for this topic yet.
                  </div>
                )}
              </div>
            </section>

            <section className="flex min-h-0 flex-col border-b border-[#d9dee8] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(242,246,251,0.98)_100%)] p-4 xl:border-b-0 xl:border-r xl:p-5">
              <div className="min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {selectedOption ? (
                  <LinkedInPostPreview
                    optionNumber={(selectedOptionIndex ?? 0) + 1}
                    text={selectedOption.text}
                    imageUrl={selectedOption.imageUrl}
                    selected={true}
                    expanded={expandedOptions.includes(selectedOptionIndex ?? -1)}
                    onSelect={() => undefined}
                    onToggleExpanded={() => selectedOptionIndex !== null && toggleExpanded(selectedOptionIndex)}
                    mode="hero"
                  />
                ) : (
                  <div className="rounded-[28px] border border-dashed border-[#cfd6e1] bg-white/70 px-6 py-12 text-center text-sm text-[#596577]">
                    Pick a variant to see the larger preview.
                  </div>
                )}
              </div>
            </section>

            <aside className="flex min-h-0 flex-col bg-white/80 p-4 xl:p-5">
              <div className="flex h-full min-h-0 flex-col rounded-[32px] border border-[#d8dce6] bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.10)] sm:p-6">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <section>
                  <div className="mb-3 flex items-center gap-2 text-[#1f2937]">
                    <Sparkles className="h-4 w-4" />
                    <h4 className="text-sm font-semibold">Improve this draft</h4>
                  </div>
                  <label className="block text-sm font-medium text-[#374151]" htmlFor="editable-post-text">
                    Edit the post directly
                  </label>
                  <textarea
                    id="editable-post-text"
                    value={editableText}
                    onChange={(event) => setEditableText(event.target.value)}
                    placeholder="Edit the selected draft here before approval or refinement."
                    className="mt-2 min-h-[260px] w-full rounded-2xl border border-[#cfd6e1] bg-white px-4 py-4 text-sm leading-6 text-[#111827] outline-none transition focus:border-[#0a66c2] focus:ring-4 focus:ring-[#0a66c2]/10"
                  />
                  <label className="mt-4 block text-sm font-medium text-[#374151]" htmlFor="refinement-notes">
                    Tell Gemini what to improve
                  </label>
                  <textarea
                    id="refinement-notes"
                    value={refinementPrompt}
                    onChange={(event) => setRefinementPrompt(event.target.value)}
                    placeholder="Examples: make it more founder-like, remove jargon, add a stronger hook, keep it under 180 words."
                    className="mt-2 min-h-[128px] w-full rounded-2xl border border-[#cfd6e1] bg-white px-4 py-4 text-sm leading-6 text-[#111827] outline-none transition focus:border-[#0a66c2] focus:ring-4 focus:ring-[#0a66c2]/10"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#6b7280]">
                    Approval uses the edited copy above immediately. Refinement sends the edited draft plus these notes to Gemini and replaces the four sheet variants with a fresh set.
                  </p>
                  <button
                    onClick={handleRefine}
                    type="button"
                    disabled={refining || submitting || selectedOptionIndex === null}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[#b5c8df] bg-[#eef6ff] px-4 py-3 text-sm font-semibold text-[#0a66c2] transition hover:bg-[#dfedff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {refining ? 'Requesting 4 refined variants...' : 'Generate 4 improved variants'}
                  </button>
                </section>

                <section className="mt-6">
                  <h4 className="text-sm font-semibold text-[#1f2937]">Choose the image</h4>
                  {imageOptions.length === 0 ? (
                    <p className="mt-2 text-sm leading-6 text-[#6b7280]">No image links were found for this draft. The console now logs the raw and normalized image URLs to help debug why.</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {imageOptions.map((imageOption, index) => {
                        const resolvedImageUrl = normalizePreviewImageUrl(imageOption.imageUrl);
                        const isSelected = selectedImageIndex === index;

                        return (
                          <button
                            key={`image-option-${imageOption.originalIndex}`}
                            type="button"
                            onClick={() => setSelectedImageIndex(index)}
                            className={`overflow-hidden rounded-2xl border text-left transition ${
                              isSelected
                                ? 'border-[#0a66c2] bg-[#eef6ff] shadow-[0_10px_24px_rgba(10,102,194,0.14)]'
                                : 'border-[#d8dce6] bg-white hover:border-[#9ebfe2]'
                            }`}
                          >
                            <div className="aspect-[4/3] bg-[#f3f4f6]">
                              <img
                                src={resolvedImageUrl}
                                alt={`Selectable image ${imageOption.originalIndex + 1}`}
                                className="h-full w-full object-cover"
                                onLoad={() => {
                                  console.info('Approval image option loaded', {
                                    topic: row.topic,
                                    imageIndex: imageOption.originalIndex + 1,
                                    originalUrl: imageOption.imageUrl,
                                    resolvedImageUrl,
                                  });
                                }}
                                onError={() => {
                                  console.warn('Approval image option failed to load', {
                                    topic: row.topic,
                                    imageIndex: imageOption.originalIndex + 1,
                                    originalUrl: imageOption.imageUrl,
                                    resolvedImageUrl,
                                  });
                                }}
                              />
                            </div>
                            <div className="px-3 py-2">
                              <p className="text-sm font-semibold text-[#1f2937]">Image {imageOption.originalIndex + 1}</p>
                              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                                {isSelected ? 'Will be saved with the approved post.' : 'Click to use this image.'}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="mt-6">
                  <div className="mb-3 flex items-center gap-2 text-[#1f2937]">
                    <CalendarClock className="h-4 w-4" />
                    <h4 className="text-sm font-semibold">Schedule</h4>
                  </div>
                  <label className="block text-sm font-medium text-[#374151]" htmlFor="post-time-input">
                    Post time
                  </label>
                  <input
                    id="post-time-input"
                    type="datetime-local"
                    value={postTime}
                    onChange={(e) => setPostTime(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#cfd6e1] bg-white px-3 py-2.5 text-[#111827] outline-none transition focus:border-[#0a66c2] focus:ring-4 focus:ring-[#0a66c2]/10"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#6b7280]">Leave this empty if the post should publish the next time the publishing workflow runs.</p>
                </section>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || selectedOptionIndex === null}
                    className="inline-flex items-center justify-center rounded-xl bg-[#0a66c2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#084d92] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Approving...' : 'Approve selected post'}
                  </button>
                  <button
                    onClick={onCancel}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-xl border border-[#cfd6e1] bg-white px-4 py-3 text-sm font-semibold text-[#374151] transition hover:bg-[#f8fafc] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}