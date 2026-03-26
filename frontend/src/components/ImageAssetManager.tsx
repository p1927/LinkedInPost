import { useRef, useState } from 'react';
import { Download, ImagePlus, LoaderCircle, RefreshCw, Upload } from 'lucide-react';
import { Badge } from './ui/Badge';
import { normalizePreviewImageUrl } from '../services/imageUrls';
import { useAlert } from './AlertProvider';

export interface ImageAssetOption {
  id: string;
  imageUrl: string;
  label: string;
  kind: 'generated' | 'alternate' | 'upload';
  originalIndex?: number;
}

interface Props {
  topic: string;
  images: ImageAssetOption[];
  selectedImageUrl: string;
  onSelectImage: (imageUrl: string) => void;
  onFetchMoreImages: () => Promise<void>;
  onUploadImage: (file: File) => Promise<void>;
  onDownloadImage: (imageUrl: string, fileName: string) => Promise<void>;
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

function getOptionBadgeLabel(option: ImageAssetOption): string {
  if (option.kind === 'upload') return 'Uploaded';
  if (option.kind === 'alternate') return 'Alternate';
  return 'Generated';
}

export function ImageAssetManager({
  topic,
  images,
  selectedImageUrl,
  onSelectImage,
  onFetchMoreImages,
  onUploadImage,
  onDownloadImage,
}: Props) {
  const { showAlert } = useAlert();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');

  const handleFetchMore = async () => {
    setFetching(true);
    try {
      await onFetchMoreImages();
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="font-heading text-sm font-semibold text-ink">Choose the image</h4>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
            Keep the generated options, pull fresh alternatives, or upload a custom asset for this post before approval.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleFetchMore}
            disabled={fetching || uploading}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/35 bg-canvas px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {fetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {fetching ? 'Fetching...' : 'Fetch other images'}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || fetching}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload image'}
          </button>
          <input
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
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((option) => {
            const isSelected = selectedImageUrl === option.imageUrl;
            const resolvedImageUrl = normalizePreviewImageUrl(option.imageUrl);

            return (
              <div
                key={option.id}
                className={`overflow-hidden rounded-3xl border bg-surface transition-colors ${
                  isSelected
                    ? 'border-primary shadow-lg ring-2 ring-primary/15'
                    : 'border-border shadow-card hover:border-border-strong hover:shadow-lift'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectImage(option.imageUrl)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
                    <img
                      src={resolvedImageUrl}
                      alt={option.label}
                      className={`h-full w-full object-cover transition-transform duration-500 ${
                        isSelected ? 'scale-[1.03]' : 'hover:scale-[1.03]'
                      }`}
                    />
                    <Badge
                      variant="neutral"
                      size="sm"
                      className="absolute left-3 top-3 border-white/35 bg-ink/88 text-primary-fg shadow-md backdrop-blur-sm normal-case"
                    >
                      {getOptionBadgeLabel(option)}
                    </Badge>
                    {isSelected ? (
                      <Badge variant="primary" size="sm" className="absolute right-3 top-3 shadow-md normal-case">
                        Selected
                      </Badge>
                    ) : null}
                  </div>
                </button>

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {isSelected ? 'This image will be attached on approval.' : 'Select this image for the approved post.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDownload(option)}
                    disabled={downloadingId === option.id}
                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-canvas text-muted transition-colors hover:border-border-strong hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Download ${option.label}`}
                  >
                    {downloadingId === option.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}