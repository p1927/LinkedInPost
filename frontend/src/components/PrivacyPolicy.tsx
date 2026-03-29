import { LegalPageChrome } from './LegalPageChrome';
import { LegalFooterLinks } from './LegalFooterLinks';

const EFFECTIVE = 'March 29, 2026';

export function PrivacyPolicy() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent font-sans text-ink">
      <LegalPageChrome title="Privacy Policy" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-muted">Last updated: {EFFECTIVE}</p>
        <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          This policy is a starting point for transparency. It is not legal advice. Align it with your real data flows,
          subprocessors, and jurisdictions, and have counsel review it.
        </p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-muted">
          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">1. Who we are</h2>
            <p>
              This Privacy Policy describes how the operator of Channel Bot (&quot;we,&quot; &quot;us&quot;) collects, uses,
              and shares information when you use the Channel Bot websites, applications, and related services (collectively,
              the &quot;Service&quot;).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">2. Information we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-ink">Account and authentication.</strong> When you sign in with Google, we receive
                identifiers and profile details that Google shares with us under your consent (for example name, email, and
                profile picture).
              </li>
              <li>
                <strong className="text-ink">Connected accounts.</strong> We securely store OAuth tokens for services you
                connect (for example LinkedIn, Instagram, Telegram, or WhatsApp) to publish on your behalf. We do not store
                your passwords for those platforms. Tokens are protected as described in the security section below.
              </li>
              <li>
                <strong className="text-ink">Content and configuration.</strong> Text, topics, images, spreadsheet or queue
                data, draft posts, channel settings, and delivery preferences you or your organization provide.
              </li>
              <li>
                <strong className="text-ink">Usage and technical data.</strong> Log data, device or browser type, approximate
                location derived from IP, timestamps, and diagnostic events needed to operate and secure the Service. We may
                collect aggregated or anonymous analytics about how the application is used.
              </li>
              <li>
                <strong className="text-ink">Communications.</strong> Messages you send to us (for example support requests) and
                related metadata.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">3. How we use information</h2>
            <p>We use information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Authenticate you, maintain your session, and enforce access controls (including admin-approved accounts where configured);</li>
              <li>Generate and edit post drafts using AI based on your instructions;</li>
              <li>Publish approved content to connected social and messaging channels;</li>
              <li>Manage your shared queue via Google Sheets and related Google APIs;</li>
              <li>Provide, maintain, and improve the Service; monitor reliability and security; debug issues; prevent fraud or abuse;</li>
              <li>Comply with law and respond to lawful requests;</li>
              <li>Communicate about the Service, including notices and (where allowed) product updates.</li>
            </ul>
            <p>We do not sell your personal information or content to third parties for money.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">4. Legal bases (EEA, UK, and similar regions)</h2>
            <p>Where GDPR or similar laws apply, we rely on one or more of:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-ink">Contract</strong> — processing necessary to provide the Service you request;
              </li>
              <li>
                <strong className="text-ink">Legitimate interests</strong> — securing the Service, improving features, and limited
                analytics, balanced against your rights;
              </li>
              <li>
                <strong className="text-ink">Consent</strong> — where required (for example certain cookies or optional
                marketing), which you may withdraw;
              </li>
              <li>
                <strong className="text-ink">Legal obligation</strong> — where the law requires processing.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">5. Third-party services</h2>
            <p>
              Channel Bot integrates with third-party APIs including Google (authentication, Sheets, and AI model access),
              LinkedIn, Meta (Instagram, WhatsApp), Telegram, and cloud infrastructure. Your use of those integrations is also
              governed by their respective terms and privacy policies. Content sent to AI providers is transmitted securely;
              how providers treat that content depends on their policies and your agreements with them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">6. How we share information</h2>
            <p>We may share information with:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-ink">Infrastructure and service providers</strong> who host, process, or support the
                Service, under contractual safeguards;
              </li>
              <li>
                <strong className="text-ink">Integrated third parties</strong> when you connect or publish through them,
                according to their policies and your settings;
              </li>
              <li>
                <strong className="text-ink">Professional advisors</strong> where reasonably necessary;</li>
              <li>
                <strong className="text-ink">Authorities</strong> if we believe disclosure is required by law or to protect
                rights, safety, or security.</li>
            </ul>
            <p>
              Where applicable law defines &quot;sale&quot; or &quot;sharing&quot; broadly (for example for certain advertising
              uses), we describe your choices below.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">7. Data storage, retention, and security</h2>
            <p>
              We use industry-standard measures to protect your data. OAuth tokens are encrypted at rest. Much of your post and
              queue data is managed within your connected Google Sheet. We keep information only as long as needed for the
              purposes above, including legal, accounting, and security needs. You may request deletion subject to exceptions we
              must honor by law.
            </p>
            <p>No method of transmission or storage is completely secure; we cannot guarantee absolute security.</p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">8. International transfers</h2>
            <p>
              We may process information in countries other than where you live, including the United States. Where required,
              we use appropriate safeguards (such as Standard Contractual Clauses) for transfers from the EEA, UK, or
              Switzerland.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">9. Your rights</h2>
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
              <strong className="text-ink">California (CCPA/CPRA).</strong> Residents may have rights to know, delete, and
              correct personal information, and to opt out of sale/sharing where those terms apply. We do not knowingly sell
              personal information of consumers under 16 without affirmative authorization. To exercise rights, contact us using
              the details below. You may designate an authorized agent where the law allows; we may verify requests as permitted
              by law. We will not discriminate against you for exercising privacy rights.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">10. Children</h2>
            <p>
              The Service is not directed to children under 13 (or the age required in your jurisdiction). We do not knowingly
              collect personal information from children. If you believe we have, contact us and we will take appropriate steps.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">11. Changes</h2>
            <p>
              We may update this policy from time to time. We will post the updated version and revise the effective date.
              Material changes may require additional notice where the law applies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">12. Contact</h2>
            <p>
              For privacy questions or requests, contact the operator of Channel Bot at the administrative email or mailing
              address you publish for the Service. Replace this sentence with your real contact details before production use.
            </p>
          </section>
        </div>
      </main>
      <footer className="mt-auto border-t border-border/60 py-6">
        <LegalFooterLinks />
      </footer>
    </div>
  );
}
