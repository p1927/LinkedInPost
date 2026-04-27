import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

function LinkedInIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function TwitterXIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features', anchor: true },
      { label: 'Pricing', href: '/pricing', anchor: false },
      { label: 'Changelog', href: '#changelog', anchor: true },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about', anchor: false },
      { label: 'Blog', href: '#blog', anchor: true },
      { label: 'Careers', href: '#careers', anchor: true },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', href: '/terms', anchor: false },
      { label: 'Privacy', href: '/privacy-policy', anchor: false },
    ],
  },
];

const socialLinks = [
  { label: 'LinkedIn', href: 'https://linkedin.com', Icon: LinkedInIcon },
  { label: 'Twitter / X', href: 'https://x.com', Icon: TwitterXIcon },
  { label: 'GitHub', href: 'https://github.com', Icon: GitHubIcon },
];

export function MarketingFooter() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.footer
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: 'easeOut' }}
      className="bg-gradient-to-br from-violet-950 via-purple-950 to-violet-950 text-white"
    >
      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Top section: logo + tagline + columns */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 md:grid-cols-5">
          {/* Logo + tagline — spans 2 cols on md */}
          <div className="col-span-2 flex flex-col gap-3 md:col-span-2">
            <Link
              to="/"
              className="w-fit cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            >
              <span className="bg-gradient-to-r from-violet-300 to-purple-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                Linked
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-violet-300/80">
              AI-powered content for every channel
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                {col.heading}
              </h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.anchor ? (
                      <a
                        href={link.href}
                        className="cursor-pointer text-sm text-violet-200/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="cursor-pointer text-sm text-violet-200/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social icons row */}
        <div className="mt-12 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
            Social
          </span>
          <div className="flex gap-2">
            {socialLinks.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="cursor-pointer rounded-lg border border-violet-700/50 bg-violet-900/40 p-2 text-violet-300 transition-all hover:border-violet-500/70 hover:bg-violet-800/60 hover:text-white"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-violet-800/50" />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-violet-400/70 sm:flex-row">
          <span>&copy; 2025 Linked. All rights reserved.</span>
          <span>Made with &#9825; for content creators</span>
        </div>
      </div>
    </motion.footer>
  );
}
