import { useState, useRef } from 'react';
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import {
  Sparkles,
  Globe,
  Sheet,
  Newspaper,
  LayoutDashboard,
  GitCompare,
  CheckCircle2,
  Star,
  ChevronRight,
  Play,
  ArrowRight,
  Zap,
  Users,
  BarChart3,
  Activity,
} from 'lucide-react';
import { BackendApi } from '../../services/backendApi';
import { GoogleLoginButton } from '../../components/GoogleLoginButton';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

const api = new BackendApi();

interface LandingProps {
  onLogin: (token: string) => void;
}

// ── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay, ease: 'easeOut' as const },
});

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function FloatingOrb({ className }: { className: string }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={
        prefersReducedMotion
          ? {}
          : { y: [0, -24, 0], x: [0, 12, 0] }
      }
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' as const }}
      style={{ willChange: 'transform' }}
    />
  );
}

function PipelineCard() {
  const prefersReducedMotion = useReducedMotion();
  const steps = [
    { label: 'Topic', sublabel: 'AI Research' },
    { label: 'AI Draft', sublabel: 'Gemini / Grok' },
    { label: 'Review', sublabel: 'Side-by-side' },
    { label: 'Published', sublabel: 'All channels' },
  ];
  return (
    <div className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl shadow-xl p-5 w-full max-w-xs">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Content Pipeline
      </div>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.3, duration: 0.4 }}
            className="flex items-center gap-3 rounded-xl bg-white/60 border border-white/40 px-3 py-2.5"
            style={{ willChange: 'transform' }}
          >
            <motion.div
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + i * 0.3, type: 'spring', stiffness: 300 }}
            >
              <CheckCircle2 size={16} className="text-violet-500 shrink-0" />
            </motion.div>
            <div>
              <div className="text-xs font-semibold text-slate-800">{step.label}</div>
              <div className="text-[10px] text-slate-400">{step.sublabel}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CounterStat({
  end,
  suffix,
  label,
  decimals = 0,
}: {
  end: number;
  suffix: string;
  label: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const { scrollYProgress } = useScroll({ target: ref });
  const count = useTransform(scrollYProgress, [0, 1], [0, end]);
  const prefersReducedMotion = useReducedMotion();

  const [displayVal, setDisplayVal] = useState(prefersReducedMotion ? end : 0);

  // Animate count when in view
  useState(() => {
    if (!inView || prefersReducedMotion) return;
  });

  return (
    <div ref={ref} className="text-center">
      <motion.div
        className="text-3xl md:text-4xl font-bold text-white"
        onViewportEnter={() => {
          if (prefersReducedMotion) {
            setDisplayVal(end);
            return;
          }
          const start = performance.now();
          const duration = 1500;
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayVal(Math.round(eased * end * Math.pow(10, decimals)) / Math.pow(10, decimals));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }}
      >
        {displayVal.toFixed(decimals)}
        {suffix}
      </motion.div>
      <div className="mt-1 text-sm text-violet-100">{label}</div>
      {/* suppress unused warning */}
      <div className="hidden">{count.get()}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Landing({ onLogin }: LandingProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.submitWaitlist(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Hero word animation
  const heroWords = ['Your', 'content', 'pipeline,', 'fully', 'automated'];

  const features = [
    {
      icon: <Sparkles size={22} />,
      title: 'AI Draft Generation',
      description: 'Generate variants for any topic using Gemini or Grok — multiple tones, formats, and lengths.',
    },
    {
      icon: <Globe size={22} />,
      title: 'Multi-Channel Publishing',
      description: 'Publish to LinkedIn, Instagram, Telegram, and WhatsApp simultaneously with one click.',
    },
    {
      icon: <Sheet size={22} />,
      title: 'Google Sheets Integration',
      description: 'Manage your content queue in a spreadsheet your team already knows and loves.',
    },
    {
      icon: <Newspaper size={22} />,
      title: 'News Research',
      description: 'Auto-research trending topics with SerpApi integration to keep your content fresh.',
    },
    {
      icon: <LayoutDashboard size={22} />,
      title: 'Campaign Manager',
      description: 'Import bulk topics and manage large content campaigns effortlessly from one dashboard.',
    },
    {
      icon: <GitCompare size={22} />,
      title: 'Review & Approval',
      description: 'Compare draft variants side-by-side before anything goes live on your channels.',
    },
  ];

  const steps = [
    {
      number: '01',
      icon: <Zap size={24} />,
      title: 'Add Your Topic',
      description:
        'Drop your idea into the shared Google Sheet or directly via the dashboard. No setup required.',
    },
    {
      number: '02',
      icon: <Sparkles size={24} />,
      title: 'AI Generates Drafts',
      description:
        'Linked researches, writes, and formats multiple variants for you to review and refine.',
    },
    {
      number: '03',
      icon: <CheckCircle2 size={24} />,
      title: 'Review & Publish',
      description:
        'Approve the best draft and publish to all your channels with one click. Done.',
    },
  ];

  const testimonials = [
    {
      quote:
        'Linked cut our content production time by 80%. We went from 2 posts/week to 15.',
      name: 'Sarah K.',
      role: 'Head of Marketing',
      company: 'TechFlow',
      initial: 'S',
    },
    {
      quote:
        'The AI drafts are incredibly good. It understands our brand voice after seeing just a few examples.',
      name: 'Marcus R.',
      role: 'Founder',
      company: 'GrowthLab',
      initial: 'M',
    },
    {
      quote:
        'Publishing to LinkedIn and Instagram at once is a game-changer. The whole team loves it.',
      name: 'Priya M.',
      role: 'Content Director',
      company: 'ScaleUp',
      initial: 'P',
    },
  ];

  const pricing = [
    {
      name: 'Starter',
      price: '$29',
      period: '/mo',
      features: ['5 channels', '100 AI drafts/mo', 'Google Sheets sync', 'Email support'],
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$79',
      period: '/mo',
      features: [
        'Unlimited channels',
        '1,000 AI drafts/mo',
        'Campaign Manager',
        'News Research',
        'Priority support',
      ],
      highlighted: true,
    },
    {
      name: 'Team',
      price: '$199',
      period: '/mo',
      features: [
        'Everything in Pro',
        'Unlimited AI drafts',
        'Team workspaces',
        'Custom brand voice',
        'Dedicated CSM',
      ],
      highlighted: false,
    },
  ];

  const logos = [
    'Accenture',
    'HubSpot',
    'Notion',
    'Buffer',
    'Hootsuite',
    'Accenture',
    'HubSpot',
    'Notion',
    'Buffer',
    'Hootsuite',
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <MarketingNav />

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-16 px-4 overflow-hidden">
        {/* Background orbs */}
        <FloatingOrb className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
        <FloatingOrb className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl w-full">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: copy */}
            <div className="flex flex-col items-start gap-6">
              {/* Badge */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/80 px-3 py-1.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
                </span>
                <span className="text-xs font-medium text-violet-700">
                  New: Campaign Manager is here
                </span>
                <ArrowRight size={12} className="text-violet-500" />
              </motion.div>

              {/* H1 — staggered words */}
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl leading-tight">
                {heroWords.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: 'easeOut' as const }}
                    className="inline-block mr-3"
                    style={{ willChange: 'transform' }}
                  >
                    {word}
                  </motion.span>
                ))}
              </h1>

              {/* Subtext */}
              <motion.p
                {...fadeUp(0.6)}
                className="text-lg text-slate-600 leading-relaxed max-w-lg"
              >
                Linked turns your ideas into polished posts and publishes them across
                LinkedIn, Instagram, Telegram, and WhatsApp — all from one dashboard.
              </motion.p>

              {/* CTAs */}
              <motion.div {...fadeUp(0.75)} className="flex flex-wrap gap-3">
                <a
                  href="#waitlist"
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-violet-500/40"
                >
                  Start for free
                  <ChevronRight size={16} />
                </a>
                <button className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/60 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-white/90 hover:shadow-md">
                  <Play size={14} className="text-violet-600" />
                  Watch demo
                </button>
              </motion.div>

              {/* Social proof */}
              <motion.div {...fadeUp(0.9)} className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['A', 'B', 'C', 'D', 'E'].map((letter, i) => (
                    <div
                      key={letter}
                      className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                      style={{ zIndex: 5 - i }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className="fill-orange-400 text-orange-400" />
                  ))}
                  <span className="ml-1.5 text-sm text-slate-600">
                    Join <span className="font-semibold text-slate-800">2,400+</span> content creators
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right: floating pipeline card */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex justify-center lg:justify-end"
              style={{ willChange: 'transform' }}
            >
              <PipelineCard />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 2. TRUST BAR ────────────────────────────────────────────────── */}
      <section className="py-10 px-4 border-y border-white/20 bg-white/20 backdrop-blur-sm overflow-hidden">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
            Trusted by teams at
          </p>
          <div className="relative overflow-hidden">
            <motion.div
              animate={prefersReducedMotion ? {} : { x: ['0%', '-50%'] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' as const }}
              className="flex gap-6 w-max"
            >
              {logos.map((name, i) => (
                <div
                  key={i}
                  className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white/60 px-5 py-2.5 shadow-sm"
                >
                  <span className="text-sm font-semibold text-slate-500">{name}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Everything you need to ship content at scale
            </h2>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">
              One platform to research, write, review, and publish — no context switching required.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                whileHover={prefersReducedMotion ? {} : { y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl shadow-xl p-6 cursor-pointer"
                style={{ willChange: 'transform' }}
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 text-violet-600">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white/20 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              From idea to published in 3 steps
            </h2>
            <p className="mt-3 text-slate-600">
              No complicated setup. Just add a topic and let Linked do the rest.
            </p>
          </motion.div>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Connecting dotted line (desktop only) */}
            <div className="absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] hidden h-px border-t-2 border-dashed border-violet-200 md:block" />

            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                {...fadeUp(i * 0.15)}
                className="relative flex flex-col items-center text-center gap-4"
              >
                {/* Number badge */}
                <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg shadow-violet-500/30">
                  <span className="text-2xl font-bold text-white">{step.number}</span>
                </div>
                <div className="inline-flex items-center gap-2 text-violet-600">
                  {step.icon}
                  <h3 className="font-semibold text-slate-900 text-lg">{step.title}</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. STATS BAR ────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gradient-to-r from-violet-600 to-purple-600">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <CounterStat end={10} suffix="M+" label="Posts Generated" />
            <CounterStat end={2400} suffix="+" label="Active Users" />
            <CounterStat end={6} suffix="" label="Platforms Supported" />
            <CounterStat end={99.9} suffix="%" label="Uptime" decimals={1} />
          </div>
        </div>
      </section>

      {/* ── 6. TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Loved by content teams
            </h2>
            <p className="mt-3 text-slate-600">
              Thousands of creators and marketers use Linked every day.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                {...fadeUp(i * 0.12)}
                whileHover={prefersReducedMotion ? {} : { y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white/70 backdrop-blur-sm border border-white/30 rounded-2xl shadow-xl p-6 flex flex-col gap-4"
                style={{ willChange: 'transform' }}
              >
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-white/40 pt-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
                    {t.initial}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500">
                      {t.role} at {t.company}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. PRICING TEASER ───────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white/20 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-slate-600">
              No hidden fees. Cancel anytime.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {pricing.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...fadeUp(i * 0.1)}
                className={[
                  'relative flex flex-col gap-5 rounded-2xl p-6',
                  plan.highlighted
                    ? 'bg-white/80 backdrop-blur-sm border-2 border-violet-500 shadow-2xl shadow-violet-500/20'
                    : 'bg-white/70 backdrop-blur-sm border border-white/30 shadow-xl',
                ].join(' ')}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-0.5 text-xs font-bold text-white">
                    Most Popular
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-slate-500">{plan.name}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-sm text-slate-400">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={14} className="shrink-0 text-violet-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#waitlist"
                  className={[
                    'cursor-pointer block rounded-xl py-2.5 text-center text-sm font-semibold transition-all',
                    plan.highlighted
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md hover:shadow-violet-500/30'
                      : 'border border-slate-200 bg-white/60 text-slate-700 hover:bg-white/90',
                  ].join(' ')}
                >
                  Get started
                </a>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.3)} className="mt-8 text-center">
            <a
              href="/pricing"
              className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              View full pricing
              <ArrowRight size={14} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── 8. WAITLIST / CTA ───────────────────────────────────────────── */}
      <section id="waitlist" className="py-24 px-4">
        <div className="mx-auto max-w-3xl">
          <motion.div
            {...fadeUp()}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-8 md:p-12 shadow-2xl shadow-violet-500/30"
          >
            {/* Decorative orbs inside card */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

            <div className="relative text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <Users size={14} className="text-violet-200" />
                <span className="text-xs font-medium text-violet-100">
                  2,400+ content creators already inside
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Ready to 10x your content output?
              </h2>
              <p className="mt-3 text-violet-100 max-w-lg mx-auto">
                Join 2,400+ content creators already using Linked to automate their publishing.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 rounded-xl bg-white/20 border border-white/30 px-5 py-3 text-white font-medium"
                    >
                      <CheckCircle2 size={18} />
                      You&apos;re on the list! We&apos;ll email you shortly.
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={handleSubmit}
                      className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
                    >
                      <input
                        type="email"
                        required
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 rounded-xl border border-white/20 bg-white/20 px-4 py-3 text-sm text-white placeholder-violet-200 backdrop-blur-sm outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="cursor-pointer rounded-xl bg-white px-5 py-3 text-sm font-semibold text-violet-700 shadow-md transition-all hover:bg-violet-50 disabled:opacity-60 shrink-0"
                      >
                        {submitting ? 'Joining…' : 'Join waitlist'}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {error && (
                  <p className="text-sm text-red-200">{error}</p>
                )}

                <div className="flex items-center gap-3 w-full max-w-md">
                  <div className="flex-1 border-t border-white/20" />
                  <span className="text-xs text-violet-200">or</span>
                  <div className="flex-1 border-t border-white/20" />
                </div>

                <GoogleLoginButton onLogin={onLogin} />
              </div>

              {/* Mini stats */}
              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
                {[
                  { icon: <Zap size={16} />, label: 'Setup in 2 minutes' },
                  { icon: <BarChart3 size={16} />, label: 'No credit card required' },
                  { icon: <Activity size={16} />, label: 'Cancel anytime' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-1.5 text-violet-100">
                    <div className="text-white">{item.icon}</div>
                    <span className="text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 9. FOOTER ───────────────────────────────────────────────────── */}
      <MarketingFooter />
    </div>
  );
}
