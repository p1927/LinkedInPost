# LinkedIn-Post Channel Bot: Business User Journeys & Wiring Audit

## Overview

This document audits the application's core user journeys, from content ideation through multi-channel publishing. Each journey maps user actions → frontend components → backend APIs → expected outcomes and wiring status.

**Wiring Status:** ✅ WIRED | ⚠️ PARTIAL | ❌ BROKEN | 🔍 UNTESTED

---

## WIRING STATUS UPDATE

**As of April 23, 2026:** Major wiring issues identified in the 80-path technical audit have been resolved:

| Path | Issue | Status | Resolution |
|------|-------|--------|-----------|
| PATH-052 | WhatsApp missing from `/connections` | ✅ RESOLVED | WhatsApp card added to SOCIAL_PROVIDERS array; OAuth flow wired |
| PATH-053 | Telegram missing from `/connections` | ✅ RESOLVED | Telegram verification section added below Publishing Channels |
| PATH-057 | `listRules` error handling | ✅ RESOLVED | Now uses `checkedFetch` which validates `res.ok` and throws on 403/500 |
| PATH-060 | `lookupEffectiveRule` error handling | ✅ RESOLVED | Now uses `checkedFetch` with proper error validation |
| PATH-062 | YouTube webhook shows unsupported button | ✅ RESOLVED | Conditional rendering hides webhook form for YouTube; shows informational message instead |
| PATH-041 | WhatsApp only accessible via Settings drawer | ✅ RESOLVED | Now accessible from `/connections` page (same as PATH-052) |

**Result:** All critical wiring gaps are now WIRED. Application is ready for end-to-end user flow validation.

---

## Journey 1: LinkedIn Content Creation (Core Loop)

**Goal:** User ideates a topic, generates AI drafts, reviews and edits the content, and publishes to LinkedIn.

### Step 1: User Visits App & Authenticates
| User Action | Component | API Action | Expected Outcome | Wiring |
|---|---|---|---|---|
| Visit `/` unauthenticated | `App.tsx` | — | Google Sign-In button displayed | ✅ |
| Click "Sign in with Google" | `GoogleLoginButton` | — | Google OAuth popup | ✅ |
| Authorize app | `App.tsx` onSuccess | `bootstrap` | Session loaded; `idToken` stored; redirect to `/` (authenticated) | ✅ |
| Session expires mid-session | All API calls in `backendApi.ts:post()` | 401 response | Token cleared; user redirected to sign-in | ✅ |

**Wiring Notes:** All paths guarded by `idToken` check in `App.tsx`. Every API call validates `res.ok` and forwards 401 errors.

---

### Step 2: User Lands on Dashboard & Sees Topic Queue
| User Action | Component | API Action | Expected Outcome | Wiring |
|---|---|---|---|---|
| Authenticated user navigates to `/` | `DashboardQueue` component | `getRows` | List of all topics displayed with status (Draft/Approved/Published) | ✅ |
| Rows load | `DashboardQueue` | `getRows` merges Sheets rows + D1 pipeline state | If Sheets fails, rows from D1 only; no UI error | ✅ |
| No topics exist (fresh account) | `DashboardQueue` + onboarding check | — | Onboarding wizard shown if `onboardingCompleted = false` | ✅ |

**Wiring Notes:** `useDashboardQueue.ts` calls `api.getRows()` on mount. Worker gracefully falls back to D1 if Sheets unavailable.

---

### Step 3: User Creates New Topic (Scratchpad)
| User Action | Component | API Action | Expected Outcome | Wiring |
|---|---|---|---|---|
| Navigate to `/add-topic` | `AddTopicPage` | — | "Scratchpad" form shown with 7 fields | ✅ |
| Fill in topic title | Input field | — | Title stored in local state | ✅ |
| Fill in "About" context | `DocTextarea` | — | Context stored | ✅ |
| Fill in "Message to convey" | `DocTextarea` | — | Key takeaway stored | ✅ |
| Select writing style (Professional/Storytelling/etc.) | Style picker pills | — | Style selected | ✅ |
| Paste research notes/scratchpad | `DocTextarea` label: "Paste links, quotes, stats, anecdotes..." | — | Notes stored | ✅ |
| Click "Generate insights" | `handleAnalyzeInsights` | `analyzeTopicInsights` | Pro/con bullet points generated and displayed | ✅ |
| Submit form | `handleSubmit` | `addTopic(idToken, topic, topicMeta)` | Topic row appended to Google Sheet; user redirected to `/dashboard` | ✅ |

**Wiring Notes:** `AddTopicPage` → `backendApi.addTopic()` → worker `case 'addTopic'` → `appendRowToSheet()`.

---

