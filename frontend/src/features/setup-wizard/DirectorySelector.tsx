import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

interface DirectorySelectorProps {
  onSelect: (directory: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DirectorySelector({ onSelect, onBack, onNext }: DirectorySelectorProps) {
  const [directory, setDirectory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.capture = 'filesystem';

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const path = files[0].webkitRelativePath.split('/')[0];
        setDirectory(path || '.');
      }
    };

    input.click();
  };

  const handlePathChange = (path: string) => {
    setDirectory(path);
    setError(null);
  };

  const handleNext = () => {
    if (!directory.trim()) {
      setError('Please select a directory');
      return;
    }
    onSelect(directory);
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

      <h2 className="font-heading text-2xl font-semibold text-ink mb-2">
        Choose Installation Directory
      </h2>
      <p className="text-muted mb-8">
        Select where LinkedIn Post is installed on your computer.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Project Directory
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={directory}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder="/path/to/your/project"
              className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-ink placeholder:text-muted/50 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
            <button
              onClick={handleBrowse}
              className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-ink hover:bg-muted/50 transition-colors"
            >
              Browse
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="rounded-xl border border-violet-200/50 bg-violet-50/50 p-4">
          <p className="text-sm text-muted">
            <strong className="text-ink">Tip:</strong> The directory should be the root of the LinkedIn Post project
            containing frontend/, worker/, and other project files.
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