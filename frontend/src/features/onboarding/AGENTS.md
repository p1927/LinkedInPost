<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/onboarding

## Purpose
First-run onboarding experience. Guides new users through connecting accounts and setting up their workspace.

## Key Files

| File | Description |
|------|-------------|
| `ConnectAccountsGrid.tsx` | Grid of connectable services (Google, LinkedIn, etc.) with OAuth triggers |
| `OnboardingModal.tsx` | Modal wrapper for the onboarding flow steps |

## For AI Agents

### Working In This Directory
- OAuth redirect URIs must match what's configured in `setup/` and Cloudflare Worker env vars
- Onboarding completion state is persisted server-side; do not store it only in localStorage

<!-- MANUAL: -->
