import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

const EFFECTIVE = 'March 29, 2026'

const sections = [
  { id: 'agreement', label: '1. Agreement' },
  { id: 'the-service', label: '2. The Service' },
  { id: 'eligibility', label: '3. Eligibility and accounts' },
  { id: 'your-content', label: '4. Your content and conduct' },
  { id: 'ai-features', label: '5. AI-assisted features' },
  { id: 'third-party', label: '6. Third-party services' },
  { id: 'disclaimers', label: '7. Disclaimers' },
  { id: 'liability', label: '8. Limitation of liability' },
  { id: 'indemnity', label: '9. Indemnity' },
  { id: 'termination', label: '10. Suspension and termination' },
  { id: 'acceptable-use', label: '11. Acceptable use' },
  { id: 'changes', label: '12. Changes' },
  { id: 'governing-law', label: '13. Governing law' },
]

function AnimatedSection({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-4 scroll-mt-24"
    >
      {children}
    </motion.section>
  )
}

export function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-violet-100/60 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl px-4"
        >
          <span className="mb-4 inline-block rounded-full bg-violet-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-700">
            Legal
          </span>
          <h1 className="bg-gradient-to-br from-violet-700 via-violet-500 to-indigo-500 bg-clip-text font-heading text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-slate-500">Effective date: {EFFECTIVE}</p>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            These terms govern your access to and use of Linked. By using the Service,
            you agree to be bound by them.
          </p>
        </motion.div>
      </section>

      <div className="mx-auto w-full max-w-6xl flex-1 gap-12 px-4 pb-24 sm:px-6 lg:flex lg:items-start">
        {/* Sticky sidebar TOC */}
        <aside className="hidden lg:block lg:w-56 xl:w-64">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Contents
            </p>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main prose */}
        <main className="min-w-0 flex-1">
          <div className="space-y-12 text-[15px] leading-relaxed text-slate-600">

            <AnimatedSection id="agreement">
              <h2 className="font-heading text-xl font-semibold text-slate-900">1. Agreement</h2>
              <p>
                By accessing or using Linked (the &quot;Service&quot;), you agree to these Terms of Service
                (&quot;Terms&quot;). If you do not agree, do not use the Service.
              </p>
            </AnimatedSection>

            <AnimatedSection id="the-service">
              <h2 className="font-heading text-xl font-semibold text-slate-900">2. The Service</h2>
              <p>
                Linked provides tools to manage content workflows, including integrations with third-party products such as
                Google accounts, spreadsheets, generative AI features, and social or messaging platforms (for example LinkedIn,
                Instagram, Telegram, or WhatsApp). Features may change, be suspended, or discontinued at any time without
                liability to you.
              </p>
            </AnimatedSection>

            <AnimatedSection id="eligibility">
              <h2 className="font-heading text-xl font-semibold text-slate-900">3. Eligibility and accounts</h2>
              <p>
                You must be legally able to enter a binding contract in your jurisdiction. You are responsible for maintaining
                the confidentiality of credentials you use with the Service (including Google sign-in). You are responsible for
                all activity under your account.
              </p>
            </AnimatedSection>

            <AnimatedSection id="your-content">
              <h2 className="font-heading text-xl font-semibold text-slate-900">4. Your content and conduct</h2>
              <p>
                You retain ownership of content you submit. You grant us a limited license to host, process, transmit, and
                display that content solely to operate and improve the Service. You represent that you have the rights needed for
                any content you provide and that your use complies with applicable law and the terms of any connected third-party
                service (including social networks and messaging providers).
              </p>
              <p>
                You will not use the Service unlawfully, to infringe others&apos; rights, to distribute malware, to spam, or to
                attempt unauthorized access to our or others&apos; systems.
              </p>
            </AnimatedSection>

            <AnimatedSection id="ai-features">
              <h2 className="font-heading text-xl font-semibold text-slate-900">5. AI-assisted features</h2>
              <p>
                Outputs may be inaccurate, incomplete, or unsuitable for your use case. You are solely responsible for reviewing,
                editing, and deciding whether to publish or send any AI-assisted material. We do not guarantee any particular
                quality, truthfulness, or outcome from AI features.
              </p>
            </AnimatedSection>

            <AnimatedSection id="third-party">
              <h2 className="font-heading text-xl font-semibold text-slate-900">6. Third-party services</h2>
              <p>
                The Service relies on third parties (for example Google, cloud infrastructure providers, AI vendors, and social
                platforms). Their services are governed by their own terms and privacy policies. We are not responsible for
                third-party acts, outages, policy changes, or enforcement actions that affect you.
              </p>
            </AnimatedSection>

            <AnimatedSection id="disclaimers">
              <h2 className="font-heading text-xl font-semibold text-slate-900">7. Disclaimers</h2>
              <p className="font-medium text-slate-700">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER
                EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, TITLE, AND NON-INFRINGEMENT, ALL OF WHICH ARE DISCLAIMED TO THE FULLEST EXTENT PERMITTED BY LAW.
              </p>
              <p>
                We do not warrant that the Service will be uninterrupted, secure, error-free, or free of harmful components, or
                that content will be preserved without loss.
              </p>
            </AnimatedSection>

            <AnimatedSection id="liability">
              <h2 className="font-heading text-xl font-semibold text-slate-900">8. Limitation of liability</h2>
              <p className="font-medium text-slate-700">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL THE OPERATOR OF CHANNEL BOT, ITS AFFILIATES,
                OR THEIR RESPECTIVE DIRECTORS, OFFICERS, EMPLOYEES, CONTRACTORS, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS
                OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE, WHETHER BASED ON
                WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN IF ADVISED OF THE POSSIBILITY OF
                SUCH DAMAGES.
              </p>
              <p className="font-medium text-slate-700">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR
                RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE
                (12) MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100), IF YOU HAVE NOT PAID US ANY FEES.
              </p>
              <p>
                Some jurisdictions do not allow certain limitations; in those jurisdictions, our liability is limited to the
                maximum extent permitted.
              </p>
            </AnimatedSection>

            <AnimatedSection id="indemnity">
              <h2 className="font-heading text-xl font-semibold text-slate-900">9. Indemnity</h2>
              <p>
                You will defend, indemnify, and hold harmless the operator of Linked and its affiliates and personnel from
                and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos;
                fees) arising out of your content, your use of the Service, your violation of these Terms, or your violation of
                any third-party rights or applicable law.
              </p>
            </AnimatedSection>

            <AnimatedSection id="termination">
              <h2 className="font-heading text-xl font-semibold text-slate-900">10. Suspension and termination</h2>
              <p>
                We may suspend or terminate access to the Service at any time, with or without notice, for any reason including
                suspected abuse or legal risk. Provisions that by their nature should survive (including disclaimers, limitation
                of liability, indemnity, and governing law) will survive termination.
              </p>
            </AnimatedSection>

            <AnimatedSection id="acceptable-use">
              <h2 className="font-heading text-xl font-semibold text-slate-900">11. User responsibility and acceptable use</h2>
              <p>
                You are solely responsible for your use of the Service and any consequences thereof. The operator of Linked
                and its developer(s) accept no liability for any outcomes arising from your use of the Service, including but
                not limited to: content published or sent through the Service, actions taken on connected third-party platforms
                (such as LinkedIn, Instagram, WhatsApp, Telegram, or any other integrated service), decisions made based on
                AI-assisted outputs, loss of data or business, service interruptions, errors in content, or any direct or
                indirect damage caused by using this Service.
              </p>
              <p>
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You will not hold the
                operator of Linked or its developer(s) responsible for any claims, damages, losses, or costs arising from
                your use of the Service.
              </p>
            </AnimatedSection>

            <AnimatedSection id="changes">
              <h2 className="font-heading text-xl font-semibold text-slate-900">12. Changes</h2>
              <p>
                We may modify these Terms at any time. If we make material changes, we will take reasonable steps to notify you
                (for example by posting an updated effective date). Continued use after changes constitutes acceptance. If you do
                not agree, stop using the Service.
              </p>
            </AnimatedSection>

            <AnimatedSection id="governing-law">
              <h2 className="font-heading text-xl font-semibold text-slate-900">13. Governing law</h2>
              <p>
                These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law
                principles, except where prohibited by your local mandatory consumer protections. Courts in Delaware (or the
                federal courts located there, where applicable) have exclusive jurisdiction for disputes, unless a different
                forum is required by mandatory law.
              </p>
            </AnimatedSection>

          </div>
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
