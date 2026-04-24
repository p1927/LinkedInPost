import { useRef, useState } from 'react';
import { Download, ImagePlus, LoaderCircle, RefreshCw, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { normalizePreviewImageUrl } from '../services/imageUrls';
import { MAX_IMAGES_PER_POST } from '../services/selectedImageUrls';
import { useAlert } from './useAlert';
import { Input } from './ui/input';
import { Button } from '@/components/ui/button';
import { ImageGenReferencePanel } from './ImageGenReferencePanel';
import { ChannelImageRequirements } from '../features/review/components/ChannelImageRequirements';

export interface ImageAssetOption {
  id: string;
  imageUrl: string;
  label: string;
  kind: 'generated' | 'alternate' | 'upload';
  originalIndex?: number;
  /** @deprecated Search hits no longer use a pending-upload step; kept for typing compatibility. */
  pendingCloudUpload?: boolean;
}

interface Props {
  topic: string;
  images: ImageAssetOption[];
  /** Selected image URLs in post order (first is primary for captions / sheet column M). */
  selectedImageUrls: string[];
  onSelectImage: (option: ImageAssetOption) => void | Promise<void>;
  onFetchMoreImages: (searchQuery?: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  /** When set, selected cards show a control to detach the image from the post. */
  onClearSelectedImage?: () => void;
  /** Narrow sidebar: horizontal image carousel, contained thumbnails, stacked actions. */
  compact?: boolean;
  /** When true, shows the "Generate with Reference" panel (model supports multimodal image input). */
  supportsReferenceImage?: boolean;
  /** Upload a reference image and return its GCS URL (reuses the upload endpoint). */
  onUploadReferenceImage?: (file: File) => Promise<string>;
  /** Generate a new image from a reference URL + instructions; result is added to imageOptions by the caller. */
  onGenerateReferenceImage?: (referenceImageUrl: string, instructions: string) => Promise<void>;
  /** Channel identifier used to show channel-specific image dimension requirements. */
  channel?: string;
  /** AI-suggested generation prompt surfaced from enrichment data. */
  aiGenerationPrompt?: string;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

function buildDownloadName(topic: string, option: ImageAssetOption): string {
  const baseTopic = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'linkedin-post';
  const suffix = option.kind === 'upload'
    ? option.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'upload'
    : option.kind;
  return `${baseTopic}-${suffix}.jpg`;
}

function getOptionBadgeLabel(option: ImageAssetOption): string | null {
  if (option.kind === 'upload') return 'Uploaded';
  if (option.kind === 'alternate') return 'Search';
  return null;
}

export function ImageAssetManager({
  topic,
  images,
  selectedImageUrls,
  onSelectImage,
  onFetchMoreImages,
  onUploadImage,
  onDownloadImage,
  onClearSelectedImage,
  compact = false,
  supportsReferenceImage = false,
  onUploadReferenceImage,
  onGenerateReferenceImage,
  channel,
  aiGenerationPrompt,
}: Props) {
  const { showAlert } = useAlert();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [imageSearchQuery, setImageSearchQuery] = useState('');

  const handleFetchMore = async () => {
    setFetching(true);
    try {
      const q = imageSearchQuery.trim();
      await onFetchMoreImages(q || undefined);
    } catch (error) {
      console.error(error);
      void showAlert({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to fetch alternate images.' });
    } finally {
      setFetching(false);
    }
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.toLowerCase().startsWith('image/')) {
      void showAlert({ title: 'Notice', description: 'Choose an image file to upload.' });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      void showAlert({ title: 'Notice', description: `Image exceeds the ${MAX_IMAGE_SIZE / (1024 * 1024)} MB limit.` });
      return;
    }

    setUploading(true);
    try {
      await onUploadImage(file);
    } catch (error) {
      console.error(error);
      void showAlert({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to upload the image.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (option: ImageAssetOption) => {
    setDownloadingId(option.id);
    try {
      await onDownloadImage(option.imageUrl, buildDownloadName(topic, option));
    } catch (error) {
      console.error(error);
      void showAlert({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to download the image.' });
    } finally {
      setDownloadingId('');
    }
  };

  return (
    <div>
      <div className={compact ? 'space-y-3' : 'flex flex-wrap items-start justify-between gap-4'}>
        <div className="min-w-0">
          <h4 className="font-heading text-sm font-semibold text-ink">Choose images</h4>
          <p className="mt-1 text-sm leading-6 text-muted">
            {compact
              ? 'Tap to toggle selection (up to ' +
                MAX_IMAGES_PER_POST +
                '). Order follows selection; first image is primary. Search previews use the source URL; approve or publish copies those to workspace storage when needed. Uploads go to workspace immediately.'
              : 'Toggle images to attach several to one post (carousel, album, or multi-photo where the channel supports it). First selected is primary.'}
          </p>
        </div>

        <div className={compact ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
          <Input
            value={imageSearchQuery}
            onChange={(e) => setImageSearchQuery(e.target.value)}
            placeholder="Image search (optional)"
            disabled={fetching || uploading}
            className="h-10 rounded-xl border-border bg-canvas text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !fetching && !uploading) {
                e.preventDefault();
                void handleFetchMore();
              }
            }}
          />
          <p className="text-xs leading-5 text-muted">
            Leave search empty to use your topic. Press Enter or Search to load previews.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => void handleFetchMore()}
              disabled={fetching || uploading}
              className="gap-2 rounded-xl"
            >
              {fetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {fetching ? 'Searching…' : 'Search images'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || fetching}
              className="gap-2 rounded-xl"
            >
              {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Uploading...' : 'Upload image'}
            </Button>
          </div>
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelection}
          />
        </div>
      </div>

      {channel && (
        <div className="mt-4">
          <ChannelImageRequirements channel={channel} />
        </div>
      )}

      {supportsReferenceImage && onUploadReferenceImage && onGenerateReferenceImage && (
        <div className="mt-4">
          <ImageGenReferencePanel
            imageOptions={images}
            onUploadReferenceImage={onUploadReferenceImage}
            onGenerateReferenceImage={onGenerateReferenceImage}
            aiGenerationPrompt={aiGenerationPrompt}
          />
        </div>
      )}

      {images.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-border bg-canvas px-5 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface text-muted shadow-sm">
            <ImagePlus className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">No images are attached yet</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Fetch fresh image options or upload your own asset to attach one before approval.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          {compact && images.length > 1 ? (
            <p className="mb-2 text-xs leading-5 text-muted">Scroll sideways to compare options (search loads up to eight).</p>
          ) : null}
          <div className="relative">
            {fetching ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/60 backdrop-blur-sm">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : null}
            <div
              role="list"
              aria-label="Image options"
              className={
                compact
                  ? 'flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 pt-1 [scrollbar-width:thin]'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
              }
            >
            {images.map((option) => {
            const orderIndex = selectedImageUrls.indexOf(option.imageUrl);
            const isSelected = orderIndex >= 0;
            const resolvedImageUrl = normalizePreviewImageUrl(option.imageUrl);
            const badgeLabel = getOptionBadgeLabel(option);

            return (
              <div
                key={option.id}
                role="listitem"
                className={`overflow-hidden rounded-3xl border bg-surface transition-colors ${
                  compact ? 'w-72 max-w-[min(280px,calc(100%-0.5rem))] shrink-0 snap-center' : ''
                } ${
                  isSelected
                    ? 'border-primary shadow-lg ring-2 ring-primary/15'
                    : 'border-border shadow-card hover:border-border-strong hover:shadow-lift'
                }`}
              >
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="inline"
                    onClick={() => void onSelectImage(option)}
                    className="block w-full rounded-none text-left hover:bg-transparent"
                  >
                    <div
                      className={`relative overflow-hidden bg-surface-muted ${
                        compact
                          ? 'flex min-h-[7rem] max-h-52 items-center justify-center px-2 py-3'
                          : 'flex aspect-[4/3] items-center justify-center px-2 py-2'
                      }`}
                    >
                      <img
                        src={resolvedImageUrl}
                        alt={option.label}
                        referrerPolicy="no-referrer"
                        className={
                          compact
                            ? 'mx-auto max-h-48 max-w-full h-auto w-auto object-contain object-center'
                            : 'mx-auto max-h-full max-w-full h-auto w-auto object-contain object-center'
                        }
                      />
                      {badgeLabel ? (
                        <Badge
                          variant="neutral"
                          size="sm"
                          className="absolute left-3 top-3 border-white/35 bg-ink/88 text-primary-fg shadow-md backdrop-blur-sm normal-case"
                        >
                          {badgeLabel}
                        </Badge>
                      ) : null}
                      {isSelected ? (
                        <Badge variant="primary" size="sm" className="absolute bottom-3 left-3 shadow-md normal-case">
                          {orderIndex === 0 ? 'Primary' : `#${orderIndex + 1}`}
                        </Badge>
                      ) : null}
                    </div>
                  </Button>
                  {isSelected ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-lg"
                      className="absolute right-2 top-2 z-20 size-9 shrink-0 rounded-full border border-border bg-white/95 text-muted shadow-md backdrop-blur-sm hover:bg-white hover:text-destructive"
                      aria-label={
                        selectedImageUrls.length === 1
                          ? 'Remove image from post'
                          : orderIndex === 0
                            ? 'Remove primary image from selection'
                            : 'Remove this image from selection'
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectedImageUrls.length === 1 && onClearSelectedImage) {
                          onClearSelectedImage();
                          return;
                        }
                        void onSelectImage(option);
                      }}
                    >
                      <X className="h-4 w-4" strokeWidth={2.25} />
                    </Button>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {isSelected
                        ? orderIndex === 0
                          ? 'Primary attachment — used first for captions where only one is allowed.'
                          : 'Included in the multi-image post in this order.'
                        : 'Tap to add or remove from the post.'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-lg"
                    onClick={() => void handleDownload(option)}
                    disabled={downloadingId === option.id}
                    className="size-10 shrink-0 rounded-full border-border bg-canvas text-muted hover:text-ink"
                    aria-label={`Download ${option.label}`}
                  >
                    {downloadingId === option.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
      )}

      {selectedImageUrls.length > 0 && onClearSelectedImage ? (
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="ghost" size="sm" className="text-muted hover:text-destructive" onClick={onClearSelectedImage}>
            Clear all images
          </Button>
        </div>
      ) : null}
    </div>
  );
}