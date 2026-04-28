import { cn } from '@/lib/cn';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onRetry, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          aria-label="Retry"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Retry
        </button>
      )}
    </div>
  );
}
