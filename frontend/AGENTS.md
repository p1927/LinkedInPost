<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend

## Purpose
React 18 + Vite + Tailwind CSS single-page application. Provides the full user interface: news feed browsing, article clipping, post drafting, campaign management, scheduling, and settings. Communicates with the Cloudflare Worker backend via `src/services/backendApi.ts`.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Frontend dependencies and npm scripts (dev, build, test, lint) |
| `vite.config.ts` | Vite build configuration with path aliases (`@/` → `src/`) |
| `tailwind.config.js` | Tailwind theme extensions (glass morphism tokens, custom colors) |
| `tsconfig.app.json` | TypeScript config for application source |
| `playwright.config.ts` | Playwright E2E test configuration |
| `vitest.config.ts` | Vitest unit test configuration |
| `index.html` | HTML entry point |
| `components.json` | shadcn/ui component registry config |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | All application source code (see `src/AGENTS.md`) |
| `tests/` | Playwright E2E test suites |
| `design-system/` | Design tokens, Storybook stories, style references |
| `public/` | Static assets served as-is |
| `scripts/` | Build-time helper scripts |
| `server/` | Vite dev-server proxy configuration |

## For AI Agents

### Working In This Directory
- Run `npm run dev` to start the development server (usually port 5173)
- Run `npx tsc --noEmit` to compile-check without emitting files — do this before every commit
- Path alias `@/` resolves to `src/`; always use it for cross-feature imports
- Tailwind classes use custom design tokens defined in `tailwind.config.js` (e.g. `text-ink`, `text-muted`, `bg-primary`, `glass-panel`)

### Testing Requirements
- Unit: `npm run test` (Vitest)
- E2E: `npx playwright test` (requires dev server running or `webServer` config)
- Always compile-check before merging: `npx tsc --noEmit`

### Common Patterns
- Feature-based folder structure under `src/features/`
- Shared UI primitives in `src/components/ui/`
- API calls go through `src/services/backendApi.ts` (typed wrapper)
- Framer Motion used for all animations; import variants from `src/lib/motion.ts`
- Glass morphism styling via `glass-panel` and `glass-header` Tailwind utilities

## Dependencies

### Internal
- `src/services/backendApi.ts` — all backend API calls
- `src/lib/motion.ts` — shared animation variants

### External
- React 18, React DOM — UI framework
- Vite — build tool and dev server
- Tailwind CSS — utility styling
- Framer Motion — animations
- Lucide React — icons
- shadcn/ui — accessible component primitives
- Playwright — E2E testing
- Vitest — unit testing

<!-- MANUAL: -->
