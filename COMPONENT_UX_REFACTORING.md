# Component UX Refactoring Plan: Topics, Review, Editing & Preview

**Goal:** Apply UX best practices to all dashboard, review, editor, and preview components

**Based on:** 2026 UX principles (Hick's Law, Fitts's Law, F-pattern, progressive disclosure)

**Estimated Time:** 3-4 hours

---

## Current State Analysis

### Issues Found

**DashboardQueue (Topics List):**
- ❌ Multiple action buttons per row (too many choices)
- ⚠️ Cursor-pointer missing on some interactive elements
- ⚠️ Row hover states could be more prominent
- ⚠️ Spacing inconsistent (mix of sizes)

**ReviewWorkspace (Variant Selection & Editor):**
- ⚠️ Two screens (variants + editor) but unclear primary action
- ❌ Could benefit from clearer step indication
- ⚠️ Button placement needs review

**EditorScreen:**
- ✅ Good layout (sidebar + editor + preview)
- ⚠️ Footer buttons: secondary action (Back) should be on LEFT
- ⚠️ Primary button (Approve) positioning could be clearer

**ApprovedPostPreview:**
- ✅ Modal structure is good
- ⚠️ Close button could have better hover feedback
- ⚠️ Mobile responsiveness could be tighter

**Channel Previews (Shared):**
- ✅ Good helper functions
- ⚠️ No UX issues found (utilities only)

---

## Task Breakdown

### Task 1: Fix DashboardQueue Row Layout

**Files to Modify:**
- `frontend/src/components/dashboard/tabs/DashboardQueue.tsx`

**Current Issues:**
- Row has too many action buttons visible at once
- Inconsistent cursor-pointer usage
- Hover states not prominent enough

**Implementation:**

1. **Primary Action Per Row:** 
   - Main action: Click row title to "navigate" (preview or edit)
   - Secondary: "More" menu with: Publish, Delete, Share
   - Status indicator: Badge showing draft/scheduled/failed

2. **Button Organization:**
   - Remove: Inline delete/publish buttons from row
   - Keep: Title link + status badge + action menu
   - Pattern: [Topic Name] [Status] [⋯ More]

3. **Hover State:**
   - Row background: Light hover (white/40)
   - Cursor: pointer on row
   - Transition: 200ms smooth

**Code Changes:**

In DashboardQueue, find the row render section (~line 150+) and:

```tsx
// OLD: Multiple buttons per row
<div className="flex gap-2">
  <Button>Edit</Button>
  <Button>Publish</Button>
  <Button>Delete</Button>
</div>

// NEW: Primary action + menu
<div className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-white/40 transition-colors duration-200 p-3 rounded-lg"
  onClick={() => onTopicNavigate(row)}
>
  <div className="flex-1">
    <p className="text-sm font-semibold text-ink">{row.topic}</p>
  </div>
  <Badge>{getQueueStatusVariant(row.status)}</Badge>
  <Menu>
    <MenuButton>⋯</MenuButton>
    <MenuItem>Publish</MenuItem>
    <MenuItem>Delete</MenuItem>
  </Menu>
</div>
```

**Verification:**
- [ ] Each row is clickable (pointer cursor)
- [ ] Hover state visible (light background change)
- [ ] "More" menu has secondary actions
- [ ] Status badge visible and color-coded

---

### Task 2: Improve Review Workflow Navigation

**Files to Modify:**
- `frontend/src/features/review/ReviewWorkspace.tsx`
- `frontend/src/features/review/components/ReviewHeader.tsx`

**Current Issues:**
- Step indication unclear
- Two screens but flow not obvious
- Back button behavior unclear

**Implementation:**

1. **Add Step Indicator:**
   - Show "Step 1 of 2: Select Variant" or "Step 2 of 2: Refine & Approve"
   - Place in header (centered or top-left after back button)

2. **Clarify Back Navigation:**
   - Back button: Always go to previous screen or Topics
   - Never lose data (save draft state)

3. **Clear Primary Action:**
   - Step 1: "Continue to Edit" button
   - Step 2: "✓ Approve & Publish" button

**Code Changes:**

In ReviewHeader, add step indicator:

