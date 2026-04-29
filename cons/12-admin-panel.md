# 12. Admin Panel

> **Stakeholders:** SaaS admins. Productivity directly affects activation latency for new users.
> **Source files:** [`features/saas/AdminPanel.tsx`](../frontend/src/features/saas/AdminPanel.tsx).
> **Mockups:** [`mockups/admin-concept-a.html`](mockups/admin-concept-a.html), [`admin-concept-b.html`](mockups/admin-concept-b.html), [`admin-concept-c.html`](mockups/admin-concept-c.html), [`admin-v2-minimal.html`](mockups/admin-v2-minimal.html), [`admin-v2-refined-glass.html`](mockups/admin-v2-refined-glass.html), [`admin-v3.html`](mockups/admin-v3.html), [`admin-v4.html`](mockups/admin-v4.html).
> **Pairs with:** (no existing audit covers this — new surface for the cons folder).

## What this surface is

SaaS admin: waitlist approval, user list with token usage bars, suspend, change-budget. Single page at `/admin` (admin-only).

## Cons — 4 perspectives

### 👤 User (admin role)
- Budget changes via `window.prompt()` — no confirmation, no validation.
- Waitlist has Approve only; no Deny.
- User list doesn't sort or filter — long lists become unusable.
- No search by email.
- No audit log of who I approved or suspended.

### 🎨 UX
- `[HIGH]` `prompt()` for budget input is jarring and unbranded.
- `[MED]` The token-usage colour scale (green/amber/red) is the only signal — colourblind-unfriendly.
- `[MED]` Refresh button is the only data-fetch trigger; auto-refresh missing.
- `[MED]` No empty state for waitlist (just "no items").
- `[LOW]` Modes (SaaS / Self-Hosted) badge is informative but not actionable.

### 📦 Product Owner
- `[HIGH]` No CSV export for users / waitlist.
- `[HIGH]` No batch operations (approve N, suspend N, set budget for N).
- `[MED]` No request-date or geo info on waitlist entries.
- `[MED]` No invite-by-email proactive flow.
- `[MED]` No audit trail.

### 💼 Stakeholder
- `[HIGH]` Lack of audit trail is a compliance risk if the product targets enterprises.
- `[MED]` Admin productivity directly affects activation latency for new SaaS users.

## Fixes

### Phase 1 — Quick wins (≤2 wk)
- [ ] **[HIGH]** [`AdminPanel.tsx`](../frontend/src/features/saas/AdminPanel.tsx) — replace `prompt()` with a styled budget-edit modal supporting validation (positive int, ≤ plan max).
- [ ] **[HIGH]** Add Deny to waitlist row (with optional reason field) → calls a new `denyUserAccess` endpoint.
- [ ] **[HIGH]** Add a search box filtering users by email + name.
- [ ] **[MED]** Add sort menu: by usage %, by budget, by created_at, by status.
- [ ] **[MED]** Show waitlist request date + (if available) geo on each row.

### Phase 2 — Structural (3-6 wk)
- [ ] **[HIGH]** Batch-select on user list with bulk Suspend / Restore / Set-budget; bulk Approve / Deny on waitlist.
- [ ] **[HIGH]** Audit log table: who, action, target, when. Export-as-CSV.
- [ ] **[MED]** Status pill replaces colour-only usage signal: "OK / Near limit / Over". Tooltip with exact numbers.
- [ ] **[MED]** CSV export for users + waitlist.

### Phase 3 — Strategic (6-12 wk)
- [ ] **[MED]** Invite-by-email flow with self-serve onboarding link.
- [ ] **[MED]** Plan management (move user between Free/Pro/Enterprise) with token rebalancing.
- [ ] **[MED]** Activity feed widget on the dashboard ("3 approvals pending, 2 users near limit today").
- [ ] **[LOW]** Per-org tenancy controls (when multi-tenant ships).

## Done when

- No `prompt()` calls remain in admin flows.
- Waitlist Approve and Deny both exist.
- User list is searchable, sortable, batch-actionable.
- Audit log records every admin write.
- CSV export works for both users and waitlist.
