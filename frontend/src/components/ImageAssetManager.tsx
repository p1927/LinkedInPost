import { useRef, useState } from 'react';
import { Download, ImagePlus, LoaderCircle, RefreshCw, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { normalizePreviewImageUrl } from '../services/imageUrls';
import { useAlert } from './AlertProvider';
import { Input } from './ui/input';
import { Button } from '@/components/ui/button';

export interface ImageAssetOption {
  id: string;
  imageUrl: string;
  label: string;
  kind: 'generated' | 'alternate' | 'upload';
  originalIndex?: number;
  /** Search hits are shown from the web first; selecting or approving uploads to workspace storage. */
  pendingCloudUpload?: boolean;
}

interface Props {
  topic: string;
  images: ImageAssetOption[];
  selectedImageUrl: string;
  onSelectImage: (option: ImageAssetOption) => void | Promise<void>;
  onFetchMoreImages: (searchQuery?: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
  /** When set, selected cards show a control to detach the image from the post. */
  onClearSelectedImage?: () => void;
  /** Narrow sidebar: single column, contained thumbnails, stacked actions. */
  compact?: boolean;
  imagePromoteOptionId?: string;
}

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
  if (option.kind === 'alternate') return option.pendingCloudUpload ? 'Preview' : 'Alternate';
  return null;
}

export function ImageAssetManager({
  topic,
  images,
  selectedImageUrl,
  onSelectImage,
  onFetchMoreImages,
  onUploadImage,
  onDownloadImage,
  onClearSelectedImage,
  compact = false,
  imagePromoteOptionId = '',
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
          <h4 className="font-heading text-sm font-semibold text-ink">Choose the image</h4>
          <p className="mt-1 text-sm leading-6 text-muted">
            {compact
              ? 'Search the web, keep sheet images, or upload. Search results save to storage when you select or approve.'
              : 'Keep the generated options, search for images, or upload a custom asset for this post before approval.'}
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
        <div
          className={
            compact
              ? 'mt-4 grid grid-cols-1 gap-3'
              : 'mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
          }
        >
          {images.map((option) => {
            const isSelected = selectedImageUrl === option.imageUrl;
            const resolvedImageUrl = normalizePreviewImageUrl(option.imageUrl);
            const badgeLabel = getOptionBadgeLabel(option);
            const promoting = imagePromoteOptionId === option.id;

            return (
              <div
                key={option.id}
                className={`overflow-hidden rounded-3xl border bg-surface transition-colors ${
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
                    disabled={Boolean(promoting)}
                    onClick={() => void onSelectImage(option)}
                    className="block w-full rounded-none text-left hover:bg-transparent disabled:opacity-70"
                  >
                    <div
                      className={`relative overflow-hidden bg-surface-muted ${
                        compact
                          ? 'flex max-h-44 min-h-[7rem] items-center justify-center py-2'
                          : 'aspect-[4/3]'
                      }`}
                    >
                      <img
                        src={resolvedImageUrl}
                        alt={option.label}
                        referrerPolicy="no-referrer"
                        className={`max-h-full w-full transition-transform duration-500 ${
                          compact ? 'max-h-44 object-contain' : 'h-full object-cover'
                        } ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.02]'}`}
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
                          Selected
                        </Badge>
                      ) : null}
                      {promoting ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-ink/40 backdrop-blur-[2px]">
                          <LoaderCircle className="h-8 w-8 animate-spin text-white" aria-hidden />
                          <span className="sr-only">Saving image to workspace…</span>
                        </div>
                      ) : null}
                    </div>
                  </Button>
                  {isSelected && onClearSelectedImage && !promoting ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-lg"
                      className="absolute right-2 top-2 z-20 size-9 shrink-0 rounded-full border border-border bg-white/95 text-muted shadow-md backdrop-blur-sm hover:bg-white hover:text-destructive"
                      aria-label="Remove image from post"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClearSelectedImage();
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
                      {option.pendingCloudUpload && isSelected
                        ? 'Will be saved to workspace when you approve (or now if you re-select after an error).'
                        : isSelected
                          ? 'This image will be attached on approval.'
                          : option.pendingCloudUpload
                            ? 'Web preview — select to save a copy for publishing.'
                            : 'Select this image for the approved post.'}
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
      )}
    </div>
  );
}