```tsx
// NEW: Add to ReviewHeader
<div className="flex items-center gap-3">
  <Button variant="ghost" size="sm" onClick={onBack}>
    ← Back
  </Button>
  
  <div className="text-sm text-muted">
    Step {currentStep} of 2
  </div>
  
  <div className="flex-1" />
  
  <h2 className="text-lg font-semibold text-ink">
    {currentStep === 1 ? 'Select Variant' : 'Refine & Approve'}
  </h2>
</div>
```

**Verification:**
- [ ] Step indicator visible in header
- [ ] Current step highlighted
- [ ] Back button always available
- [ ] Next/continue button obvious

---

### Task 3: Fix EditorScreen Button Placement

**Files to Modify:**
- `frontend/src/features/review-editor/screens/EditorScreen.tsx`

**Current Issues:**
- "Back" button on left (correct) but not obvious as secondary
- "Approve" button secondary positioning not ideal
- Buttons could use better visual hierarchy

**Implementation:**

Following the rule: Secondary (LEFT) + Primary (RIGHT)

**Code Changes:**

Current (line 51-73):
```tsx
// OLD: Buttons in wrong order/styling
<footer className="...">
  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
    <Button variant="secondary" onClick={leaveToTopics}>
      Back to topics
    </Button>
    <Button variant="primary" onClick={handleApprove}>
      Approve draft
    </Button>
  </div>
</footer>
```

**NEW:**
```tsx
<footer className="shrink-0 border-t border-violet-200/35 px-4 py-3.5 sm:px-5">
  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
    {/* Left side: Secondary action */}
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={leaveToTopics}
      className="min-h-[44px] w-full cursor-pointer transition-colors duration-200 sm:w-auto"
    >
      ← Back to topics
    </Button>
    
    {/* Right side: Primary action */}
    <Button
      type="button"
      size="sm"
      variant="primary"
      onClick={() => void handleApprove()}
      disabled={submitting}
      className="min-h-[44px] w-full cursor-pointer shadow-[0_6px_20px_rgba(124,58,237,0.32)] transition-all duration-200 hover:shadow-[0_10px_28px_rgba(109,40,217,0.36)] disabled:opacity-75 sm:w-auto"
    >
      {submitting ? 'Approving…' : '✓ Approve & Publish'}
    </Button>
  </div>
</footer>
```

**Key Changes:**
- Primary on RIGHT (justify-between keeps them apart)
- Secondary on LEFT (ghost style, subtle)
- Button heights 44px minimum (touch-friendly)
- Better visual hierarchy (primary has shadow, secondary ghost)

**Verification:**
- [ ] Back button clearly on left, subtle
- [ ] Approve button clearly on right, prominent
- [ ] Both buttons 44px minimum height
- [ ] Spacing between buttons clear

---

### Task 4: Improve ApprovedPostPreview Modality

**Files to Modify:**
- `frontend/src/components/ApprovedPostPreview.tsx`

**Current Issues:**
- Close button styling could be more obvious on hover
- Modal backdrop could use better focus management
- Responsive layout could be tighter on mobile

**Implementation:**

1. **Better Close Button:**
   - Add hover effect (shadow or background change)
   - Make cursor-pointer obvious

2. **Improved Mobile Layout:**
   - Stack sections vertically on mobile
   - Ensure buttons full-width on mobile

3. **Better Contrast:**
   - Close button: Better hover state

**Code Changes:**

Find close button (~line 40-49):

```tsx
// OLD
<Button
  type="button"
  variant="secondary"
  size="icon-lg"
  onClick={onClose}
  className="glass-inset size-11 rounded-full text-muted hover:bg-white/85 hover:text-ink"
  aria-label="Close preview"
>
  <X className="h-4 w-4" />
</Button>

// NEW: Add cursor pointer, better hover, transition
<button
  type="button"
  onClick={onClose}
  className="cursor-pointer rounded-full bg-white/60 p-2.5 text-muted transition-all duration-200 hover:bg-white/90 hover:text-ink focus:ring-2 focus:ring-primary focus:outline-none"
  aria-label="Close preview"
>
  <X className="h-5 w-5" />
</button>
```

**Also fix mobile layout** (~line 52):

