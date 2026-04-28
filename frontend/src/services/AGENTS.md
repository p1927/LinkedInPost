<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-28 | Updated: 2026-04-28 -->

# frontend/src/services

## Purpose
Backend API client and configuration service abstractions. All communication with the Cloudflare Worker backend goes through `backendApi.ts`. Configuration and feature flags are accessed via `configService.ts`.

## Key Files

| File | Description |
|------|-------------|
| `backendApi.ts` | Typed HTTP client for all backend endpoints — the primary hot path (28x edits per project memory) |
| `configService.ts` | Reads and caches app configuration and feature flags from the backend |
| `sheets.ts` | Google Sheets data types and access helpers |
| `imageUrls.ts` | Image URL construction utilities |
| `selectedImageUrls.ts` | Selected image URL state helpers |
| `deliveryImageUrl.ts` | Delivery-optimized image URL helpers |

## For AI Agents

### Working In This Directory
- All new API endpoints must be added to `backendApi.ts` — never call `fetch()` directly from components
- `backendApi.ts` methods receive `idToken: string` as the first argument for auth
- `sheets.ts` defines the `SheetRow` type used across campaign and review features
- When adding a new method to `backendApi.ts`, add the corresponding type imports and return types

### Common Patterns
- All methods in `backendApi.ts` are `async` and throw on non-OK responses
- `configService.ts` is a singleton — import the default export
- `SheetRow` from `sheets.ts` is the primary CMS data type for posts/drafts

<!-- MANUAL: -->
