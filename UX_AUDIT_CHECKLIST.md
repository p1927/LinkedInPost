# Channel Bot: Complete UX Audit Checklist

**Comprehensive checklist to verify your interface matches UX best practices**

---

## Section 1: Navigation & Layout

### Sidebar Structure
- [ ] Left sidebar present (collapsible on mobile)
- [ ] Sidebar groups items hierarchically:
  - [ ] "Main" section (Topics, Queue)
  - [ ] "Admin" section (Settings, Integrations) - if applicable
  - [ ] "Insights" section (Analytics, Performance)
  - [ ] "Profile" section (User menu, Sign Out) at bottom
- [ ] Sidebar collapses to hamburger at 768px breakpoint
- [ ] Sidebar state persists (remembers collapsed preference)
- [ ] Navigation items have icons + text (desktop) / icons only (mobile)

### Main Layout Structure
- [ ] Page has clear F-pattern structure:
  - [ ] Top-left: Status badge / North Star Metric
  - [ ] Left edge: Navigation sidebar
  - [ ] Center: Main content area
  - [ ] Bottom: Action buttons
- [ ] No horizontal scroll on 375px viewport
- [ ] Content centered with max-width at desktop (1200-1400px)
- [ ] Consistent gutters (16px on mobile, 24px on desktop)

### Responsive Design
- [ ] **Mobile (375px):** Sidebar hidden, hamburger menu visible
- [ ] **Tablet (768px):** Sidebar visible but narrower
- [ ] **Desktop (1024px+):** Full layout, sidebar full width
- [ ] Touch targets minimum 44x44px (48px on mobile preferred)
- [ ] Spacing between interactive elements: 12px minimum
- [ ] No content hidden off-screen without scroll

---

## Section 2: Information Hierarchy (4-Layer Model)

### Layer 1: Overview (Status Monitoring)
- [ ] Status badges visible at top of page
- [ ] Key metrics displayed prominently:
  - [ ] Posts awaiting review (count)
  - [ ] Posts scheduled (count)
  - [ ] Posts failed/error (count)
  - [ ] Last sync/update time
- [ ] Status shown in F-pattern premium location (top-left area)
- [ ] Color-coded status indicators (green = OK, yellow = warning, red = error)

### Layer 2: Focus (Queue & Exceptions)
- [ ] Queue list accessible from sidebar
- [ ] Items sorted by priority:
  - [ ] Urgent/failed items first
  - [ ] Then oldest items
  - [ ] Then newest items
- [ ] Queue count badge shows in sidebar
- [ ] Filters available (by channel, by status, by date)
- [ ] Search functionality for finding posts

### Layer 3: Detail (Context & Breakdown)
- [ ] When viewing post:
  - [ ] Full post preview visible
  - [ ] Channel-specific mockup (LinkedIn looks like LinkedIn, not Instagram)
  - [ ] All metadata visible (date, author, channel, status)
  - [ ] Related media/images shown
  - [ ] Variant options displayed
  - [ ] Approval checklist shown
- [ ] Real-time preview updates as user edits
- [ ] Live preview shows what audience will see

### Layer 4: Action (Execution Workflows)
- [ ] Primary action prominent and clear
- [ ] Primary action positioned at bottom-right
- [ ] Secondary actions available (in "More" menu or visible)
- [ ] Action buttons clearly labeled with action verb (Approve, Save, Delete)
- [ ] Destructive actions (Delete) require confirmation
- [ ] Progress indicator shows current step (e.g., "Step 2 of 3")

---

## Section 3: Button Placement & Design

