import { LegalPageChrome } from '../components/LegalPageChrome';
import { LegalFooterLinks } from '../components/LegalFooterLinks';

const EFFECTIVE = 'March 29, 2026';

export function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent font-sans text-ink">
      <LegalPageChrome title="Terms of Service" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-muted">Effective date: {EFFECTIVE}</p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-muted">
          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">1. Agreement</h2>
            <p>
              By accessing or using Channel Bot (the &quot;Service&quot;), you agree to these Terms of Service
              (&quot;Terms&quot;). If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">2. The Service</h2>
            <p>
              Channel Bot provides tools to manage content workflows, including integrations with third-party products such as
              Google accounts, spreadsheets, generative AI features, and social or messaging platforms (for example LinkedIn,
              Instagram, Telegram, or WhatsApp). Features may change, be suspended, or discontinued at any time without
              liability to you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">3. Eligibility and accounts</h2>
            <p>
              You must be legally able to enter a binding contract in your jurisdiction. You are responsible for maintaining
              the confidentiality of credentials you use with the Service (including Google sign-in). You are responsible for
              all activity under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">4. Your content and conduct</h2>
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
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">5. AI-assisted features</h2>
            <p>
              Outputs may be inaccurate, incomplete, or unsuitable for your use case. You are solely responsible for reviewing,
              editing, and deciding whether to publish or send any AI-assisted material. We do not guarantee any particular
              quality, truthfulness, or outcome from AI features.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">6. Third-party services</h2>
            <p>
              The Service relies on third parties (for example Google, cloud infrastructure providers, AI vendors, and social
              platforms). Their services are governed by their own terms and privacy policies. We are not responsible for
              third-party acts, outages, policy changes, or enforcement actions that affect you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">7. Disclaimers</h2>
            <p className="font-medium text-ink">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER
              EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, TITLE, AND NON-INFRINGEMENT, ALL OF WHICH ARE DISCLAIMED TO THE FULLEST EXTENT PERMITTED BY LAW.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted, secure, error-free, or free of harmful components, or
              that content will be preserved without loss.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">8. Limitation of liability</h2>
            <p className="font-medium text-ink">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL THE OPERATOR OF CHANNEL BOT, ITS AFFILIATES,
              OR THEIR RESPECTIVE DIRECTORS, OFFICERS, EMPLOYEES, CONTRACTORS, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS
              OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE, WHETHER BASED ON
              WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN IF ADVISED OF THE POSSIBILITY OF
              SUCH DAMAGES.
            </p>
            <p className="font-medium text-ink">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR
              RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE
              (12) MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100), IF YOU HAVE NOT PAID US ANY FEES.
            </p>
            <p>
              Some jurisdictions do not allow certain limitations; in those jurisdictions, our liability is limited to the
              maximum extent permitted.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">9. Indemnity</h2>
            <p>
              You will defend, indemnify, and hold harmless the operator of Channel Bot and its affiliates and personnel from
              and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos;
              fees) arising out of your content, your use of the Service, your violation of these Terms, or your violation of
              any third-party rights or applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">10. Suspension and termination</h2>
            <p>
              We may suspend or terminate access to the Service at any time, with or without notice, for any reason including
              suspected abuse or legal risk. Provisions that by their nature should survive (including disclaimers, limitation
              of liability, indemnity, and governing law) will survive termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">11. User responsibility and acceptable use</h2>
            <p>
              You are solely responsible for your use of the Service and any consequences thereof. The operator of Channel Bot
              and its developer(s) accept no liability for any outcomes arising from your use of the Service, including but
              not limited to: content published or sent through the Service, actions taken on connected third-party platforms
              (such as LinkedIn, Instagram, WhatsApp, Telegram, or any other integrated service), decisions made based on
              AI-assisted outputs, loss of data or business, service interruptions, errors in content, or any direct or
              indirect damage caused by using this Service.
            </p>
            <p>
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You will not hold the
              operator of Channel Bot or its developer(s) responsible for any claims, damages, losses, or costs arising from
              your use of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">12. Changes</h2>
            <p>
              We may modify these Terms at any time. If we make material changes, we will take reasonable steps to notify you
              (for example by posting an updated effective date). Continued use after changes constitutes acceptance. If you do
              not agree, stop using the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-heading text-xl font-semibold text-ink">13. Governing law</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law
              principles, except where prohibited by your local mandatory consumer protections. Courts in Delaware (or the
              federal courts located there, where applicable) have exclusive jurisdiction for disputes, unless a different
              forum is required by mandatory law.
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
