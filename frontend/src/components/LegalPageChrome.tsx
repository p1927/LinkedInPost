import { Link } from 'react-router-dom';

export function LegalPageChrome({ title }: { title: string }) {
  return (
    <header className="glass-header w-full border-b px-4 py-3.5 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
        <Link to="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50">
          <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            Linked
          </span>
          <span className="sr-only"> — home</span>
        </Link>
        <p className="text-sm font-medium text-muted">{title}</p>
      </div>
    </header>
  );
}