### Primary Action Button
- [ ] One primary button per screen visible
- [ ] Primary button on RIGHT side of button group
- [ ] Uses bright, actionable color (#F97316 orange or #7C3AED violet)
- [ ] 48px height on mobile, 44px on desktop
- [ ] Text is specific action verb (Approve, Save, Publish) not generic (OK, Submit)
- [ ] Button has hover state (slightly darker or elevated)
- [ ] Button has focus state (visible ring)
- [ ] Button has disabled state (grayed out, no pointer cursor)

### Secondary Action Button
- [ ] Secondary button on LEFT side
- [ ] Uses subtle color (#7C3AED violet or gray)
- [ ] Same size as primary (consistency)
- [ ] Clear label (Back, Cancel, Skip)
- [ ] Visually de-emphasized compared to primary
- [ ] Same hover/focus/disabled states as primary

### Button Spacing
- [ ] Buttons spaced 12-16px apart (no accidental clicks)
- [ ] Buttons grouped together (not scattered)
- [ ] Buttons aligned vertically or horizontally (consistent)
- [ ] Destructive buttons separated from safe actions
- [ ] All buttons have `cursor-pointer` on hover

### Button States
- [ ] Default state: Clear label, ready to click
- [ ] Hover state: Slight color change or shadow (150-200ms transition)
- [ ] Focus state: Visible ring (purple/primary color)
- [ ] Active state: Darker color / pressed appearance
- [ ] Disabled state: Grayed out, no cursor-pointer
- [ ] Loading state: Spinner or "Processing..." text

---

## Section 4: Forms & Input Fields

### Text Inputs
- [ ] Label above input field (not placeholder-only)
- [ ] Placeholder text shows example, not required text
- [ ] Input has focus state: border color changes, ring appears
- [ ] Helper text shows below field if needed (character count, requirements)
- [ ] Error text shows in red, specific (not generic "Error")
- [ ] Input width matches expected content length

### Select Dropdowns
- [ ] Uses native `<select>` or styled `<select>`-like component
- [ ] Default option says "Choose..." or is visually empty
- [ ] Options clearly labeled and grouped if needed
- [ ] Focus state visible (ring or border change)
- [ ] Hover state shows (background color)

### Checkboxes & Radio Buttons
- [ ] Label clickable (not just checkbox itself)
- [ ] Sized appropriately for touch (44px minimum touch target)
- [ ] Clear visual difference between checked/unchecked
- [ ] Focus state visible

### Form Validation
- [ ] Real-time validation (checks as user types or on blur)
- [ ] Error appears near field (not in separate error panel)
- [ ] Error message specific ("Email must be valid" not "Invalid")
- [ ] Submit button disabled until form valid
- [ ] Success state shown (green checkmark or message)

---

## Section 5: Progressive Disclosure

### "More" / "Advanced" Pattern
- [ ] Simple view shows essential options only
- [ ] Complex options hidden under "⋯ More" menu or "Show Advanced"
- [ ] Advanced section clearly labeled
- [ ] Advanced options don't interrupt main workflow
- [ ] User can collapse/expand without page reload

### Dashboard Example
- [ ] Main dashboard shows: Status + Queue + Primary CTA
- [ ] Advanced options available via:
  - [ ] Sidebar links (Analytics, Integrations)
  - [ ] "More" button on cards
  - [ ] Settings panel (collapsible or modal)
- [ ] User won't accidentally trigger advanced features

### Review Screen Example
- [ ] Main view: Post preview + Approve button
- [ ] Advanced (hidden by default):
  - [ ] Schedule for later
  - [ ] Save as draft
  - [ ] Generate variants
  - [ ] View analytics
  - [ ] Copy to other channels
  - [ ] Delete post

---

## Section 6: Empty States

### Elements of Good Empty State
- [ ] **Icon/Illustration:** Visual element that's on-brand
- [ ] **Headline:** Explains what this screen is for ("Your Queue" or "No posts yet")
- [ ] **Description:** Short paragraph explaining why it's empty
- [ ] **Primary CTA:** Button for most important next step
- [ ] **Secondary options:** Links to help docs or alternative actions
- [ ] **Related info:** Show activity or tips if relevant

### New User Empty State
- [ ] Shows welcome message (friendly tone)
- [ ] Explains workflow: "Draft → Review → Approve → Publish"
- [ ] Links to setup guide or tutorials
- [ ] Primary button: "Create First Post" or "Connect Google Sheets"
- [ ] Shows related activity (if any): "Your teammates published 3 posts"

### Search Results Empty State
- [ ] Explains: "No results for 'xyz'"
- [ ] Suggests: "Try different search terms"
- [ ] CTA: "[Clear Search]" button
- [ ] Shows: Most recent posts as fallback

### No Posts in Queue Empty State
- [ ] Message: "All caught up! No posts to review."
- [ ] CTA: "[Draft New Post]" button
- [ ] Secondary: Link to edit existing posts
- [ ] Info: Shows last activity ("Last reviewed 2 hours ago")

---

## Section 7: Workflow & Multi-Step Processes

### Step Indicator
- [ ] Step indicator visible: "Step X of Y" or progress bar
- [ ] Current step highlighted
- [ ] Completed steps show checkmark
- [ ] User can see progress toward goal
- [ ] Step indicator placed top or left (doesn't scroll out of view)

### Step Navigation
- [ ] Clear "Next" button to advance
- [ ] Clear "Back" button to go previous
- [ ] Can return to previous steps (not one-way)
- [ ] No data loss when navigating
- [ ] Keyboard: Tab to navigate, Enter to submit

### Confirmation Before Destructive Action
- [ ] Delete/destructive action: Shows confirmation dialog
- [ ] Dialog: "Are you sure? This cannot be undone."
- [ ] Dialog: Has Cancel (left) and Confirm Delete (right)
- [ ] Red color for destructive action
- [ ] Requires explicit confirmation (not just one click)

---

## Section 8: Feedback & Micro-interactions

### Immediate Feedback (Instant)
- [ ] Button state changes on click (visual response)
- [ ] Form field highlights on focus
- [ ] Hover state appears instantly
- [ ] No delay > 200ms for user interaction

### Short Feedback (< 1 Second)
- [ ] "Saving..." spinner appears and disappears
- [ ] Success message shows: "✓ Post saved" (2-4 sec duration)
- [ ] Error message shows: "⚠️ Connection error" (stays until dismissed)
- [ ] Loading indicator shows on long operations (> 300ms)

### Modal Feedback (User-Dismissible)
- [ ] Error modal: Explanation + Cancel button
- [ ] Confirmation modal: Question + Cancel + Confirm buttons
- [ ] Modal blocks background (darkened overlay)
- [ ] Modal has close button (X) and/or Cancel button

### Persistent Feedback (Stays Until Resolved)
- [ ] Error banner at top: "⚠️ Cannot approve: Missing hashtag"
- [ ] Banner stays visible until issue fixed
- [ ] User can dismiss banner manually (X button)
- [ ] Success banner: Shows when error resolved

### Toast Notifications
- [ ] Toast appears at top/bottom (consistent location)
- [ ] Toast: Success (green), Error (red), Info (blue)
- [ ] Duration: 3-4 seconds (auto-dismiss)
- [ ] User can dismiss early (X button)
- [ ] Only one toast visible at a time

---

## Section 9: Copy & Messaging

### Button Labels
- [ ] Action verb is clear: "Approve", "Save", "Publish" (not "OK", "Yes")
- [ ] Specific to action: "Delete Post" (not "Delete")
- [ ] Consistent terminology throughout app
- [ ] Microcopy is concise (1-2 words ideal)

### Error Messages
- [ ] Specific, not generic:
  - [ ] ❌ Bad: "Error occurred"
  - [ ] ✅ Good: "Email address is invalid"
- [ ] User-friendly language (not technical jargon)
- [ ] Suggest fix: "Email must contain @"
- [ ] Actionable: Next step is clear

### Help Text & Placeholders
- [ ] Help text below field (not in placeholder)
- [ ] Placeholder is example, not instruction
- [ ] Tooltip appears on hover (if needed)
- [ ] Link to docs for complex fields

### Empty State Copy
- [ ] Headline is clear and friendly
- [ ] Description explains why screen is empty
- [ ] CTA clearly states next action
- [ ] Tone matches brand voice

---

## Section 10: Accessibility & Keyboard Navigation

### Keyboard Navigation
- [ ] Tab key moves through interactive elements
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] Can reach all interactive elements via keyboard
- [ ] No keyboard traps (focus can move forward and backward)
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals/menus

### Focus States
- [ ] Every interactive element has visible focus ring
- [ ] Focus ring is 2px minimum, contrasts with background
- [ ] Focus ring color matches primary color (#7C3AED)
- [ ] Focus ring visible at all breakpoints
- [ ] No `outline: none` without replacement

### Screen Reader Support
- [ ] All images have `alt` text (descriptive)
- [ ] Form inputs have associated `<label>` elements
- [ ] Buttons have descriptive text (not just icon)
- [ ] Headings use proper hierarchy (h1 → h2 → h3)
- [ ] Navigation is semantic: `<nav>`, `<main>`, `<aside>`

### Color Contrast (WCAG AA)
- [ ] Text contrast: 4.5:1 minimum
- [ ] Large text (18pt+) contrast: 3:1 minimum
- [ ] Test with: Chrome DevTools > Lighthouse > Accessibility
- [ ] Body text on background: Test with Contrast Checker tool
- [ ] Buttons: Text vs button background sufficient contrast

### Motor Control / Fitts's Law
- [ ] Buttons: 44px minimum height (48px on mobile)
- [ ] Spacing: 12px minimum between interactive elements
- [ ] No small/hard-to-click targets
- [ ] Hover targets are generous (not pixel-perfect)
- [ ] Destructive actions spatially separated from safe actions

### Motion & Animations
- [ ] `prefers-reduced-motion` respected (media query works)
- [ ] No autoplay animations on page load
- [ ] Animations support transparency/fade, not scale/position
- [ ] Animation speed: 150-300ms (not instant, not slow)
- [ ] No infinite animations except loading spinners

---

## Section 11: Responsive Design

### Mobile (375px - 479px)
- [ ] No horizontal scroll
- [ ] Text readable (16px minimum font)
- [ ] Buttons: 48px height, full width or safe spacing
- [ ] Sidebar: Collapses to hamburger menu
- [ ] Images scale responsively (no overflow)
- [ ] Touchable areas: 44x44px minimum (48px preferred)

### Tablet (768px - 1023px)
- [ ] Sidebar visible (narrower than desktop)
- [ ] Buttons: 44px height, spaced 12px apart
- [ ] Two-column layout works if needed
- [ ] Images responsive without stretching
- [ ] No wasted whitespace (full width utilized)

### Desktop (1024px+)
- [ ] Content max-width respected (1200-1400px)
- [ ] Sidebar full width visible
- [ ] Content centered with gutters
- [ ] Buttons: 44px height
- [ ] Hover states work (no touch necessary)

### Testing Checklist
- [ ] Tested at: 375px, 480px, 768px, 1024px, 1440px
- [ ] No horizontal scroll at any breakpoint
- [ ] Font sizes readable at all sizes
- [ ] Images don't distort
- [ ] Layout adapts smoothly (no jarring jumps)
- [ ] Mobile menu works (hamburger opens/closes)

---

## Section 12: Visual Design Consistency

### Color Palette Usage
- [ ] Primary color (#7C3AED): Main actions, links, primary buttons
- [ ] Secondary color (#A78BFA): Supporting UI, secondary buttons
- [ ] CTA color (#F97316): Publish, approve, high-priority actions
- [ ] Text color (#1E1B4B): Headlines, body copy
- [ ] Muted color (#475569): Secondary text, disabled states
- [ ] Success color (#10B981): Approved, published, success states
- [ ] Error color (#EF4444): Errors, destructive actions, warnings

### Typography
- [ ] Headings: Consistent font (Poppins or Libre Bodoni)
- [ ] Body: Consistent font (Open Sans or Public Sans)
- [ ] Font sizes scale: H1 > H2 > H3, clear hierarchy
- [ ] Line height: 1.5 minimum (readability)
- [ ] Font weight: Bold for headings, regular for body

### Spacing & Grid
- [ ] Base unit: 8px (4, 8, 16, 24, 32, 48px gaps)
- [ ] Padding consistent: 16px (md), 24px (lg)
- [ ] Margins consistent: 24px between sections
- [ ] Gutters: 16px mobile, 24px desktop
- [ ] No arbitrary spacing (all multiples of 4px or 8px)

### Icons & Visual Elements
- [ ] All icons from same set (Lucide React)
- [ ] Icon size consistent: 20px, 24px (not random)
- [ ] No emoji icons (use SVG only)
- [ ] Icons colored appropriately (primary, muted, error)
- [ ] SVG icons scale cleanly (no pixelation)

### Shadows & Depth
- [ ] Glass panels: Correct shadow (shadow-glass, shadow-lift)
- [ ] Cards: Consistent shadow (shadow-card)
- [ ] Modals: Elevated shadow (shadow-lift or higher)
- [ ] Hover states: Slight shadow increase
- [ ] No random shadow values

### Glass Panel Styling
- [ ] Opacity: 80-90% (not lower, not higher)
- [ ] Border: White with transparency (white/55 or higher)
- [ ] Blur: backdrop-blur-xl or backdrop-blur-2xl
- [ ] Background: White/80 or white/90
- [ ] Contrast: Text visible on glass background

---

## Section 13: Performance & Interactions

### Load Time
- [ ] Page loads in < 2 seconds (first contentful paint)
- [ ] Buttons respond immediately (no lag)
- [ ] Interactions smooth (60fps if possible)
- [ ] Images optimized (responsive sizes, lazy loading)
- [ ] No unnecessary animations on load

### Transition Timing
- [ ] Hover transitions: 150-200ms (smooth, not instant)
- [ ] Modal animations: 200-300ms (quick but visible)
- [ ] Fade effects: 200ms minimum
- [ ] No animations > 500ms (feels slow)
- [ ] All transitions use ease-in or ease-out (not linear)

### Interactive Responsiveness
- [ ] Button click response: < 100ms visual feedback
- [ ] Form validation: Immediate (as user types)
- [ ] Search results: < 500ms (with loading indicator)
- [ ] Sort/filter: < 1000ms (with loading indicator)
- [ ] No lag or jank during interactions

---

## Section 14: Data & Content

### Form Data
- [ ] Auto-save drafts (every 30 seconds if applicable)
- [ ] No data loss on accidental page close
- [ ] Validation prevents submission with errors
- [ ] Success state shown after submission
- [ ] Error state shows specific issues

### Queue/List Display
- [ ] Items sorted logically (by priority, date, status)
- [ ] Search works (finds items quickly)
- [ ] Filters work (narrow by channel, status, etc.)
- [ ] Pagination or infinite scroll (no 1000+ items on one page)
- [ ] Item count shown (e.g., "Showing 12 of 34")

### Post Preview
- [ ] Preview shows exactly what audience will see
- [ ] Channel-specific (LinkedIn ≠ Instagram ≠ Twitter)
- [ ] Updates in real-time as user edits
- [ ] Images display correctly
- [ ] Links work (not broken)

---

## Section 15: Error Handling & Edge Cases

### Error States
- [ ] Network error: "Connection lost. Check your internet."
- [ ] API error: "Server error. Please try again later."
- [ ] Validation error: "Email must be valid" (specific)
- [ ] Not found: "Post not found. It may have been deleted."
- [ ] Permission error: "You don't have permission to do this."

### Edge Cases
- [ ] Very long text: Doesn't break layout
- [ ] Missing image: Placeholder or fallback shown
- [ ] Slow network: Loading indicator appears
- [ ] Offline: Message shown, retry option available
- [ ] Session timeout: Warning before logout

### Recovery
- [ ] User can retry after error
- [ ] Previous state restored (not lost)
- [ ] Error message suggests fix
- [ ] Help link available for persistent issues
- [ ] Support contact shown if needed

---

## Final Verification Checklist

**Before considering the UI/UX complete:**

- [ ] All 15 sections above reviewed
- [ ] Dashboard: Clear status, one main action visible
- [ ] Buttons: Primary RIGHT, secondary LEFT, sized 44-48px
- [ ] Navigation: Sidebar structure clear and logical
- [ ] Workflow: 3-5 steps, progress shown, no data loss
- [ ] Empty states: Guidance provided, CTA clear
- [ ] Feedback: Every action shows result (loading, success, error)
- [ ] Mobile: 48px buttons, no horizontal scroll, touch-safe spacing
- [ ] Accessibility: Focus rings visible, keyboard navigable, 4.5:1 contrast
- [ ] Copy: Clear, specific, helpful (not generic or jargon)
- [ ] Responsive: Works at 375px, 768px, 1024px, 1440px
- [ ] Performance: Smooth interactions, responsive feedback
- [ ] Consistency: Colors, spacing, typography used consistently
- [ ] Brand: Visual design matches Channel Bot brand/design system

**Score:**
- 0-50% checked: Major work needed
- 50-75% checked: Good foundation, needs refinement
- 75-90% checked: Nearly complete, polish remaining
- 90%+ checked: Ready for launch

---

**Audit Completed:** [Date]  
**Conducted By:** [Name]  
**Status:** ☐ Pass / ☐ Needs Work / ☐ In Progress
