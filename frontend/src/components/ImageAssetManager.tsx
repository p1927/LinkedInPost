import { useRef, useState } from 'react';
import { Download, ImagePlus, LoaderCircle, RefreshCw, Upload } from 'lucide-react';
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

function getOptionBadge(option: ImageAssetOption): string {
  if (option.kind === 'upload') {
    return 'Uploaded';
  }

  if (option.kind === 'alternate') {
    return 'Alternate';
  }

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
          <h4 className="text-sm font-semibold text-[#1f2937]">Choose the image</h4>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            Keep the generated options, pull fresh alternatives, or upload a custom asset for this post before approval.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleFetchMore}
            disabled={fetching || uploading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {fetching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {fetching ? 'Fetching...' : 'Fetch other images'}
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || fetching}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
        <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
            <ImagePlus className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">No images are attached yet</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
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
                className={`overflow-hidden rounded-[24px] border bg-white transition-all duration-200 ${
                  isSelected
                    ? 'border-primary shadow-lg ring-2 ring-primary/15'
                    : 'border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectImage(option.imageUrl)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={resolvedImageUrl}
                      alt={option.label}
                      className={`h-full w-full object-cover transition-transform duration-500 ${
                        isSelected ? 'scale-[1.03]' : 'hover:scale-[1.03]'
                      }`}
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-slate-950/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      {getOptionBadge(option)}
                    </div>
                    {isSelected ? (
                      <div className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        Selected
                      </div>
                    ) : null}
                  </div>
                </button>

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {isSelected ? 'This image will be attached on approval.' : 'Select this image for the approved post.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDownload(option)}
                    disabled={downloadingId === option.id}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
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