import { useState } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { Check, ChevronDown, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanFeature {
  text: string;
}

interface Plan {
  name: string;
  tag: string;
  monthlyPrice: number;
  annualPrice: number;
  highlighted: boolean;
  badge?: string;
  features: PlanFeature[];
  cta: string;
  ctaStyle: 'outline' | 'primary' | 'dark';
}

interface ComparisonRow {
  label: string;
  starter: string | boolean;
  pro: string | boolean;
  team: string | boolean;
}

interface ComparisonCategory {
  category: string;
  rows: ComparisonRow[];
}

interface FaqItem {
  question: string;
  answer: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PLANS: Plan[] = [
  {
    name: 'Starter',
    tag: 'Perfect for solo creators',
    monthlyPrice: 29,
    annualPrice: 23,
    highlighted: false,
    features: [
      { text: '50 AI-generated posts/month' },
      { text: 'LinkedIn + Instagram publishing' },
      { text: 'Google Sheets integration' },
      { text: '3 content flows' },
      { text: 'Email support' },
    ],
    cta: 'Get started',
    ctaStyle: 'outline',
  },
  {
    name: 'Pro',
    tag: 'For growing teams',
    monthlyPrice: 79,
    annualPrice: 63,
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { text: '200 AI-generated posts/month' },
      { text: 'All platforms (LinkedIn, Instagram, Telegram, WhatsApp, YouTube)' },
      { text: 'Advanced AI models (Gemini Pro, Grok)' },
      { text: 'News research & trending topics' },
      { text: 'Campaign manager' },
      { text: 'Priority support' },
      { text: 'Analytics dashboard' },
    ],
    cta: 'Start free trial',
    ctaStyle: 'primary',
  },
  {
    name: 'Team',
    tag: 'For agencies & large teams',
    monthlyPrice: 199,
    annualPrice: 159,
    highlighted: false,
    features: [
      { text: 'Unlimited AI-generated posts' },
      { text: 'Everything in Pro' },
      { text: '10 team seats' },
      { text: 'Custom brand voices' },
      { text: 'Dedicated account manager' },
      { text: 'SLA + 24/7 support' },
      { text: 'Custom integrations' },
    ],
    cta: 'Contact sales',
    ctaStyle: 'dark',
  },
];

const COMPARISON: ComparisonCategory[] = [
  {
    category: 'Content Generation',
    rows: [
      { label: 'Posts/month', starter: '50', pro: '200', team: 'Unlimited' },
      { label: 'AI models', starter: 'Standard', pro: 'Gemini Pro, Grok', team: 'All models' },
      { label: 'Draft variants', starter: '2', pro: '5', team: 'Unlimited' },
      { label: 'Brand voice', starter: false, pro: true, team: 'Custom' },
    ],
  },
  {
    category: 'Publishing',
    rows: [
      { label: 'Platforms', starter: 'LinkedIn, Instagram', pro: 'All 5 platforms', team: 'All platforms + custom' },
      { label: 'Bulk schedule', starter: false, pro: true, team: true },
      { label: 'Campaign manager', starter: false, pro: true, team: true },
    ],
  },
  {
    category: 'Integrations',
    rows: [
      { label: 'Google Sheets', starter: true, pro: true, team: true },
      { label: 'News research', starter: false, pro: true, team: true },
      { label: 'Custom webhooks', starter: false, pro: false, team: true },
    ],
  },
  {
    category: 'Support',
    rows: [
      { label: 'Type', starter: 'Email', pro: 'Priority email', team: 'Dedicated manager' },
      { label: 'Response time', starter: '48 hours', pro: '8 hours', team: '1 hour' },
      { label: 'Onboarding', starter: false, pro: 'Self-serve', team: 'Guided' },
    ],
  },
];

const FAQS: FaqItem[] = [
  {
    question: 'Can I switch plans later?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and we prorate any billing differences.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'The Pro plan comes with a 14-day free trial — no credit card required. You get full access to all Pro features during the trial period.',
  },
  {
    question: 'What happens when I hit my post limit?',
    answer:
      "Once you reach your monthly post limit, new AI generation will pause until the next billing cycle resets your quota. You can upgrade your plan at any time to generate more posts immediately.",
  },
  {
    question: 'Do you offer refunds?',
    answer:
      "We offer a 30-day money-back guarantee. If you're not satisfied within 30 days of your first payment, contact us and we'll refund you in full — no questions asked.",
  },
  {
    question: 'Can I self-host instead?',
    answer:
      "Yes. Linked has an open-source self-hosted version available on GitHub. You get the full core feature set with no monthly fees — you just manage your own infrastructure and API keys.",
  },
];

// ---------------------------------------------------------------------------
// Small shared components
// ---------------------------------------------------------------------------

function SectionReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="flex justify-center">
        <Check size={16} className="text-violet-600" />
      </span>
    );
  }
  if (value === false) {
    return <span className="flex justify-center text-slate-300">—</span>;
  }
  return <span>{value as string}</span>;
}

// ---------------------------------------------------------------------------
// Pricing card
// ---------------------------------------------------------------------------

