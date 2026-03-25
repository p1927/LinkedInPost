import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import type { SheetRow } from '../services/sheets';
import { LinkedInPostPreview } from './LinkedInPostPreview';

interface Props {
  row: SheetRow;
  onApprove: (selectedText: string, selectedImageId: string, postTime: string) => Promise<void>;
  onCancel: () => void;
}

export function VariantSelection({ row, onApprove, onCancel }: Props) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [expandedOptions, setExpandedOptions] = useState<number[]>([]);
  const [postTime, setPostTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const options = [
    { text: row.variant1, imageUrl: row.imageLink1 },
    { text: row.variant2, imageUrl: row.imageLink2 },
    { text: row.variant3, imageUrl: row.imageLink3 },
    { text: row.variant4, imageUrl: row.imageLink4 },
  ].filter((option) => option.text);

  const toggleExpanded = (index: number) => {
    setExpandedOptions((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index]
    );
  };

  const handleSubmit = async () => {
    if (selectedOptionIndex === null) {
      alert('Please select one of the draft post previews.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedOption = options[selectedOptionIndex];
      const selectedText = selectedOption.text;
      const selectedImageId = selectedOption.imageUrl || '';
      
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(17,24,39,0.66)] px-4 py-6 backdrop-blur-sm sm:px-6">
      <div className="mx-auto flex min-h-full w-full max-w-7xl items-center justify-center">
        <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(180deg,#fcfaf6_0%,#f3f6fb_100%)] shadow-[0_28px_100px_rgba(15,23,42,0.35)]">
          <div className="sticky top-0 z-10 border-b border-[#d9dee8] bg-[rgba(252,250,246,0.92)] px-6 py-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#6a7380]">Research-based preview</p>
                <h2 className="mt-2 text-2xl font-bold text-[#1a2433]">Review draft posts as feed-ready previews</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#55606f]">
                  Each option pairs the generated copy with its matching image so you can approve the post the way it will read in a LinkedIn-style feed card.
                </p>
                <p className="mt-2 text-sm font-medium text-[#1f2937]">Topic: {row.topic}</p>
              </div>
              <button onClick={onCancel} className="rounded-full border border-[#d2d8e2] bg-white px-3 py-2 text-sm font-medium text-[#4b5563] transition hover:border-[#9ca9bb] hover:text-[#111827]">
                Close
              </button>
            </div>
          </div>

          <div className="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {options.map((option, index) => (
                  <LinkedInPostPreview
                    key={`option-${index}`}
                    optionNumber={index + 1}
                    text={option.text}
                    imageUrl={option.imageUrl}
                    selected={selectedOptionIndex === index}
                    expanded={expandedOptions.includes(index)}
                    onSelect={() => setSelectedOptionIndex(index)}
                    onToggleExpanded={() => toggleExpanded(index)}
                  />
                ))}
              </div>
            </div>

            <aside className="border-t border-[#d9dee8] bg-white/80 p-5 lg:border-l lg:border-t-0 lg:p-6">
              <div className="rounded-[28px] border border-[#d8dce6] bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#6a7380]">Approval panel</p>
                <h3 className="mt-2 text-xl font-semibold text-[#1a2433]">Select a post and schedule it</h3>
                <p className="mt-2 text-sm leading-6 text-[#596577]">
                  Approval stores the selected copy, matching image, and optional post time in the sheet.
                </p>

                <div className="mt-6 rounded-2xl border border-[#dbe1ea] bg-[#f8fafc] p-4">
                  <p className="text-sm font-semibold text-[#1f2937]">Selected option</p>
                  <p className="mt-2 text-sm text-[#596577]">
                    {selectedOptionIndex === null
                      ? 'Choose one of the four previews to continue.'
                      : `Draft option ${selectedOptionIndex + 1} is ready for approval.`}
                  </p>
                </div>

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

                <div className="mt-8 flex flex-col gap-3">
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