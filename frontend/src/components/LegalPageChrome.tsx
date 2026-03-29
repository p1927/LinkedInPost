import { Link } from 'react-router-dom';

export function LegalPageChrome({ title }: { title: string }) {
  return (
    <header className="glass-header w-full border-b px-4 py-3.5 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 rounded-lg outline-none ring-primary/35 focus-visible:ring-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary font-heading text-sm font-semibold text-primary-fg">
            CB
          </div>
          <div>
            <span className="font-heading text-lg font-semibold text-ink">Channel Bot</span>
            <span className="sr-only"> — home</span>
          </div>
        </Link>
        <p className="text-sm font-medium text-muted">{title}</p>
      </div>
    </header>
  );
}
