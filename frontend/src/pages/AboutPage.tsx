import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Eye, Zap, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatItem {
  value: string;
  label: string;
}

interface ValueItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface TeamMember {
  initials: string;
  name: string;
  role: string;
  bio: string;
  color: string;
}

interface OpenRole {
  title: string;
  type: string;
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
    icon: <Eye size={22} className="text-violet-600" />,
    title: 'Creators first',
    description:
      'Every product decision starts with the creator\'s workflow. We build features that eliminate friction, not add it.',
  },
  {
    icon: <BookOpen size={22} className="text-violet-600" />,
    title: 'Radical transparency',
    description:
      'Open-source core, public roadmap, honest pricing. We believe you deserve to know exactly what you\'re paying for.',
  },
  {
    icon: <Zap size={22} className="text-violet-600" />,
    title: 'Ship fast, learn faster',
    description:
      'We iterate weekly based on user feedback. If something isn\'t working, we fix it — and we tell you about it.',
  },
];

const TEAM: TeamMember[] = [
  {
    initials: 'PM',
    name: 'Pratyush M.',
    role: 'Founder & CEO',
    bio: 'Background in AI/ML. Previously built content automation tools at scale.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    initials: 'AK',
    name: 'Alex K.',
    role: 'CTO',
    bio: 'Former Google engineer. Led infrastructure for high-throughput data pipelines.',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    initials: 'ML',
    name: 'Mia L.',
    role: 'Head of Design',
    bio: 'Ex-Figma designer. Obsessed with making complex workflows feel simple.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    initials: 'JT',
    name: 'Jordan T.',
    role: 'Growth Lead',
    bio: 'Ex-HubSpot. Helped scale a SaaS from 0 to 50k users in under two years.',
    color: 'from-orange-500 to-amber-500',
  },
];

const OPEN_ROLES: OpenRole[] = [
  { title: 'Senior Full-Stack Engineer', type: 'Full-time · Remote' },
  { title: 'AI/ML Engineer', type: 'Full-time · Remote' },
  { title: 'Content Marketing Manager', type: 'Full-time · Remote' },
];

// ---------------------------------------------------------------------------
// Shared animation wrapper
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

// ---------------------------------------------------------------------------
// Team card
// ---------------------------------------------------------------------------

function TeamCard({ member }: { member: TeamMember }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className="flex flex-col gap-4 rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm p-6 shadow-xl"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${member.color} text-sm font-bold text-white shadow-sm`}
      >
        {member.initials}
      </div>
      <div>
        <p className="font-semibold text-slate-900">{member.name}</p>
        <p className="text-xs font-medium text-violet-600">{member.role}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{member.bio}</p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <MarketingNav />

      <main className="flex-1">
        {/* ── Mission Hero ──────────────────────────────────── */}
        <section className="pt-32 pb-20 px-4 text-center">
          <SectionReveal>
            <p className="mx-auto max-w-2xl text-3xl font-bold italic leading-snug text-slate-900 sm:text-4xl">
              "We believe every creator deserves a team."
            </p>
          </SectionReveal>
          <SectionReveal delay={0.15} className="mx-auto mt-6 max-w-2xl">
            <p className="text-lg leading-relaxed text-slate-600">
              Channel Bot was built to help solo creators and small teams punch above their weight by
              automating the repetitive parts of content creation — so you can spend your energy on
              what actually matters: making great content.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/60 px-3 py-1.5 backdrop-blur-sm shadow-sm">
                Founded 2024
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/60 px-3 py-1.5 backdrop-blur-sm shadow-sm">
                Remote team
              </span>
            </div>
          </SectionReveal>
        </section>

        {/* ── The Story ─────────────────────────────────────── */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-5xl">
            <SectionReveal className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">The story</h2>
            </SectionReveal>

            <div className="grid gap-8 md:grid-cols-2 md:items-start">
              <SectionReveal delay={0.1}>
                <p className="text-base leading-relaxed text-slate-600">
                  We built Channel Bot because we were frustrated. As a small team, we spent 80% of
                  our time writing, formatting, and manually publishing the same content to different
                  platforms. We wanted a tool that would do the busywork so we could focus on what
                  matters: creating great content.
                </p>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  After months of hacking together internal scripts and spreadsheets, we realized
                  other creators had the same problem. So we turned our internal tools into Channel
                  Bot — a proper product that anyone can use, no engineering degree required.
                </p>
              </SectionReveal>

              <SectionReveal delay={0.2}>
                <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm shadow-xl p-6">
                  <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    By the numbers
                  </p>
                  <div className="grid grid-cols-2 gap-5">
                    {STATS.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                          {stat.value}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        {/* ── Our Values ────────────────────────────────────── */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-5xl">
            <SectionReveal className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Our values</h2>
            </SectionReveal>

            <div className="grid gap-6 sm:grid-cols-3">
              {VALUES.map((v, i) => (
                <SectionReveal key={v.title} delay={i * 0.1}>
                  <motion.div
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm shadow-xl p-6"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                      {v.icon}
                    </div>
                    <h3 className="font-semibold text-slate-900">{v.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{v.description}</p>
                  </motion.div>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── The Team ──────────────────────────────────────── */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-5xl">
            <SectionReveal className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">The team</h2>
              <p className="mt-2 text-slate-600">Small by design. Fast by necessity.</p>
            </SectionReveal>

            <div className="grid gap-6 sm:grid-cols-2">
              {TEAM.map((member, i) => (
                <SectionReveal key={member.name} delay={i * 0.1}>
                  <TeamCard member={member} />
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── We're Hiring ──────────────────────────────────── */}
        <section className="pb-24 px-4">
          <div className="mx-auto max-w-3xl">
            <SectionReveal>
              <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur-sm shadow-xl overflow-hidden">
                {/* Banner */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-8 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">
                    We're hiring
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Join our fully remote team</h2>
                  <p className="mt-2 text-sm text-violet-100 leading-relaxed max-w-md">
                    We're a small, high-output team that moves fast and trusts each other. If you
                    care deeply about creators and love building great software, we want to hear from
                    you.
                  </p>
                </div>

                {/* Roles */}
                <div className="divide-y divide-slate-100">
                  {OPEN_ROLES.map((role, i) => (
                    <div
                      key={role.title}
                      className="flex items-center justify-between px-8 py-4 hover:bg-violet-50/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{role.title}</p>
                        <p className="text-xs text-slate-500">{role.type}</p>
                      </div>
                      <span className="text-violet-500">
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer link */}
                <div className="px-8 py-5 border-t border-slate-100">
                  <Link
                    to="/careers"
                    className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    View open positions
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
