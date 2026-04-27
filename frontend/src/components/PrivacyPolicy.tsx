import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { Mail } from 'lucide-react'

const EFFECTIVE = 'March 29, 2026'

const sections = [
  { id: 'who-we-are', label: '1. Who we are' },
  { id: 'information-we-collect', label: '2. Information we collect' },
  { id: 'how-we-use', label: '3. How we use information' },
  { id: 'legal-bases', label: '4. Legal bases' },
  { id: 'third-party', label: '5. Third-party services' },
  { id: 'how-we-share', label: '6. How we share information' },
  { id: 'data-storage', label: '7. Data storage & security' },
  { id: 'international', label: '8. International transfers' },
  { id: 'your-rights', label: '9. Your rights' },
  { id: 'children', label: '10. Children' },
  { id: 'changes', label: '11. Changes' },
  { id: 'contact', label: '12. Contact' },
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

export function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-slate-500">Effective date: {EFFECTIVE}</p>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            We built Channel Bot to help teams publish great content — not to harvest data.
            This policy explains exactly what we collect, why we collect it, and how you stay in control.
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

            <AnimatedSection id="who-we-are">
              <h2 className="font-heading text-xl font-semibold text-slate-900">1. Who we are</h2>
              <p>
                This Privacy Policy describes how the operator of Channel Bot (&quot;we,&quot; &quot;us&quot;) collects, uses,
                and shares information when you use the Channel Bot websites, applications, and related services (collectively,
                the &quot;Service&quot;).
              </p>
            </AnimatedSection>

            <AnimatedSection id="information-we-collect">
              <h2 className="font-heading text-xl font-semibold text-slate-900">2. Information we collect</h2>
              <ul className="space-y-3">
                {[
                  { label: 'Account and authentication.', text: 'When you sign in with Google, we receive identifiers and profile details that Google shares with us under your consent (for example name, email, and profile picture).' },
                  { label: 'Connected accounts.', text: 'We securely store OAuth tokens for services you connect (for example LinkedIn, Instagram, Telegram, or WhatsApp) to publish on your behalf. We do not store your passwords for those platforms. Tokens are protected as described in the security section below.' },
                  { label: 'Content and configuration.', text: 'Text, topics, images, spreadsheet or queue data, draft posts, channel settings, and delivery preferences you or your organization provide.' },
                  { label: 'Usage and technical data.', text: 'Log data, device or browser type, approximate location derived from IP, timestamps, and diagnostic events needed to operate and secure the Service. We may collect aggregated or anonymous analytics about how the application is used.' },
                  { label: 'Communications.', text: 'Messages you send to us (for example support requests) and related metadata.' },
                ].map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    <span><strong className="font-semibold text-slate-800">{item.label}</strong> {item.text}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>

            <AnimatedSection id="how-we-use">
              <h2 className="font-heading text-xl font-semibold text-slate-900">3. How we use information</h2>
              <p>We use information to:</p>
              <ul className="space-y-3">
                {[
                  'Authenticate you, maintain your session, and enforce access controls (including admin-approved accounts where configured);',
                  'Generate and edit post drafts using AI based on your instructions;',
                  'Publish approved content to connected social and messaging channels;',
                  'Manage your shared queue via Google Sheets and related Google APIs;',
                  'Provide, maintain, and improve the Service; monitor reliability and security; debug issues; prevent fraud or abuse;',
                  'Comply with law and respond to lawful requests;',
                  'Communicate about the Service, including notices and (where allowed) product updates.',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>We do not sell your personal information or content to third parties for money. We do not use your data for any purpose beyond delivering and improving the Service you have requested.</p>
              <p><strong className="font-semibold text-slate-800">You own your data.</strong> All content, posts, and information you provide remains yours. You can request deletion of your data from our systems at any time by contacting us. We will honor deletion requests subject only to legal obligations we must fulfill.</p>
            </AnimatedSection>

            <AnimatedSection id="legal-bases">
              <h2 className="font-heading text-xl font-semibold text-slate-900">4. Legal bases (EEA, UK, and similar regions)</h2>
              <p>Where GDPR or similar laws apply, we rely on one or more of:</p>
              <ul className="space-y-3">
                {[
                  { label: 'Contract', text: '— processing necessary to provide the Service you request;' },
                  { label: 'Legitimate interests', text: '— securing the Service, improving features, and limited analytics, balanced against your rights;' },
                  { label: 'Consent', text: '— where required (for example certain cookies or optional marketing), which you may withdraw;' },
                  { label: 'Legal obligation', text: '— where the law requires processing.' },
                ].map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    <span><strong className="font-semibold text-slate-800">{item.label}</strong> {item.text}</span>
                  </li>
                ))}
              </ul>
            </AnimatedSection>

            <AnimatedSection id="third-party">
              <h2 className="font-heading text-xl font-semibold text-slate-900">5. Third-party services</h2>
              <p>
                Channel Bot integrates with third-party APIs including Google (authentication, Sheets, and AI model access),
                LinkedIn, Meta (Instagram, WhatsApp), Telegram, and cloud infrastructure. Your use of those integrations is also
                governed by their respective terms and privacy policies. Content sent to AI providers is transmitted securely;
                how providers treat that content depends on their policies and your agreements with them.
              </p>
            </AnimatedSection>

            <AnimatedSection id="how-we-share">
              <h2 className="font-heading text-xl font-semibold text-slate-900">6. How we share information</h2>
              <p>We may share information with:</p>
              <ul className="space-y-3">
                {[
                  { label: 'Infrastructure and service providers', text: 'who host, process, or support the Service, under contractual safeguards;' },
                  { label: 'Integrated third parties', text: 'when you connect or publish through them, according to their policies and your settings;' },
                  { label: 'Professional advisors', text: 'where reasonably necessary;' },
                  { label: 'Authorities', text: 'if we believe disclosure is required by law or to protect rights, safety, or security.' },
                ].map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                    <span><strong className="font-semibold text-slate-800">{item.label}</strong> {item.text}</span>
                  </li>
                ))}
              </ul>
              <p>
                Where applicable law defines &quot;sale&quot; or &quot;sharing&quot; broadly (for example for certain advertising
                uses), we describe your choices below.
              </p>
            </AnimatedSection>

            <AnimatedSection id="data-storage">
              <h2 className="font-heading text-xl font-semibold text-slate-900">7. Data storage, retention, and security</h2>
              <p>
                We use industry-standard measures to protect your data. OAuth tokens are encrypted at rest. Much of your post and
                queue data is managed within your connected Google Sheet. We keep information only as long as needed for the
                purposes above, including legal, accounting, and security needs. You may request deletion subject to exceptions we
                must honor by law.
              </p>
              <p>No method of transmission or storage is completely secure; we cannot guarantee absolute security.</p>
            </AnimatedSection>

            <AnimatedSection id="international">
              <h2 className="font-heading text-xl font-semibold text-slate-900">8. International transfers</h2>
              <p>
                We may process information in countries other than where you live, including the United States. Where required,
                we use appropriate safeguards (such as Standard Contractual Clauses) for transfers from the EEA, UK, or
                Switzerland.
              </p>
            </AnimatedSection>

            <AnimatedSection id="your-rights">
              <h2 className="font-heading text-xl font-semibold text-slate-900">9. Your rights</h2>
              <p>
                You can disconnect social channels or revoke our access to your Google account through your account settings. To
                request full deletion of your data from our systems, contact us using the details below.
              </p>
              <p>
                Depending on where you live, you may have rights to access, correct, delete, or export personal information; object
                to or restrict certain processing; withdraw consent where processing is consent-based; and lodge a complaint with a
                supervisory authority.
              </p>
              <p>
                <strong className="font-semibold text-slate-800">California (CCPA/CPRA).</strong> Residents may have rights to know, delete, and
                correct personal information, and to opt out of sale/sharing where those terms apply. We do not knowingly sell
                personal information of consumers under 16 without affirmative authorization. To exercise rights, contact us using
                the details below. You may designate an authorized agent where the law allows; we may verify requests as permitted
                by law. We will not discriminate against you for exercising privacy rights.
              </p>
            </AnimatedSection>

            <AnimatedSection id="children">
              <h2 className="font-heading text-xl font-semibold text-slate-900">10. Children</h2>
              <p>
                The Service is not directed to children under 13 (or the age required in your jurisdiction). We do not knowingly
                collect personal information from children. If you believe we have, contact us and we will take appropriate steps.
              </p>
            </AnimatedSection>

            <AnimatedSection id="changes">
              <h2 className="font-heading text-xl font-semibold text-slate-900">11. Changes</h2>
              <p>
                We may update this policy from time to time. We will post the updated version and revise the effective date.
                Material changes may require additional notice where the law applies.
              </p>
            </AnimatedSection>

            <AnimatedSection id="contact">
              <h2 className="font-heading text-xl font-semibold text-slate-900">12. Contact</h2>
              <div className="mt-2 rounded-2xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                    <Mail className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Privacy questions or data deletion requests</p>
                    <p className="mt-1 text-slate-600">
                      Contact us at{' '}
                      <a href="mailto:jbphome@gmail.com" className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-700">
                        jbphome@gmail.com
                      </a>{' '}
                      or through the support channels in the application. We respond to privacy requests within 30 days.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

          </div>
        </main>
      </div>

      <MarketingFooter />
    </div>
  )
}