### Step 4: User Generates AI Draft from Topic
| User Action | Component | API Action | Expected Outcome | Wiring |
|---|---|---|---|---|
| In DashboardQueue, click "Generate draft" on a topic | `DashboardQueue` row action | Opens `GenWorkerDraftField` dialog | Dialog shown with Audience/Tone/CTA/Constraints chip selector | ✅ |
| Fill in generation parameters (Audience chips, Tone, CTA, Constraints text) | `GenWorkerDraftField` | — | Values stored in dialog state | ✅ |
| Click "Generate" button | Dialog submit | `streamCallGenerationWorker(idToken, spreadsheetId, request)` | SSE stream starts; progress events shown; spinner visible | ✅ |
| Generation stream completes | SSE `/api/generate/stream` | Complete event received with `result.variants[]` | Up to 4 variant texts extracted | ✅ |
| User reviews generated variants in dialog | Inline preview | — | Variants displayed as selectable cards | ✅ |
| Click "Save & Continue" | Dialog submit | `saveDraftVariants(row, variants)` | Variants written to Google Sheet; dialog closes | ✅ |

**Wiring Notes:** Frontend SSE stream directly from `POST /api/generate/stream`. Worker response includes `variants`, `imageCandidates`, `review` fields. Guarded by `FEATURE_CONTENT_FLOW` flag.

---

### Step 5: User Reviews Variants & Picks One
| User Action | Component | API Action | Expected Outcome | Wiring |
|---|---|---|---|---|
| Click topic row in DashboardQueue | Link to topic | — | Navigate to `/review` | ✅ |
| ReviewWorkspace mounts | `ReviewWorkspace` component | Fetches row data; sets `showPickPhase = true` | Variant carousel rendered | ✅ |
| Swipe through 4 variants | `VariantCarousel` | — | User reads each variant text | ✅ |
| Click "Select this variant" on one | `handleLoadSheetVariant` | No API call (local state) | `showEditorLayout = true`; variant loaded into editor state | ✅ |

**Wiring Notes:** `useReviewFlow` context manages phase switching. No API call during selection.

---

### Step 6: User Reviews & Edits Draft
| User Action | Component | API Action | Expected Outcome | Wiring |
|---|---|---|---|---|
| Editor loads | `EditorScreen` (3-panel layout) | — | Left: Refine/Media/Topic-Rules/Email tabs; Center: textarea; Right: live channel preview | ✅ |
| User reads draft text | `DraftEditor` textarea | — | Variant text displayed | ✅ |
| User selects text & clicks "Tighten spacing" | Scope toolbar action | `generateQuickChange(selectedText)` preview | Inline preview of tightened version shown | ✅ |
| User reviews preview & clicks "Apply" | Preview card | Local state update | Textarea updated; undo/redo history pushed | ✅ |
| User types manually in textarea | `DraftEditor` | `onChange` → `pushHistoryEntry()` | Undo/redo stack grows (max 100 entries) | ✅ |
| User presses Ctrl+Z | Keyboard shortcut | `popHistoryEntry()` | Text reverts to prior state | ✅ |
| User adds an image | Click Media tab → `ImageAssetManager` | `fetchDraftImages(topic, count)` or `uploadDraftImage(file)` | Image inserted into preview; `selectedImageUrls` updated | ✅ |

**Wiring Notes:** Editor is a controlled textarea with rich undo/redo. Quick Change uses `generateQuickChange` action. Media manager handles fetch (search) and upload (local file).

---

### Step 7: User Publishes to LinkedIn
| User Action | Component | API Action | Expected Outcome | Wiring |
|---|---|---|---|---|
| Footer: click "Publish Now" button | `EditorScreen` footer action | — | Validation: message non-empty, channel selected | ✅ |
| Validation passes | `handlePublishNow` | `updateRowStatus(status='Approved', selectedText, ...)` | Row status written to Sheet | ✅ |
| Row status updated | `publishFromReviewEditor()` | `publishContent(idToken, { row, channel: 'linkedin', message, imageUrl })` | API call sent to worker | ✅ |
| Worker receives publish request | `/v1/messages` handler → `publishContent` | Calls `publishLinkedInPost` | Post sent to LinkedIn via OAuth token | ✅ |
| LinkedIn API responds successfully | `handlePublishLinkedInPostResponse` | Returns `{ deliveryMode: 'sent', timestamp }` | Frontend shows success alert; topic status set to "Published" | ✅ |
| User clicks "View on LinkedIn" in alert | Link in success alert | Redirect to LinkedIn post URL | LinkedIn profile opened in new tab | ✅ |

**Wiring Notes:** `publishContent` action in worker dispatches to channel-specific handler. LinkedIn requires OAuth token stored from `PATH-038` (startLinkedInAuth). Response includes `deliveryMode` (sent|queued|failed).

---

## Journey 2–5: Multi-Channel Variations (Instagram, Gmail, Telegram, WhatsApp)

All follow same scratchpad→draft→review→publish loop as Journey 1, with channel-specific differences:

| Channel | Key Difference | Wiring |
|---------|----------------|--------|
| **Instagram** | Media tab emphasized; `imageUrls` array (carousel support) | ✅ |
| **Gmail** | Email tab with To/CC/BCC/Subject fields | ✅ |
| **Telegram** | Requires chat ID verification + recipientId selection | ✅ |
| **WhatsApp** | Meta Cloud API two-step (OAuth popup → phone selector) | ✅ |

---

## Journey 6: Channel Connection Setup (All Channels)

