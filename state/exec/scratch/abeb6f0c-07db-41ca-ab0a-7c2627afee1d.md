# Run abeb6f0c-07db-41ca-ab0a-7c2627afee1d


## Context Pack [by context_gather @ 2026-04-22T20:39:31.085731+00:00]

Add state detection and progress tracking to the setup wizard system.

Goal: When LinkedInPost is already configured, the setup wizard should show the current state instead of walking through everything from scratch.

Requirements:
1. Create a SetupStateService that detects and persists setup state:
   - Check which environment variables are set/unset by parsing .env files (frontend/.env, worker/.dev.vars)
   - Detect which social media accounts are connected (LinkedIn token, etc.)
   - Detect worker/cloudflare deployment status
   - Detect if generation-worker is configured

2. Add SetupState type with fields:
   - envVars: { name, value, isSet }[] for all required env vars
   - integrations: { name, connected, config }[] for LinkedIn, etc.
   - workers: { name, deployed, status }[] for generation-worker, etc.
   - overallProgress: percentage complete

3. Modify SetupWizard to:
   - Load current state on init
   - Show status dashboard instead of step-by-step if already configured
   - Allow jumping to specific incomplete sections
   - Display green checkmarks for completed items, warnings for missing

4. Add setupStateService.ts in frontend/src/features/setup-wizard/:
   - readState() - reads current config from filesystem/API
   - saveState() - persists state to localStorage or config file
   - detectEnvVars() - parses .env files to detect configured vars
   - detectIntegrations() - checks API for connected accounts

5. Create modular code with separation of concerns:
   - Types in types.ts
   - State detection in service classes
   - UI components purely presentational

Claimed scope: frontend/src/features/setup-wizard/**

Files:
- plans/PLAN-06-reflexion-skill-library.md — matches state, detection, tracking, setup, system, goal, already
- ProductBacklog/ImaginationVisualization/plans/goal-epics-upi-standalone.md — matches state, progress, setup, system, goal, already
- ai-sessions/claude/projects/-home-openclaw-workspaces-shard/4adbcb3f-dadd-4417-aa39-2d70cb2aa4df/tool-results/bz8a0dspo.txt — matches state, progress, tracking, system, goal, already
- CHANGELOG.md — matches state, detection, system, goal, already
- README.md — matches state, progress, system, goal, already
- plans/PLAN-05-merge-worthiness-judge.md — matches state, setup, system, goal, already
- plans/PLAN-07-failure-mode-defenses.md — matches state, detection, system, goal, already
- plans/architecture/01-imagination-layer.md — matches state, detection, progress, system, already
- universal-memory/server/ws_handler.py — matches state, detection, system, goal, already
- ProductBacklog/ImaginationVisualization/docs/VISUALISATION_LAYER_ANALYSIS.md — matches state, progress, tracking, goal, already


## Spec [by architect @ 2026-04-22T20:39:31.086653+00:00]

# Spec for abeb6f0c-07db-41ca-ab0a-7c2627afee1d

## Goal
Add state detection and progress tracking to the setup wizard system.

Goal: When LinkedInPost is already configured, the setup wizard should show the current state instead of walking through everything from scratch.

Requirements:
1. Create a SetupStateService that detects and persists setup state:
   - Check which environment variables are set/unset by parsing .env files (frontend/.env, worker/.dev.vars)
   - Detect which social media accounts are connected (LinkedIn token, etc.)
   - Detect worker/cloudflare deployment status
   - Detect if generation-worker is configured

2. Add SetupState type with fields:
   - envVars: { name, value, isSet }[] for all required env vars
   - integrations: { name, connected, config }[] for LinkedIn, etc.
   - workers: { name, deployed, status }[] for generation-worker, etc.
   - overallProgress: percentage complete

3. Modify SetupWizard to:
   - Load current state on init
   - Show status dashboard instead of step-by-step if already configured
   - Allow jumping to specific incomplete sections
   - Display green checkmarks for completed items, warnings for missing

4. Add setupStateService.ts in frontend/src/features/setup-wizard/:
   - readState() - reads current config from filesystem/API
   - saveState() - persists state to localStorage or config file
   - detectEnvVars() - parses .env files to detect configured vars
   - detectIntegrations() - checks API for connected accounts

5. Create modular code with separation of concerns:
   - Types in types.ts
   - State detection in service classes
   - UI components purely presentational

Claimed scope: frontend/src/features/setup-wizard/**

## Touched Files (expected)
- plans/PLAN-06-reflexion-skill-library.md
- ProductBacklog/ImaginationVisualization/plans/goal-epics-upi-standalone.md
- ai-sessions/claude/projects/-home-openclaw-workspaces-shard/4adbcb3f-dadd-4417-aa39-2d70cb2aa4df/tool-results/bz8a0dspo.txt
- CHANGELOG.md
- README.md
- plans/PLAN-05-merge-worthiness-judge.md
- plans/PLAN-07-failure-mode-defenses.md
- plans/architecture/01-imagination-layer.md
- universal-memory/server/ws_handler.py
- ProductBacklog/ImaginationVisualization/docs/VISUALISATION_LAYER_ANALYSIS.md

## Constraints
- Keep changes minimal and in-scope.
- Do not touch unrelated modules.

**claimed_scope:**
- ProductBacklog/ImaginationVisualization/plans/goal-epics-upi-standalone.md


## Coder Notes [by coder @ 2026-04-22T20:39:52.104642+00:00]

winner=8718c11c2d72  score=85
approach=conservative-inline-edit
files=['ProductBacklog/ImaginationVisualization/plans/goal-epics-upi-standalone.md']


## Commit [by committer @ 2026-04-22T20:39:52.107359+00:00]

sha=c412137f1b24
files=['ProductBacklog/ImaginationVisualization/plans/goal-epics-upi-standalone.md']


## PR [by committer @ 2026-04-22T20:39:52.108557+00:00]

url=https://example.invalid/execlayer/pr/c412137f1b24
