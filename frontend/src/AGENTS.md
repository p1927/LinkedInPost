<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src

## Purpose
All application source code for the React frontend. Organized by feature (`features/`), shared UI components (`components/`), service abstractions (`services/`), custom hooks (`hooks/`), utility libraries (`lib/`), and third-party integrations (`integrations/`).

## Key Files

| File | Description |
|------|-------------|
| `main.tsx` | React app entry point — mounts `<App />` into the DOM |
| `App.tsx` | Root component — routing, auth context, global layout |
| `index.css` | Global CSS including Tailwind base, glass-morphism utilities |
| `vite-env.d.ts` | Vite environment type declarations |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `features/` | Feature modules — each self-contained with components, hooks, types (see `features/AGENTS.md`) |
| `components/` | Shared UI components used across features (see `components/AGENTS.md`) |
| `services/` | Backend API client and config service (see `services/AGENTS.md`) |
| `hooks/` | Shared custom React hooks |
| `lib/` | Utility libraries: motion variants, date helpers, etc. |
| `pages/` | Top-level page components wired to routes |
| `integrations/` | Third-party integration UI (OAuth flows, etc.) |
| `utils/` | Pure utility functions |
| `assets/` | Static assets imported into components |
| `generated/` | Auto-generated type files (do not edit manually) |
| `plugins/` | Frontend plugin system |
| `test/` | Shared test utilities and fixtures |

## For AI Agents

### Working In This Directory
- Use `@/` alias for all imports within `src/` (e.g. `import { foo } from '@/lib/utils'`)
- Feature code belongs in `features/<feature-name>/`; do not put feature-specific code in `components/`
- Shared components used by 2+ features go in `components/ui/` or `components/`
- Do not edit files in `generated/` — they are auto-generated

### Common Patterns
- Feature modules export their main page component as the default from `index.tsx`
- Custom hooks are prefixed with `use` and live either in the feature's `hooks/` or `src/hooks/`
- All API calls go through `services/backendApi.ts` — never fetch directly

<!-- MANUAL: -->
