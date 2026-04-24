import type { AutomationPlatform } from './types';

interface LinkedInSetupGuideProps {
  platform: AutomationPlatform;
}

export function LinkedInSetupGuide({ platform }: LinkedInSetupGuideProps) {
  if (platform !== 'linkedin') return null;

  return (
    <div style={{ background: '#fef3c7', borderRadius: 8, padding: 16, marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>
        LinkedIn App Setup — Automation
      </h3>
      <p style={{ fontSize: 12, color: '#78350f', marginBottom: 12 }}>
        Follow these steps in the LinkedIn Developer Portal to enable webhooks and automation:
      </p>

      <ol style={{ fontSize: 12, color: '#78350f', paddingLeft: 20, marginBottom: 12, lineHeight: 1.8 }}>
        <li>
          <strong>Create a LinkedIn App</strong> at{' '}
          <a href="https://developer.linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
            developer.linkedin.com
          </a>{' '}
          → Create App → Fill in name, LinkedIn page, and upload logo.
        </li>
        <li>
          <strong>Verify App</strong> — Complete Basic Info, add your LinkedIn Page as the "Company" verification,
          and verify your email. Under "Products" tab, request access to <strong>Marketing Developer Platform</strong>.
        </li>
        <li>
          <strong>Configure OAuth 2.0</strong> — Under Auth tab, set redirect URL to your worker URL
          (e.g., <code>https://your-worker.workers.dev/api/auth/linkedin/callback</code>).
        </li>
        <li>
          <strong>Add Permissions</strong> — Request these scopes during the OAuth flow:
          <ul style={{ marginTop: 4, paddingLeft: 16 }}>
            <li><code>r_organization_admin</code> — Manage organization pages</li>
            <li><code>rw_organization_admin</code> — Full org admin access</li>
            <li><code>w_member_social</code> — Post/comment as the organization</li>
            <li><code>r_member_social</code> — Read social actions</li>
          </ul>
        </li>
        <li>
          <strong>Set Environment Variables</strong> (configure in your deployment):
          <ul style={{ marginTop: 4, paddingLeft: 16 }}>
            <li><code>LINKEDIN_ACCESS_TOKEN</code> — OAuth user access token</li>
            <li><code>LINKEDIN_PERSON_URN</code> — Your person URN (urn:li:person:...)</li>
            <li><code>LINKEDIN_CLIENT_SECRET</code> — Found in Auth tab</li>
            <li><code>LINKEDIN_ORGANIZATION_URN</code> — Your organization URN (urn:li:organization:...)</li>
          </ul>
        </li>
        <li>
          <strong>Webhook Event Types</strong> — LinkedIn supports:{' '}
          <code>ORGANIZATION_SOCIAL_ACTION_COMMENT</code> and <code>MESSAGE_RECEIVED</code>.
          Note: <strong>There is no follower webhook</strong> — LinkedIn does not notify when someone follows your page.
        </li>
      </ol>

      <div style={{ background: '#fee2e2', borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 12, color: '#991b1b' }}>
        <strong>Important limitation:</strong> LinkedIn has no follower webhook event. You cannot automatically
        DM someone when they follow your LinkedIn page — LinkedIn's API only provides aggregate follower counts,
        not individual follower identities. Use <em>DM commenter — ask them to follow</em> instead.
      </div>

      <details style={{ fontSize: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#92400e' }}>Rate Limits & Best Practices</summary>
        <ul style={{ marginTop: 8, paddingLeft: 16, color: '#78350f', lineHeight: 1.7 }}>
          <li>LinkedIn API calls are rate-limited; avoid polling. Use webhooks instead.</li>
          <li>DM sending via <code>/v2/messages</code> requires the recipient to have authorized your app.</li>
          <li>Tokens expire — implement token refresh in your OAuth flow.</li>
          <li>Webhook subscriptions require <code>rw_organization_admin</code> and the subscribing member must be an admin of the organization.</li>
        </ul>
      </details>
    </div>
  );
}
