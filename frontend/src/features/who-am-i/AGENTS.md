<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/features/who-am-i

## Purpose
User persona and author profile setup. Lets users define their professional identity, tone, and expertise — used as context for AI post generation.

## Key Files

| File | Description |
|------|-------------|
| `WhoAmISection.tsx` | Form for entering author profile details (bio, tone, expertise) |
| `default-author-profile-template.ts` | Default placeholder values for new author profiles |

## For AI Agents

### Working In This Directory
- Author profile data is passed as context to generation prompts in `worker/src/generation/`
- Changes to the profile schema require updates in both the frontend form and the worker's prompt builder

<!-- MANUAL: -->
