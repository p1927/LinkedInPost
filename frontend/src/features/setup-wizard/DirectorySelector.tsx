import { useState } from 'react';
import { ChevronLeft, FolderOpen } from 'lucide-react';

interface DirectorySelectorProps {
  onSelect: (directory: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DirectorySelector({ onSelect, onBack, onNext }: DirectorySelectorProps) {
  const [directory, setDirectory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePathChange = (path: string) => {
    setDirectory(path);
    setError(null);
  };

  const handleNext = () => {
    if (!directory.trim()) {
      setError('Please enter the project directory path');
      return;
    }
    onSelect(directory.trim());
    onNext();
  };

  return (
    <div className="glass-panel-strong rounded-3xl p-8 shadow-2xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm">Back</span>
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <FolderOpen className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ink">
            Project Directory
          </h2>
          <p className="text-sm text-muted">Where is your LinkedIn Post repo cloned?</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Absolute path to project root
          </label>
          <input
            type="text"
            value={directory}
            onChange={(e) => handlePathChange(e.target.value)}
            placeholder="/Users/you/Documents/LinkedInPost"
            className="w-full rounded-xl border border-border bg-white px-4 py-3 font-mono text-sm text-ink placeholder:text-muted/50 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="rounded-xl border border-violet-200/50 bg-violet-50/50 p-4 space-y-2">
          <p className="text-sm font-medium text-ink">How to find the path</p>
          <ul className="text-sm text-muted space-y-1 list-disc list-inside">
            <li>Open Terminal and <code className="rounded bg-violet-100 px-1 text-violet-700">cd</code> into the project folder</li>
            <li>Run <code className="rounded bg-violet-100 px-1 text-violet-700">pwd</code> and paste the output here</li>
          </ul>
          <p className="text-xs text-muted pt-1">
            The folder should contain <code className="rounded bg-violet-100 px-1 text-violet-700">frontend/</code>, <code className="rounded bg-violet-100 px-1 text-violet-700">worker/</code>, and other project files.
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleNext}
          disabled={!directory.trim()}
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}