```tsx
// OLD
<div className="grid flex-1 gap-0 overflow-y-auto overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_360px]">

// NEW: Better mobile spacing
<div className="grid flex-1 gap-0 overflow-y-auto overflow-x-hidden sm:gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
  {/* Main content */}
  <section className="...">
    {/* Full width on mobile, with scroll */}
  </section>
  
  {/* Sidebar - stack below on mobile */}
  <aside className="flex flex-col border-t sm:border-t border-white/40 bg-white/20 px-5 py-5 xl:min-h-0 xl:border-l xl:border-t-0 xl:px-6 xl:py-8">
    {/* Sidebar content */}
  </aside>
</div>
```

**Verification:**
- [ ] Close button: pointer cursor on hover
- [ ] Close button: Better hover effect (darker background)
- [ ] Modal responsive on mobile (no overflow)
- [ ] Sidebar visible on mobile (can scroll)

---

### Task 5: Standardize Transitions Across Components

**Files to Modify:**
- `frontend/src/components/dashboard/tabs/DashboardQueue.tsx`
- `frontend/src/components/ApprovedPostPreview.tsx`
- `frontend/src/features/review-editor/screens/EditorScreen.tsx`

**Issue:** Inconsistent transition timing (some 200ms, some 300ms, some missing)

**Standard to Apply Everywhere:**
- Hover state: `transition-colors duration-200`
- Loading state: No transition (instant spinner)
- Modal: `transition-opacity duration-200`
- Button: `transition-all duration-200`

**Changes:**

Add to all interactive elements:
- Hover colors: `transition-colors duration-200`
- Opacity changes: `transition-opacity duration-200`
- Multi-property (shadow + color): `transition-all duration-200`

**Max timing:** 300ms (never > 300ms)

---

### Task 6: Verify Focus States & Accessibility

**Files to Check:**
- All modified files above

**Checklist:**

For each interactive element:
- [ ] Has `focus:ring-2 focus:ring-primary/50`
- [ ] Has `focus:outline-none`
- [ ] TabIndex correct (usually auto)
- [ ] Cursor pointer on hover

**Add to All Buttons:**
```tsx
// Template for all buttons
<button
  className="cursor-pointer ... focus:ring-2 focus:ring-primary/50 focus:outline-none"
>
  Label
</button>
```

---

## Implementation Order

1. **Task 1:** DashboardQueue (most visible, high impact)
2. **Task 2:** ReviewWorkspace header (clarifies workflow)
3. **Task 3:** EditorScreen footer (button placement)
4. **Task 4:** ApprovedPostPreview (modal polish)
5. **Task 5:** Transitions (consistency pass)
6. **Task 6:** Accessibility (final verification)

**Total Time:** ~3-4 hours

---

## Testing Checklist After Each Task

- [ ] Component renders without errors
- [ ] Responsive at 375px (mobile), 768px (tablet), 1024px (desktop)
- [ ] All interactive elements have cursor-pointer
- [ ] Hover states smooth (150-200ms transition)
- [ ] Focus rings visible on Tab
- [ ] No horizontal scroll on mobile

---

## Before Committing

**Run verification:**
```bash
cd frontend
npm run build  # Check for TypeScript errors
npm run dev    # Visual check
```

**Smoke tests:**
- Dashboard: Click rows, see hover effect, click actions
- Review: See step indicator, click back/forward
- Editor: See button placement, click approve
- Preview: See modal, close button works

---

## Commit Message Template

```
refactor(ux): improve component UX across dashboard, review, editor, and preview

- Dashboard queue rows: One primary action, secondary in menu (Hick's Law)
- Review workflow: Clear step indicator showing progress
- Editor: Button placement (secondary LEFT, primary RIGHT)
- Preview modal: Better close button hover, responsive mobile
- Standardize: Transitions 200ms, focus rings, cursor-pointer consistency
- Accessibility: Focus states on all interactive elements

Applies 2026 UX best practices:
- Hick's Law: Reduce cognitive load with clear primary action
- Fitts's Law: 44-48px buttons, 12px spacing
- Progressive disclosure: Hide secondary actions in menus
- F-pattern: Premium content top-left, navigation left edge
```

---

**Ready to implement?** Answer:
1. **Start immediately** - Execute tasks sequentially
2. **Plan first** - Review specific file changes before executing
3. **Quick fixes only** - Just do critical items (Tasks 1-3)
