import { Link } from 'react-router-dom';

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5V24H0V8zm7.75 0h4.79v2.19h.07C13.37 8.9 15.18 8 17.22 8 21.98 8 24 11.06 24 15.47V24h-5v-7.59c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4V24h-5V8z"/>
    </svg>
  );
}

export function LegalPageChrome({ title }: { title: string }) {
  return (
    <header className="glass-header w-full border-b px-4 py-3.5 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 rounded-lg outline-none ring-primary/35 focus-visible:ring-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A66C2] text-white">
            <LinkedInIcon className="h-5 w-5" />
          </div>
          <div>
            <span className="font-heading text-lg font-semibold text-ink">LinkedIn Post</span>
            <span className="sr-only"> — home</span>
          </div>
        </Link>
        <p className="text-sm font-medium text-muted">{title}</p>
      </div>
    </header>
  );
}