### Status Summary
All channels can now be configured from `/connections` page:
- **LinkedIn, Instagram, Gmail:** OAuth redirect flow → token stored in D1
- **Telegram:** Chat ID verification via `verifyTelegramChat()` → cached locally
- **WhatsApp:** OAuth popup (`startWhatsAppAuth`) → phone selector (`completeWhatsAppConnection`) → phone ID stored in D1

**Wiring Status:** ✅ WIRED (All paths resolved)

---

## Journey 7: Scheduled Publishing

User schedules posts to fire at future time; Durable Object alarms trigger sends; user can cancel before firing.

**Wiring Status:** ✅ WIRED

---

## Journey 8: Bulk Campaign Import

User uploads CSV → worker appends rows to Google Sheet → topics appear in queue.

**Wiring Status:** ✅ WIRED

---

## Journey 9: AI Refinement Loop (In-Editor)

User selects text → Quick Change or 4 Variants preview → clicks Apply to commit.

**Wiring Status:** ✅ WIRED

---

## Journey 10: Automation Rules (Admin Only)

Admin creates rules with platform/channel/triggers → auto-publishes or auto-refines on trigger.

**Wiring Status:** ✅ WIRED (Fixed: `listRules` and `lookupEffectiveRule` now use `checkedFetch` with proper error handling. YouTube webhook guard in place.)

---

## Journey 11: Trending & Research

User discovers trending topics via YouTube/LinkedIn panels; searches news articles via aggregated provider APIs.

**Wiring Status:** ✅ WIRED (News research backend fully wired; trending panels have browser-direct API calls, fallback to mock data)

---

## Journey 12: Feed Enrichment & Debate Mode

**Goal:** While editing a draft, the user can pull complementary or contrarian context from the feed (related articles, debate angles, cross-domain examples, opinion-leader takes) without leaving the editor.

| User Action | Component | API Action | Expected Outcome | Wiring |
|---|---|---|---|---|
| Open `/feed` from the app sidebar | `FeedPage` | `getFeedArticles` (and `refreshFeedArticles` on demand) | Articles list with feedback controls | ✅ |
| Cluster gathered clips on a draft | Editor sidebar | `clusterDraftClips` | Clips grouped by theme; surfaced inline | ✅ |
| Click "Find related drafts" on an article | Feed enrichment panel | `findDraftConnections` | Related topics/drafts surfaced for re-use | ✅ |
| Switch to **Debate Mode** in editor | `DebateModeView` | `findDebateArticle` | Counter-stance article retrieved and pinned alongside the draft | ✅ |
| Request "Cross-domain insight" | Enrichment workspace | `crossDomainInsight` | Analogous example pulled from a different industry/topic | ✅ |
| Request "Opinion-leader takes" | Enrichment workspace | `opinionLeaderInsights` | Curated quotes/positions from notable voices | ✅ |
| Analyze a single article inline | Feed item action | `analyzeFeedArticle` | Per-article analysis (angle, hook, key facts) returned and rendered | ✅ |

**Wiring Notes:** All five enrichment actions live in the worker action dispatcher. Feed UI is gated by `FEATURE_NEWS_RESEARCH`; the enrichment workspace at `/enrichment` is gated by `FEATURE_ENRICHMENT`. Browser → `POST /action` → worker case → LLM provider (default Gemini, or per-user override).

---

## End-to-End Testing (Next Phase)

All wiring is complete. Next priority: Validate core user flows end-to-end with E2E tests.

### E2E Test Matrix
- [ ] `Journey 1: LinkedIn Content Creation` — scratchpad → draft → review → publish
- [ ] `Journey 2: Instagram Content Creation` — same flow, multi-image focus
- [ ] `Journey 3: Gmail Campaign` — same flow, email headers
- [ ] `Journey 4: Telegram Delivery` — same flow, chat ID selection
- [ ] `Journey 5: WhatsApp Delivery` — same flow, phone selection
- [ ] `Journey 6: Channel Connection Setup` — OAuth + verification flows for all channels
- [ ] `Journey 7: Scheduled Publishing` — publish with future date; cancel before fire
- [ ] `Journey 8: Automation Rules` — create rule; verify trigger on publish
- [ ] `Journey 9: Error Handling` — verify error states when API calls fail

### Test Infrastructure Needed
1. Auth bypass: `loginAsTestUser()` via `DEV_AUTH_BYPASS_SECRET`
2. API mocking: `page.route()` handlers for common actions
3. Test data helpers for topic/row creation
4. Screenshots/video capture for debugging

### Running Tests
```bash
cd frontend
npm run test:e2e                # Run all tests headlessly
npm run test:e2e:ui             # Run with UI mode
npm run test:e2e:headed         # Run with visible browser
```

---

## Summary

**Wiring Status: 100% WIRED**

The application is fully wired for all core user journeys. All identified wiring gaps from the technical 80-path audit have been resolved:
- ✅ WhatsApp and Telegram now available on `/connections` page
- ✅ Error handling fixed in automations API (`listRules`, `lookupEffectiveRule`)
- ✅ YouTube webhook guard prevents user from registering unsupported webhooks

**Recommendation:** Proceed with comprehensive E2E test suite to validate all journeys end-to-end with real user interactions.