function PricingCard({ plan, annual }: { plan: Plan; annual: boolean }) {
  const reduced = useReducedMotion();
  const price = annual ? plan.annualPrice : plan.monthlyPrice;

  const ctaClass =
    plan.ctaStyle === 'primary'
      ? 'w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-violet-700 hover:to-purple-700'
      : plan.ctaStyle === 'dark'
        ? 'w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800'
        : 'w-full rounded-xl border border-violet-300 px-5 py-3 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50';

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className={[
        'relative flex flex-col rounded-2xl p-8 shadow-xl overflow-visible',
        plan.highlighted
          ? 'border-2 border-violet-500 bg-white/80 backdrop-blur-sm'
          : 'border border-white/30 bg-white/70 backdrop-blur-sm',
      ].join(' ')}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-0.5 text-xs font-semibold text-white shadow">
          {plan.badge}
        </span>
      )}

      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">{plan.name}</p>
        <p className="mt-0.5 text-sm text-slate-500">{plan.tag}</p>
      </div>

      <div className="mb-6 min-h-[5rem] overflow-visible">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${plan.name}-${annual ? 'annual' : 'monthly'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-5xl font-bold leading-none text-slate-900">${price}</span>
            <span className="ml-1 text-sm text-slate-500">/mo</span>
            {annual && (
              <p className="mt-1 text-xs text-slate-400">billed annually</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className="mb-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f.text} className="flex items-start gap-3 text-sm text-slate-700">
            <Check size={15} className="mt-0.5 shrink-0 text-violet-500" />
            <span>{f.text}</span>
          </li>
        ))}
      </ul>

      <Link to="/landing" className={ctaClass + ' text-center'}>
        {plan.cta}
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// FAQ accordion item
// ---------------------------------------------------------------------------

function FaqItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-900">{item.question}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="shrink-0 text-slate-400"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <MarketingNav />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="pt-32 pb-16 text-center px-4">
          <SectionReveal>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Pricing that{' '}
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                scales with you
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </SectionReveal>

          {/* Toggle */}
          <SectionReveal delay={0.1} className="mt-8 flex justify-center">
            <div className="relative flex items-center gap-1 rounded-xl border border-white/30 bg-white/60 backdrop-blur-sm p-1 shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className={[
                  'relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  !annual ? 'text-white' : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={[
                  'relative z-10 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  annual ? 'text-white' : 'text-slate-600 hover:text-slate-900',
                ].join(' ')}
              >
                Annual
                <span className="whitespace-nowrap rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white leading-none">
                  SAVE 20%
                </span>
              </button>

              {/* sliding pill */}
              <AnimatePresence initial={false}>
                <motion.div
                  key={annual ? 'annual' : 'monthly'}
                  layoutId="billing-pill"
                  className="absolute inset-y-1 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 shadow"
                  style={{
                    left: annual ? 'calc(50% + 2px)' : '4px',
                    right: annual ? '4px' : 'calc(50% + 2px)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              </AnimatePresence>
            </div>
          </SectionReveal>
        </section>

        {/* ── Pricing Cards ─────────────────────────────────── */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 md:grid-cols-3">
              {PLANS.map((plan, i) => (
                <SectionReveal key={plan.name} delay={i * 0.1}>
                  <PricingCard plan={plan} annual={annual} />
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature Comparison ────────────────────────────── */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-5xl">
            <SectionReveal className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Full feature comparison</h2>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="overflow-x-auto rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm shadow-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 pl-6 pr-4 text-left font-semibold text-slate-900">Feature</th>
                      {PLANS.map((p) => (
                        <th
                          key={p.name}
                          className={[
                            'py-4 px-4 text-center font-semibold',
                            p.highlighted ? 'text-violet-700' : 'text-slate-900',
                          ].join(' ')}
                        >
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((cat) => (
                      <>
                        <tr key={`cat-${cat.category}`} className="bg-slate-50/60">
                          <td
                            colSpan={4}
                            className="py-2.5 pl-6 text-xs font-semibold uppercase tracking-wider text-slate-400"
                          >
                            {cat.category}
                          </td>
                        </tr>
                        {cat.rows.map((row) => (
                          <tr key={row.label} className="border-t border-slate-50 hover:bg-violet-50/30 transition-colors">
                            <td className="py-3 pl-6 pr-4 text-slate-700">{row.label}</td>
                            <td className="py-3 px-4 text-center text-slate-600">
                              <CellValue value={row.starter} />
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600">
                              <CellValue value={row.pro} />
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600">
                              <CellValue value={row.team} />
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────── */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-2xl">
            <SectionReveal className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Frequently asked questions</h2>
            </SectionReveal>

            <div className="space-y-3">
              {FAQS.map((item, i) => (
                <SectionReveal key={item.question} delay={i * 0.05}>
                  <FaqItem item={item} />
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="pb-24 px-4">
          <SectionReveal>
            <div className="mx-auto max-w-2xl rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm shadow-xl px-8 py-12 text-center">
              <h2 className="text-2xl font-bold text-slate-900">Still have questions?</h2>
              <p className="mt-3 text-slate-600">
                Our team is happy to help. Reach out to{' '}
                <a
                  href="mailto:support@linked.app"
                  className="font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                  support@linked.app
                </a>{' '}
                or talk to sales about the Team plan.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a
                  href="mailto:support@linked.app"
                  className="flex items-center gap-2 rounded-xl border border-violet-300 px-5 py-2.5 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-50"
                >
                  <Mail size={15} />
                  Email support
                </a>
                <Link
                  to="/landing"
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                >
                  Talk to sales
                </Link>
              </div>
            </div>
          </SectionReveal>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
