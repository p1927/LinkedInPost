import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Eye, Zap, BookOpen, ArrowRight, Sparkles, Globe2, Users2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatItem {
  value: string;
  label: string;
  suffix?: string;
}

interface ValueItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  span?: 'wide' | 'normal';
  gradient: string;
}

interface TeamMember {
  initials: string;
  name: string;
  role: string;
  bio: string;
  gradient: string;
  ring: string;
}

interface OpenRole {
  title: string;
  type: string;
}

interface Milestone {
  date: string;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STATS: StatItem[] = [
  { value: '10M+', label: 'Posts created' },
  { value: '2,400+', label: 'Active users' },
  { value: '6', label: 'Platforms' },
  { value: '12', label: 'Team members' },
];

const VALUES: ValueItem[] = [
  {
    icon: <Eye size={24} />,
    title: 'Creators first',
    description:
      'Every product decision starts with the creator\'s workflow. We build features that eliminate friction, not add it. Our users are in the room with us every step of the way.',
    span: 'wide',
    gradient: 'from-violet-500/10 to-purple-500/10',
  },
  {
    icon: <BookOpen size={24} />,
    title: 'Radical transparency',
    description:
      'Open-source core, public roadmap, honest pricing. You deserve to know exactly what you\'re paying for.',
    span: 'normal',
    gradient: 'from-blue-500/10 to-indigo-500/10',
  },
  {
    icon: <Zap size={24} />,
    title: 'Ship fast, learn faster',
    description:
      'We iterate weekly on user feedback. If something isn\'t working, we fix it — and we tell you about it.',
    span: 'normal',
    gradient: 'from-amber-500/10 to-orange-500/10',
  },
];

const TEAM: TeamMember[] = [
  {
    initials: 'PM',
    name: 'Pratyush M.',
    role: 'Founder & CEO',
    bio: 'Background in AI/ML. Previously built content automation tools at scale.',
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-200',
  },
  {
    initials: 'AK',
    name: 'Alex K.',
    role: 'CTO',
    bio: 'Former Google engineer. Led infrastructure for high-throughput data pipelines.',
    gradient: 'from-blue-500 to-indigo-600',
    ring: 'ring-blue-200',
  },
  {
    initials: 'ML',
    name: 'Mia L.',
    role: 'Head of Design',
    bio: 'Ex-Figma designer. Obsessed with making complex workflows feel simple.',
    gradient: 'from-pink-500 to-rose-500',
    ring: 'ring-pink-200',
  },
  {
    initials: 'JT',
    name: 'Jordan T.',
    role: 'Growth Lead',
    bio: 'Ex-HubSpot. Helped scale a SaaS from 0 to 50k users in under two years.',
    gradient: 'from-orange-500 to-amber-500',
    ring: 'ring-orange-200',
  },
];

const MILESTONES: Milestone[] = [
  {
    date: 'Jan 2024',
    title: 'The frustration',
    description: 'Spent 80% of our week formatting the same content for six different platforms.',
  },
  {
    date: 'Mar 2024',
    title: 'First prototype',
    description: 'Hacked together internal scripts to automate the repetitive parts.',
  },
  {
    date: 'Jun 2024',
    title: 'Linked is born',
    description: 'Turned our internal tools into a product after realizing every creator had the same problem.',
  },
  {
    date: 'Now',
    title: '2,400+ creators',
    description: 'Teams around the world use Linked to ship more content with less effort.',
  },
];

const OPEN_ROLES: OpenRole[] = [
  { title: 'Senior Full-Stack Engineer', type: 'Full-time · Remote' },
  { title: 'AI/ML Engineer', type: 'Full-time · Remote' },
  { title: 'Content Marketing Manager', type: 'Full-time · Remote' },
];

// ---------------------------------------------------------------------------
// Floating orb (matches Landing page)
// ---------------------------------------------------------------------------

function FloatingOrb({ className }: { className: string }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      animate={prefersReducedMotion ? undefined : {
        y: [0, -24, 0],
        scale: [1, 1.06, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Shared animation wrapper
// ---------------------------------------------------------------------------

function Reveal({
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
      initial={reduced ? false : { opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// About Page
// ---------------------------------------------------------------------------

export function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] font-sans">
      <MarketingNav />

      <main className="flex-1 overflow-hidden">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="relative flex min-h-[92vh] flex-col items-center justify-center px-4 pt-24 pb-20 text-center">
          {/* Background gradient orbs */}
          <FloatingOrb className="h-[500px] w-[500px] bg-violet-300/25 -top-20 -left-32" />
          <FloatingOrb className="h-[400px] w-[400px] bg-purple-300/20 top-40 -right-28" />
          <FloatingOrb className="h-[300px] w-[300px] bg-indigo-300/20 bottom-10 left-1/4" />

          {/* Dot grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: 'radial-gradient(circle, #7c3aed 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative z-10 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-600 shadow-sm backdrop-blur-sm"
            >
              <Sparkles size={12} />
              Our mission
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
            >
              Every creator
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                deserves a team.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-500 sm:text-xl"
            >
              Linked was built to help solo creators and small teams punch above their weight —
              automating the repetitive parts of content creation so you can focus on making
              great content.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm"
            >
              {[
                { icon: <Sparkles size={13} />, label: 'Founded 2024' },
                { icon: <Globe2 size={13} />, label: 'Fully remote' },
                { icon: <Users2 size={13} />, label: '12-person team' },
              ].map((badge) => (
                <span
                  key={badge.label}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 shadow-sm"
                >
                  <span className="text-violet-500">{badge.icon}</span>
                  {badge.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-5 w-[1px] bg-gradient-to-b from-slate-300 to-transparent mx-auto"
            />
          </motion.div>
        </section>

        {/* ── Stats strip ───────────────────────────────────────── */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 md:grid-cols-4 md:divide-y-0">
              {STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 0.07}>
                  <div className="flex flex-col items-center justify-center px-8 py-10 text-center">
                    <p className="text-4xl font-bold bg-gradient-to-br from-violet-600 to-purple-600 bg-clip-text text-transparent sm:text-5xl">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-500">{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── The Story (timeline) ──────────────────────────────── */}
        <section className="px-4 py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal className="mb-16 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-500">Origin</p>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">How we got here</h2>
            </Reveal>

            <div className="grid gap-16 md:grid-cols-2 md:items-start">
              {/* Left: narrative */}
              <Reveal delay={0.1} className="space-y-6">
                <p className="text-lg leading-relaxed text-slate-600">
                  We built Linked because we were frustrated. As a small team, we spent 80% of our
                  time writing, formatting, and manually publishing the same content across different
                  platforms. We wanted a tool that would do the busywork.
                </p>
                <p className="text-lg leading-relaxed text-slate-600">
                  After months hacking together internal scripts, we realized other creators faced
                  the same problem. So we turned our tooling into a proper product — one that anyone
                  can use, no engineering degree required.
                </p>
                <blockquote className="border-l-2 border-violet-400 pl-5 italic text-slate-500">
                  "We didn't set out to build a startup. We set out to reclaim our Tuesdays."
                </blockquote>
              </Reveal>

              {/* Right: timeline */}
              <Reveal delay={0.2}>
                <div className="relative space-y-0 pl-8">
                  {/* Vertical line */}
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-violet-300 via-purple-200 to-transparent" />

                  {MILESTONES.map((m, i) => (
                    <div key={m.date} className="relative pb-10 last:pb-0">
                      {/* Dot */}
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                        className="absolute -left-5 top-1 h-4 w-4 rounded-full border-2 border-violet-400 bg-white shadow-sm"
                      />
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-500">
                        {m.date}
                      </p>
                      <p className="font-semibold text-slate-900">{m.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{m.description}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Our Values (bento grid) ───────────────────────────── */}
        <section className="bg-white px-4 py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal className="mb-16 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-500">What we believe</p>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Our values</h2>
            </Reveal>

            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VALUES.map((v, i) => (
                <Reveal
                  key={v.title}
                  delay={i * 0.1}
                  className={v.span === 'wide' ? 'sm:col-span-2 lg:col-span-1 lg:row-span-2' : ''}
                >
                  <motion.div
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className={`group flex h-full flex-col rounded-2xl border border-slate-100 bg-gradient-to-br ${v.gradient} p-7 transition-shadow hover:shadow-lg hover:shadow-violet-100`}
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-100 transition-transform group-hover:scale-110">
                      {v.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{v.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{v.description}</p>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── The Team ──────────────────────────────────────────── */}
        <section className="px-4 py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal className="mb-16 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-500">Who we are</p>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">The team</h2>
              <p className="mt-3 text-slate-500">Small by design. Fast by necessity.</p>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2">
              {TEAM.map((member, i) => (
                <Reveal key={member.name} delay={i * 0.09}>
                  <motion.div
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-slate-200/60`}
                  >
                    {/* Gradient top bar */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${member.gradient}`} />
                    <div className="flex gap-4 p-6">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${member.gradient} text-sm font-bold text-white ring-4 ${member.ring} shadow-sm`}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="text-xs font-semibold text-violet-600">{member.role}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">{member.bio}</p>
                      </div>
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Careers (dark gradient) ───────────────────────────── */}
        <section className="px-4 py-6 pb-28">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 shadow-2xl">
                {/* Subtle inner glow */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />

                <div className="relative px-8 py-12 text-white sm:px-12">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-400">
                    We're hiring
                  </p>
                  <h2 className="text-3xl font-bold sm:text-4xl">Join our remote team</h2>
                  <p className="mt-4 max-w-lg text-slate-300 leading-relaxed">
                    A small, high-output team that moves fast and trusts each other. If you care
                    deeply about creators and love building great software, we want to hear from you.
                  </p>

                  {/* Roles */}
                  <div className="mt-10 space-y-3">
                    {OPEN_ROLES.map((role) => (
                      <motion.div
                        key={role.title}
                        whileHover={{ x: 4 }}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition-colors hover:border-violet-400/40 hover:bg-white/10"
                      >
                        <div>
                          <p className="font-semibold text-white">{role.title}</p>
                          <p className="text-xs text-slate-400">{role.type}</p>
                        </div>
                        <ArrowRight size={16} className="shrink-0 text-violet-400" />
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Link
                      to="/careers"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all hover:from-violet-400 hover:to-purple-400 hover:shadow-violet-900/60"
                    >
                      View all open positions
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="px-4 pb-28 text-center">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                Ready to start creating?
              </h2>
              <p className="mt-4 text-lg text-slate-500">
                Join 2,400+ creators who ship more with less effort.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-300/40 transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-violet-300/60"
                >
                  Get started for free
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-violet-300 hover:text-violet-700"
                >
                  View pricing
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
