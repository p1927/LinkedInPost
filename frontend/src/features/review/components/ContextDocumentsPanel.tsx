import { useRef } from 'react';
import { FileText, Upload, X, Loader2 } from 'lucide-react';

export interface ContextDocument {
  id: string;
  name: string;
  charCount: number;
  content: string;
}

interface Props {
  documents: ContextDocument[];
  onUpload: (file: File) => Promise<void>;
  onRemove: (id: string) => void;
  uploading: boolean;
}

export function ContextDocumentsPanel({ documents, onUpload, onRemove, uploading }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await onUpload(file);
  };

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <FileText className="h-4 w-4 text-violet-500" />
          Context Documents
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.md"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
      {documents.length > 0 && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-1.5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg bg-canvas px-2.5 py-1.5"
            >
              <span className="truncate text-xs text-ink flex-1 min-w-0">{doc.name}</span>
              <span className="shrink-0 ml-2 text-[0.6rem] text-muted">
                {doc.charCount.toLocaleString()} chars
              </span>
              <button
                type="button"
                onClick={() => onRemove(doc.id)}
                className="ml-2 shrink-0 text-muted hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <p className="text-[0.65rem] text-muted">
            These documents are included as context during AI generation.
          </p>
        </div>
      )}
    </div>
  );
}
