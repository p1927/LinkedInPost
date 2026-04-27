import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

export function MarketingNav() {
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 16);
      if (currentY > lastScrollY && currentY > 80) {
        setVisible(false);
        setMobileOpen(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navLinks = [
    { label: 'Features', href: '#features', external: false, anchor: true },
    { label: 'Pricing', href: '/pricing', external: false, anchor: false },
    { label: 'About', href: '/about', external: false, anchor: false },
  ];

  return (
    <motion.header
      initial={prefersReducedMotion ? false : { y: -80, opacity: 0 }}
      animate={{
        y: visible ? 0 : -100,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
      className="fixed inset-x-4 top-3 z-50 mx-auto max-w-6xl"
    >
      <div
        className={[
          'rounded-2xl border transition-all duration-300',
          scrolled
            ? 'border-white/30 bg-white/85 shadow-lg shadow-violet-900/10 backdrop-blur-md'
            : 'border-white/20 bg-white/40 backdrop-blur-sm',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 py-3">
          {/* Logo */}
          <Link
            to="/"
            className="cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
          >
            <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              Linked
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) =>
              link.anchor ? (
                <a
                  key={link.label}
                  href={link.href}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* CTA */}
          <div className="hidden items-center gap-2 md:flex">
            <a
              href="#cta"
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
            >
              Sign in
            </a>
            <a
              href="#cta"
              className="cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
            >
              Get Started
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="cursor-pointer rounded-lg p-2 text-gray-600 transition-colors hover:bg-violet-50 hover:text-violet-700 md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile slide-down panel */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-menu"
              initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-white/30 md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {navLinks.map((link) =>
                  link.anchor ? (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
                    >
                      {link.label}
                    </Link>
                  )
                )}
                <div className="mt-2 border-t border-white/30 pt-2 flex flex-col gap-2">
                  <a
                    href="#cta"
                    onClick={() => setMobileOpen(false)}
                    className="block cursor-pointer rounded-lg px-4 py-2.5 text-center text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
                  >
                    Sign in
                  </a>
                  <a
                    href="#cta"
                    onClick={() => setMobileOpen(false)}
                    className="block cursor-pointer rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-700 hover:to-purple-700"
                  >
                    Get Started
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
