import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, LoaderCircle, Sparkles, Upload, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { normalizePreviewImageUrl } from '../services/imageUrls';
import { useAlert } from './useAlert';
import type { ImageAssetOption } from './ImageAssetManager';

interface Props {
  imageOptions: ImageAssetOption[];
  onUploadReferenceImage: (file: File) => Promise<string>;
  onGenerateReferenceImage: (referenceImageUrl: string, instructions: string) => Promise<void>;
  aiGenerationPrompt?: string;
}

export function ImageGenReferencePanel({ imageOptions, onUploadReferenceImage, onGenerateReferenceImage, aiGenerationPrompt }: Props) {
  const { showAlert } = useAlert();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.toLowerCase().startsWith('image/')) {
      void showAlert({ title: 'Notice', description: 'Choose an image file.' });
      return;
    }
    setUploading(true);
    setError('');
    try {
      const url = await onUploadReferenceImage(file);
      setReferenceUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!referenceUrl) {
      setError('Pick a reference image first.');
      return;
    }
    if (!instructions.trim()) {
      setError('Add instructions for the generation.');
      return;
    }
    setError('');
    setGenerating(true);
    try {
      await onGenerateReferenceImage(referenceUrl, instructions.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 shrink-0 text-violet-500" />
          <span className="text-sm font-semibold text-ink">Generate with Reference</span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-3 pb-3 pt-2.5 space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink">Pick a reference image</p>
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
              {imageOptions.map((opt) => {
                const selected = opt.imageUrl === referenceUrl;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReferenceUrl(opt.imageUrl)}
                    className={[
                      'relative shrink-0 snap-start cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-150',
                      selected ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-transparent hover:border-border',
                    ].join(' ')}
                    style={{ width: 56, height: 56 }}
                    title={opt.label}
                  >
                    <img
                      src={normalizePreviewImageUrl(opt.imageUrl)}
                      alt={opt.label}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex shrink-0 snap-start cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-canvas text-muted transition-colors duration-150 hover:border-violet-400 hover:text-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ width: 56, height: 56 }}
                title="Upload reference image"
              >
                {uploading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            {imageOptions.length === 0 && !uploading && (
              <p className="mt-1 text-xs text-muted">Search for images above or upload one to use as a reference.</p>
            )}
          </div>

          <div>
            {aiGenerationPrompt && (
              <div className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/40 p-2.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-semibold text-violet-700 mb-0.5">AI-suggested prompt</p>
                  <p className="text-[0.65rem] text-slate-600 line-clamp-2">{aiGenerationPrompt}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInstructions(aiGenerationPrompt)}
                  className="shrink-0 rounded-lg bg-violet-600 px-2 py-1 text-[0.65rem] font-semibold text-white hover:bg-violet-700 transition-colors"
                >
                  Use
                </button>
              </div>
            )}
            <label className="mb-1.5 block text-xs font-medium text-ink">
              Instructions
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Change to a blue color scheme, make it look more professional…"
              rows={3}
              className="resize-none rounded-xl border-border bg-canvas text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button
            type="button"
            size="md"
            onClick={() => void handleGenerate()}
            disabled={generating || uploading || !referenceUrl}
            className="w-full gap-2 rounded-xl"
          >
            {generating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {generating ? 'Generating…' : 'Generate Image'}
          </Button>
        </div>
      )}
    </div>
  );
}
