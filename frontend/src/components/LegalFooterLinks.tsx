import { Link } from 'react-router-dom';

export function LegalFooterLinks({ className = '' }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted ${className}`.trim()}
    >
      <Link to="/terms" className="underline decoration-border underline-offset-2 hover:text-ink">
        Terms of Service
      </Link>
      <span className="text-border" aria-hidden>
        ·
      </span>
      <Link to="/privacy-policy" className="underline decoration-border underline-offset-2 hover:text-ink">
        Privacy Policy
      </Link>
    </nav>
  );
}
