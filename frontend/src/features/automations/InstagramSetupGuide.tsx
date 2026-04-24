interface InstagramSetupGuideProps {
  platform: string;
}

export function InstagramSetupGuide({ platform }: InstagramSetupGuideProps) {
  if (platform !== 'instagram') return null;

  return (
    <div style={{ background: '#fef3c7', borderRadius: 8, padding: 16, marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>
        Meta Business App Setup — Instagram Automation
      </h3>
      <p style={{ fontSize: 12, color: '#78350f', marginBottom: 12 }}>
        Follow these steps in the Meta Business Developer Portal to enable webhooks and automation:
      </p>

      <ol style={{ fontSize: 12, color: '#78350f', paddingLeft: 20, marginBottom: 12, lineHeight: 1.8 }}>
        <li>
          <strong>Create a Meta App</strong> at{' '}
          <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
            developers.facebook.com
          </a>{' '}
          → My Apps → Create App → Select "Business" type.
        </li>
        <li>
          <strong>Add Instagram Graph API product</strong> — Go to Add Products → search "Instagram Graph API" → Configure.
        </li>
        <li>
          <strong>Configure App Settings</strong>:
          <ul style={{ marginTop: 4, paddingLeft: 16 }}>
            <li>Set App Mode to <strong>Live</strong> (not Development)</li>
            <li>Add Instagram Professional account under "App Roles" → Roles</li>
          </ul>
        </li>
        <li>
          <strong>Generate Access Token</strong>:
          <ul style={{ marginTop: 4, paddingLeft: 16 }}>
            <li>Use <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Graph API Explorer</a></li>
            <li>Select your app → Add Permissions: <code>instagram_basic</code>, <code>instagram_content_publish</code>, <code>instagram_manage_comments</code>, <code>instagram_manage_messages</code>, <code>pages_read_engagement</code></li>
            <li>Generate Token → Exchange short-lived for long-lived (60 days) via <code>/access_token?grant_type=fb_exchange_token</code></li>
          </ul>
        </li>
        <li>
          <strong>Set Environment Variables</strong> (configure in your deployment):
          <ul style={{ marginTop: 4, paddingLeft: 16 }}>
            <li><code>INSTAGRAM_APP_ID</code> — Found in your Meta App dashboard</li>
            <li><code>INSTAGRAM_APP_SECRET</code> — Found in your Meta App dashboard</li>
            <li><code>INSTAGRAM_ACCESS_TOKEN</code> — The long-lived user access token</li>
            <li><code>INSTAGRAM_USER_ID</code> — Your Instagram Professional account ID</li>
          </ul>
        </li>
        <li>
          <strong>Webhook Fields</strong> — The system subscribes to: <code>comments</code>, <code>messages</code>, <code>follows</code>
        </li>
        <li>
          <strong>Rate Limits</strong> — Instagram allows ~200 automated DMs per hour per account.
          The 24-hour messaging window applies — you can only message users who engaged within 24 hours.
        </li>
      </ol>

      <details style={{ fontSize: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#92400e' }}>Token Exchange (Long-Lived)</summary>
        <pre style={{ background: '#fde68a', padding: 8, borderRadius: 4, marginTop: 8, overflow: 'auto', fontSize: 11 }}>
{`# Exchange short-lived for long-lived token
GET https://graph.facebook.com/v25.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id=YOUR_APP_ID&
  client_secret=YOUR_APP_SECRET&
  fb_exchange_token=SHORT_LIVED_TOKEN`}
        </pre>
      </details>
    </div>
  );
}
