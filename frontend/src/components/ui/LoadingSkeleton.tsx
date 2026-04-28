import { cn } from '@/lib/cn';

type SkeletonVariant = 'card' | 'list' | 'line';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
}

function CardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-white/40 bg-white/30 p-3 animate-pulse">
      <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-200/60" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-3/4 rounded bg-gray-200/60" />
        <div className="h-3 w-1/2 rounded bg-gray-200/60" />
        <div className="h-2 w-1/3 rounded bg-gray-200/60" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="h-4 w-4 shrink-0 rounded bg-gray-200/60" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-gray-200/60" />
        <div className="h-2 w-1/2 rounded bg-gray-200/60" />
      </div>
    </div>
  );
}

function LineSkeleton() {
  return <div className="h-3 w-full rounded bg-gray-200/60 animate-pulse" />;
}

export function LoadingSkeleton({ variant = 'card', count = 3, className }: LoadingSkeletonProps) {
  const items = Array.from({ length: count });
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((_, i) => {
        if (variant === 'card') return <CardSkeleton key={i} />;
        if (variant === 'list') return <ListSkeleton key={i} />;
        return <LineSkeleton key={i} />;
      })}
    </div>
  );
}
