<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/components

## Purpose
Shared UI components used across multiple features. Includes low-level primitives (`ui/`), layout components (`workspace/`, `dashboard/`), and app-wide overlays and providers.

## Key Files

| File | Description |
|------|-------------|
| `AlertProvider.tsx` | Global alert/toast provider |
| `Dialog.tsx` | Shared modal dialog component |
| `ErrorBoundary.tsx` | React error boundary for graceful error display |
| `GoogleLoginButton.tsx` | Google OAuth sign-in button |
| `HelpOverlay.tsx` | Keyboard shortcut help overlay |
| `ImageAssetManager.tsx` | Image asset browsing and selection |
| `ImageGenReferencePanel.tsx` | AI image generation reference panel |
| `Tour.tsx` | Product tour/onboarding walkthrough |
| `useAlert.ts` | Hook to trigger alerts from the AlertProvider |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `ui/` | Low-level primitives: buttons, inputs, badges, empty states, skeletons, etc. |
| `workspace/` | App shell — sidebar navigation, layout wrapper |
| `dashboard/` | Dashboard-specific components (queue, settings drawer, tabs) |
| `channel-previews/` | Social channel post preview renderers |
| `llm/` | LLM interaction UI components (streaming, model selector) |
| `marketing/` | Marketing/landing page components |

## For AI Agents

### Working In This Directory
- `ui/` components are purely presentational — no business logic, no API calls
- If a component is used in only one feature, put it in that feature's `components/` folder instead
- `workspace/AppSidebar.tsx` is the main navigation — edit carefully, it affects all pages

### Common Patterns
- UI primitives accept a `className` prop for Tailwind overrides
- Use `cn()` from `@/lib/cn` for conditional class merging
- Empty states, error banners, and loading skeletons are in `ui/`

<!-- MANUAL: -->
