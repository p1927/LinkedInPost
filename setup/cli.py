from __future__ import annotations

import argparse
import os


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Bootstrap LinkedIn Bot resources and deployment config.')
    parser.add_argument('--install-worker-deps', action='store_true', help='Install Worker dependencies, including Wrangler, before any Worker-related steps.')
    parser.add_argument('--cloudflare', action='store_true', help='Create Worker config, KV namespaces, and .dev.vars when possible.')
    parser.add_argument('--deploy-worker', action='store_true', help='Deploy the Worker after Cloudflare bootstrap.')
    parser.add_argument('--sync-github-secrets', action='store_true', help='Sync available GitHub Actions secrets using gh CLI.')
    parser.add_argument('--skip-google', action='store_true', help='Skip Google resource creation and use existing env values instead.')
    parser.add_argument('--share-email', default=os.environ.get('GOOGLE_SHARE_EMAIL', '').strip(), help='Email to share the LINKEDIN folder with.')
    parser.add_argument('--allowed-emails', default=os.environ.get('ALLOWED_EMAILS', '').strip(), help='Worker allowlist emails separated by spaces or commas.')
    parser.add_argument('--admin-emails', default=os.environ.get('ADMIN_EMAILS', '').strip(), help='Worker admin emails separated by spaces or commas.')
    parser.add_argument('--google-client-id', default=os.environ.get('VITE_GOOGLE_CLIENT_ID', '').strip() or os.environ.get('GOOGLE_CLIENT_ID', '').strip(), help='Google web client ID for frontend and Worker validation.')
    parser.add_argument('--github-pages-origin', default=os.environ.get('GITHUB_PAGES_ORIGIN', '').strip(), help='Origin allowed to call the Worker, for example https://user.github.io.')
    parser.add_argument('--github-repo', default=os.environ.get('GITHUB_REPO', '').strip(), help='GitHub repository in owner/repo format.')
    parser.add_argument('--instagram-app-id', default=os.environ.get('INSTAGRAM_APP_ID', '').strip(), help='Instagram app ID used for the admin connect flow.')
    parser.add_argument('--instagram-app-secret', default=os.environ.get('INSTAGRAM_APP_SECRET', '').strip(), help='Instagram app secret stored as a Worker secret.')
    parser.add_argument('--linkedin-client-id', default=os.environ.get('LINKEDIN_CLIENT_ID', '').strip(), help='LinkedIn OAuth client ID used for the admin connect flow.')
    parser.add_argument('--linkedin-client-secret', default=os.environ.get('LINKEDIN_CLIENT_SECRET', '').strip(), help='LinkedIn OAuth client secret stored as a Worker secret.')
    parser.add_argument('--linkedin-person-urn', default=os.environ.get('LINKEDIN_PERSON_URN', '').strip(), help='LinkedIn member URN used by the Worker for direct publishing.')
    parser.add_argument('--telegram-bot-token', default=os.environ.get('TELEGRAM_BOT_TOKEN', '').strip(), help='Telegram bot token stored as a Worker secret for direct delivery.')
    parser.add_argument('--meta-app-id', default=os.environ.get('META_APP_ID', '').strip(), help='Meta app ID used for the WhatsApp Business connect flow.')
    parser.add_argument('--meta-app-secret', default=os.environ.get('META_APP_SECRET', '').strip(), help='Meta app secret stored as a Worker secret.')
    parser.add_argument('--whatsapp-phone-number-id', default=os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '').strip(), help='Meta WhatsApp phone number ID used by the Worker for direct sending.')
    parser.add_argument('--gmail-client-id', default=os.environ.get('GMAIL_CLIENT_ID', '').strip(), help='Google OAuth Web client ID for Gmail connect (defaults to --google-client-id / VITE_GOOGLE_CLIENT_ID when unset).')
    parser.add_argument('--gmail-client-secret', default=os.environ.get('GMAIL_CLIENT_SECRET', '').strip(), help='Google OAuth client secret for Gmail token exchange (Worker secret, not exposed to the browser).')
    parser.add_argument('--all', action='store_true', help='Run Google setup, Cloudflare bootstrap, Worker deploy, and GitHub secret sync.')
    parser.add_argument('--web', action='store_true', help='Start the web-based setup wizard at localhost:4242')
    return parser.parse_args()
