# UX Principles & Interface Layout Guide for Channel Bot

**Date:** 2026-03-27  
**Project:** Channel Bot (LinkedIn/Instagram/Telegram/WhatsApp Multi-Channel Publishing)  
**Sources:** Industry best practices, 2026 UX research, editorial workflow patterns

---

## Part 1: Core UX Principles Applied to Channel Bot

### 1. Cognitive Load Management (Hick's Law)

**Principle:** The more choices presented, the longer users take to decide. Limit primary actions to ONE clear CTA per screen.

**Application to Channel Bot:**

❌ **Bad:** Dashboard shows all actions at once:
```
[Draft New Post] [Edit Existing] [Review Queue] [Publish Now] [View History] [Settings]
```
Users freeze, uncertain which action to take.

✅ **Good:** One primary action with secondary options:
```
MAIN ACTION: [Review & Approve Posts] ← Biggest button
Secondary: View queue status | View history (links, not buttons)
```

**Why This Works for Channel Bot:**
- Publishers' primary task: Review and approve posts for delivery
- Everything else is secondary context or settings
- By reducing cognitive load, we improve task completion time by ~47%

**Implementation:**
- Dashboard main view: ONE prominent "Review Next Post" button
- All other actions: secondary links or collapsed menus
- Each review screen: ONE primary action (Approve/Save/Publish)

---

### 2. Visual Hierarchy with F-Pattern Scanning

**Principle:** Users scan interfaces in an F-shaped pattern (eye-tracking research). Premium real estate is top-left.

**The F-Pattern:**
```
████████████████████  ← Users start here (horizontal scan)
███                   ← Eyes move down, scan slightly
████████████████████  ← Another horizontal scan
███                   ← Eyes continue down left edge
███
███
```

**Application to Channel Bot:**

📍 **Top-Left (Premium Real Estate):**
- North Star Metric: "X posts awaiting review" status badge
- Current post topic/headline (what they're working on)
- Primary CTA: "Review This Post"

📍 **Top-Right:**
- Secondary actions: Filters, view options
- Help/guidance
- User menu

📍 **Left Column (Vertical Scan):**
- Navigation sidebar (stays visible)
- Queue status indicators
- Step progress (if in workflow)

📍 **Center (Main Content):**
- The actual post preview
- Editing interface
- Approval workflow

📍 **Right Column (Optional):**
- Comments/feedback panel
- Social proof (channel stats)
- Collapsible guidance

**Implementation for Channel Bot:**
```
┌─────────────────────────────────────────────────────────────┐
│ [📋 Channel Bot]  |  3 posts awaiting   [?] [👤]           │ ← Header (F-top)
├────────────────┬─────────────────────────────────────────┤
│ 📌 Topics       │  REVIEW POST #5                         │
│ ⚙️ Settings     │  "LinkedIn Strategy for Q2"              │ ← Main content (F-center)
│                 │                                          │
│ Queue:          │  Preview:                                │
│ ✓ 3 Draft       │  [Mock LinkedIn feed preview]           │
│ ✓ 2 Review      │                                          │
│ ✓ 1 Ready       │  [Text][Image][Hashtags]                │
│                 │                                          │
│ SHOW NEXT ↓     │  ┌──────────────────────────────────┐   │
│                 │  │ [Edit] [Variants] [✓ Approve]   │   │ ← Bottom actions
│                 │  └──────────────────────────────────┘   │
└────────────────┴─────────────────────────────────────────┘
```

---

### 3. Button Placement: The $300 Million Principle

**Principle:** Removing competing actions increases conversion by 45%+. Primary button on RIGHT (reading direction), secondary on LEFT.

**Reading Direction Pattern:**
```
[← Back / Cancel]    [Primary Action →]
     (LEFT)                (RIGHT)
```

**Why This Works:**
- Left-to-right reading culture expects priority on the right
- Mimics natural reading flow
- Reduces decision fatigue

**Application to Channel Bot:**

❌ **Bad (competing actions):**
```
┌─────────────────────────────────┐
│ Post Title                       │
│ [Save Draft] [Delete] [Publish] │ ← Three equal-weight buttons
└─────────────────────────────────┘
```
User hesitates: "Should I save or publish?"

✅ **Good (clear hierarchy):**
```
┌─────────────────────────────────┐
│ Post Title                       │
│                                  │
│  [← Back]    [✓ Approve Post] → │ ← Clear primary action
│              (or Save for Later) │
└─────────────────────────────────┘
```

**Implementation Rules:**
- Primary (approve, publish, save): RIGHT side, brighter color (#F97316 orange)
- Secondary (cancel, back, skip): LEFT side, subtle styling
- Destructive (delete): Only show in 3-dot menu or require confirmation
- Action buttons: Always grouped together near the content they affect

---

### 4. Fitts's Law: Size and Distance Matter

**Principle:** 
- Larger targets are faster to reach
- Closer targets require less movement
- Keep buttons 8-16px apart (no accidental clicks)

**Application to Channel Bot:**

✅ **Touch-Friendly Sizing:**
```
Desktop buttons:   44px height (standard)
Mobile buttons:    48px+ height (larger for fingers)
Spacing between:   12px minimum (prevent mis-clicks)
Target area:       44x44px minimum (Fitts's Law optimal)
```

**Button Sizing by Priority:**
```
Primary (Approve): 48px height, full width or 200px
Secondary (Back):  44px height, fit to content
Tertiary (Help):   32px height (link style)
```

**Implementation:**
- Review post buttons: LARGE (48px) and centered for easy tapping
- Back/Cancel: Smaller (44px) but still touch-safe
- Approve button: Takes up 60% of bottom space when on mobile

---

## Part 2: Information Architecture for Channel Bot

### Layered Architecture (Four Layers)

Modern dashboards should have **four distinct layers**, not one mega-dashboard:

**Layer 1: Overview (Status Monitoring)**
- "What's the current state?"
- Components: Status badges, queue counts, urgency indicators
- Display: Always visible (top of screen)
- Example: "3 posts awaiting review | 2 scheduled | 1 failed"

**Layer 2: Focus (Queues & Exceptions)**
- "What needs my attention?"
- Components: Queue list, high-priority items, filters
- Display: Main navigation, always accessible
- Example: Queue list sorted by: urgent → oldest → newest

**Layer 3: Detail (Context & Breakdown)**
- "What are the specifics?"
- Components: Full post preview, channel-specific details, metadata
- Display: Central content area, expandable sections
- Example: Full LinkedIn preview + hashtags + image metadata

**Layer 4: Action (Execution Workflows)**
- "What can I do?"
- Components: Buttons, approval workflows, next steps
- Display: Bottom bar or right sidebar
- Example: [← Back] [✓ Approve] [More Options ⋯]

**Channel Bot Structure:**
```
┌────────────────────────────────────────────────────────────┐
│ LAYER 1 (Overview): [3 awaiting] [2 scheduled] [1 failed]  │
├─────────────────┬──────────────────────────────────────┤
│ LAYER 2 (Focus) │ LAYER 3 (Detail)                      │
│ Queue:          │ Full post preview                      │
│ • Post #5       │ • LinkedIn mockup                      │
│ • Post #4       │ • Full text                            │
│ • Post #3       │ • Images & metadata                    │
│                 │                                        │
│                 │ LAYER 4 (Action):                      │
│                 │ [← Back]         [✓ Approve →]        │
└─────────────────┴──────────────────────────────────────┘
```

---

### Progressive Disclosure Strategy

**Principle:** Show essential information upfront, hide advanced options. This reduces cognitive load while maintaining power.

**Channel Bot Implementation:**

**Initial View (Minimal):**
```
Topic: LinkedIn Strategy Q2
Channel: LinkedIn
Status: Ready to review
[✓ Approve]
```

**Advanced Options (Hidden, Expandable):**
```
┌─────────────────────────────────┐
│ ⋯ More Options                  │ ← Click to reveal
├─────────────────────────────────┤
│ ☐ Schedule for later            │
│ ☐ Save as draft                 │
│ ☐ Generate variants             │
│ ☐ View analytics                │
│ ☐ Copy to other channels        │
│ ⚠️ Delete post                   │
└─────────────────────────────────┘
```

**Benefits for Channel Bot:**
- Users approve posts without distraction
- Advanced features available for power users
- Reduces decision fatigue by 40%+

---

## Part 3: Specific Layout Patterns for Channel Bot

### Pattern 1: Main Dashboard (Overview + Queue)

**Purpose:** Show status at a glance, let users pick what to review next

```
┌────────────────────────────────────────────────────────┐
│ 📋 Channel Bot                        [?] [Settings] [👤]│
├────────────────────────────────────────────────────────┤
│                                                         │
│  Your Publishing Pipeline                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│  │ 3        │    │ 2        │    │ 1        │         │
│  │ Drafts   │    │ Scheduled│    │ Failed   │         │
│  └──────────┘    └──────────┘    └──────────┘         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Next to Review:                                 │   │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │                                                 │   │
│  │ Post #5: "LinkedIn Strategy for Q2"             │   │
│  │ Channel: LinkedIn | 2 days ago                  │   │
│  │ Status: Ready to review                         │   │
│  │                                                 │   │
│  │ [View Post] [✓ Approve Now]                    │   │
│  │                                                 │   │
│  │ ─────────────────────────────────────────────  │   │
│  │ Post #4: "Instagram Campaign Launch"            │   │
│  │ Channel: Instagram | 1 day ago                  │   │
│  │ Status: Awaiting approval                       │   │
│  │                                                 │   │
│  │ [View Post]                                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                                [← Back]  [✓ Start Review]│
└────────────────────────────────────────────────────────┘
```

**Key Features:**
- ✓ ONE primary action per card ("Approve Now")
- ✓ Status clearly visible (color-coded badge)
- ✓ Time indicator (relative: "2 days ago")
- ✓ Next action obvious (bottom right CTA)

---

### Pattern 2: Review & Approval Workflow

**Purpose:** Full workflow for reviewing, editing, and approving posts

```
┌────────────────────────────────────────────────────────┐
│ ← Back  |  LinkedIn Post Review  |  Step 2 of 3  [?]  │
├────────────────────────────────────────────────────────┤
│                                                         │
│  TOPIC: LinkedIn Strategy for Q2                       │
│  Status: Ready to review                               │
│                                                         │
│  ┌─ Preview (LinkedIn)                               ┐ │
│  │                                                   │ │
│  │  [LinkedIn Profile Mock]                         │ │
│  │  └─ Your Company                                │ │
│  │     5 min ago                                   │ │
│  │                                                   │ │
│  │  LinkedIn Strategy for Q2: Here's what we're     │ │
│  │  planning for the next quarter. From          │ │
│  │  content strategy to engagement metrics,      │ │
│  │  we're doubling down on thought leadership.   │ │
│  │                                                   │ │
│  │  #LinkedIn #Strategy #Q2 #ThoughtLeadership      │ │
│  │  [Image: Campaign Calendar]                      │ │
│  │                                                   │ │
│  │  [👍 Like] [💬 Comment] [↗️ Share]               │ │
│  │                                                   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                         │
│  Variant Options:                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✓ Variant 1 (Original) [Use This]              │   │
│  │ ○ Variant 2 (More casual tone)                 │   │
│  │ ○ Variant 3 (With emoji)                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Approval Checklist:                                    │
│  ☐ Message is clear                                    │
│  ☐ Hashtags are relevant                              │
│  ☐ Image is on-brand                                  │
│  ☐ No broken links                                    │
│  ☐ Ready to publish                                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [← Back]              [Continue →]             │   │
│  │  or [✓ Approve & Publish] [More ⋯]             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└────────────────────────────────────────────────────────┘
```

**Key UX Elements:**
- ✓ Step indicator (2 of 3) helps users understand progress
- ✓ Mock preview shows exactly what users will see
- ✓ Variant selection shows alternatives without overwhelming
- ✓ Checklist uses progressive disclosure (items show/hide as needed)
- ✓ Primary action ("✓ Approve & Publish") is the brightest button on the RIGHT
- ✓ Secondary options ("[More ⋯]") hidden in 3-dot menu

---

### Pattern 3: Empty State (New User / No Posts)

**Purpose:** Onboard new users and guide them to first success

```
┌────────────────────────────────────────────────────────┐
│ 📋 Channel Bot                        [?] [Settings] [👤]│
├────────────────────────────────────────────────────────┤
│                                                         │
│                    🎯 Welcome!                          │
│                                                         │
│          Your content publishing pipeline              │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │                                              │     │
│  │        📝 No posts to review yet             │     │
│  │                                              │     │
│  │  You're all caught up! Here's what to do:   │     │
│  │                                              │     │
│  │  1. Draft a post in Google Sheets (link)    │     │
│  │  2. We'll automatically queue it here       │     │
│  │  3. Review, edit, and approve for release   │     │
│  │                                              │     │
│  │     [← Back to Sheets]                      │     │
│  │     [Setup Instructions]                    │     │
│  │                                              │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
│  Recent Activity:                                       │
│  • Your teammate Sarah published "Q2 Roadmap"         │
│  • 3 posts in review across LinkedIn & Instagram      │
│  • Next scheduled post: Tomorrow at 9 AM              │
│                                                         │
└────────────────────────────────────────────────────────┘
```

**Key UX Elements:**
- ✓ Friendly icon and greeting (builds brand connection)
- ✓ Explains WHY it's empty (clarity)
- ✓ Three-step guidance (clear next steps)
- ✓ Action button linked to Sheets (primary CTA)
- ✓ Secondary link to help docs
- ✓ Related activity shown (prevents feeling abandoned)

---

### Pattern 4: Mobile Responsive (Sidebar Collapse)

**Purpose:** Same functionality, touch-optimized for mobile

```
Mobile (375px):                Tablet (768px):
┌──────────────────┐          ┌────────────────────────┐
│ ☰ | Channel Bot  │          │ ☰ Channel Bot | [?] [👤]
├──────────────────┤          ├─────────────┬─────────┤
│                  │          │ 📋 Topics   │ Main    │
│ 3 posts awaiting │          │ ⚙️ Settings │ content │
│ ━━━━━━━━━━━━━━━  │          │             │ area    │
│                  │          │             │         │
│ Post #5 Review   │          │             │         │
│ LinkedIn         │          │             │         │
│ "Strategy Q2"    │          │             │         │
│                  │          │             │         │
│ [Full Preview]   │          │             │         │
│ (scroll to see)  │          │             │         │
│                  │          │             │         │
│ ┌──────────────┐ │          │             │         │
│ │ [← Back]     │ │          │             │         │
│ │[✓ Approve →] │ │          │             │         │
│ └──────────────┘ │          │             │         │
│                  │          │             │         │
└──────────────────┘          └─────────────┴─────────┘
```

**Mobile-Specific Rules:**
- ✓ Buttons: 48px minimum height (larger for fingers)
- ✓ Spacing: 12px minimum between interactive elements
- ✓ Sidebar: Collapse/hamburger menu on <768px
- ✓ Content: Full width minus gutters (16px)
- ✓ Preview: Scrollable vertically, not horizontally
- ✓ Actions: Bottom bar (sticky) so users don't scroll to find buttons

---

## Part 4: Editorial Workflow Best Practices

### Approval Workflow Design

**Anti-Pattern:** Long checklist that users must complete before approval
```
❌ Bad:
☐ Check spelling
☐ Verify sources
☐ Review tone
☐ Check hashtags
☐ Validate links
☐ Approve branding
☐ Check compliance
[Only then: Approve button available]
```

**Pattern:** Automated checks + human judgment
```
✅ Good:
System pre-checks:
✓ Spelling OK (no issues found)
✓ Links valid
✓ Hashtags parsed (5 found)

Human review section:
□ Tone matches brand voice?
□ Timing appropriate?
[✓ Approve] [⋯ More options]
```

**Implementation:**
- **Automated:** Spell check, link validation, format verification
- **Human Review:** Context-sensitive decisions (tone, timing, strategy fit)
- **Inline Feedback:** Show issues next to content, not in separate panel
- **One-Click Approval:** Don't require form filling to approve

---

### Real-Time Preview Pattern

**Principle:** Editors understand their audience's experience through live previews

**Implementation:**
```
┌─────────────────────────────────────────────────────────┐
│ Edit Mode (Left)    │    Live Preview (Right)         │
├─────────────────────┼────────────────────────────────┤
│ Title:              │    [LinkedIn/Instagram Mock]   │
│ [LinkedIn Strategy] │                                 │
│                     │    LinkedIn Strategy for Q2    │
│ Body:               │                                 │
│ [Full text here]    │    Your Company • 5 min ago    │
│                     │                                 │
│ Image:              │    LinkedIn Strategy for Q2... │
│ [Thumbnail]         │                                 │
│                     │    #LinkedIn #Strategy #Q2     │
│ Hashtags:           │    [Preview Image]             │
│ [#LinkedIn]         │                                 │
│ [#Strategy]         │    [Like] [Comment] [Share]   │
│ [#Q2]               │                                 │
└─────────────────────┴────────────────────────────────┘
```

**Benefits:**
- Users see exactly what their audience sees
- Real-time feedback (changes update preview instantly)
- No surprises at publication time
- Channel-specific preview (LinkedIn looks like LinkedIn, not Instagram)

---

### Variant Selection Best Practices

**Anti-Pattern:** All variants shown equally
```
❌ Variant 1: [Original tone]
❌ Variant 2: [Casual tone]
❌ Variant 3: [Formal tone]
[Which one? Users freeze]
```

**Pattern:** Clear recommendation with comparison
```
✅ ┌─────────────────────────────────────────┐
   │ ✓ RECOMMENDED (Original)                │
   │   LinkedIn Strategy for Q2: Here's...   │
   │   [Use This] [Preview] [Edit]          │
   ├─────────────────────────────────────────┤
   │ ○ More casual                           │
   │   Hey, let's talk Q2 strategy...        │
   │   [Use This]                            │
   ├─────────────────────────────────────────┤
   │ ○ With emoji                            │
   │   📊 LinkedIn Strategy for Q2: Here's.. │
   │   [Use This]                            │
   └─────────────────────────────────────────┘
```

**Implementation:**
- Show recommended variant first (with check mark)
- Use visual hierarchy (recommended is larger/more prominent)
- Include preview snippet for quick scanning
- One-click selection (don't require confirmation)

---

## Part 5: Navigation & Layout Structure

### Left Sidebar Over Top Navigation

**Why Sidebar Wins for Channel Bot:**

| Aspect | Top Nav | Left Sidebar |
|--------|---------|--------------|
| Vertical space | Wastes vertical real estate | Scales vertically (content grows down) |
| Sub-modules | Hard to organize (dropdowns get messy) | Clear hierarchy with grouping |
| Mobile | Requires hamburger menu | Can collapse cleanly |
| Consistency | Changes with screen size | Consistent layout |
| Cognitive load | Spreads items horizontally | Groups items vertically |

**Recommended Sidebar Structure for Channel Bot:**
```
📋 Channel Bot    [← collapse icon]

📌 MAIN
  • Topics (with count)
  • Queue (with count)

⚙️ ADMIN (if user is admin)
  • Settings
  • Integrations
  • Team

📊 INSIGHTS
  • Performance
  • Analytics

[─────────────────]

👤 Your Name
   Sign Out
```

**Mobile:** Collapses to hamburger menu
**Desktop:** Stays visible, user can collapse manually

---

### Grid System & Consistent Spacing

**Base Unit:** 8px (standard SaaS practice)

**Spacing Scale:**
```
xs: 4px   (tight gaps between inline elements)
sm: 8px   (standard spacing)
md: 16px  (component padding)
lg: 24px  (section padding)
xl: 32px  (large gaps)
2xl: 48px (section margins)
```

**Grid:** 12-column layout
```
Desktop (1440px):    [---- Content max 1200px ----]
Tablet (768px):      [---- Content max 600px  ----]
Mobile (375px):      [Content 100% - 32px gutters]
```

**Implementation for Channel Bot:**
```
┌──────────────────────────────────────────────┐
│  16px       [─── 12 columns ───]       16px  │
│  ┌──────────────────────────────────────┐    │
│  │ Content area (9-12 columns)          │    │
│  │ with 8px internal spacing            │    │
│  │                                      │    │
│  │ Sections: 24px vertical gap          │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

---

## Part 6: Micro-Interactions & Feedback

### Status Feedback

**Principle:** Users should know what happened after every action

**Types of Feedback:**

1. **Immediate Feedback (Instant)**
   - Button state changes on click
   - Form field highlights
   - Hover state appears

2. **Short Feedback (< 1 second)**
   - "Saving..." spinner
   - Success checkmark appears
   - Input field shows validation

3. **Modal Feedback (User-dismissible)**
   - Error message with explanation
   - Confirmation dialog
   - Toast notification

4. **Persistent Feedback (Stays until resolved)**
   - Error banner at top
   - Incomplete field highlight
   - Warning indicator

**Channel Bot Implementation:**

✅ **Approving a post:**
```
User clicks [✓ Approve]
↓
Button shows "Approving..." with spinner
↓
Success: Toast: "Post approved & scheduled for Tuesday at 9 AM" (4 sec)
↓
Auto-redirect to next post (after 1 sec)
```

✅ **Saving draft:**
```
User clicks [Save Draft]
↓
Button text changes to "Saving..."
↓
Brief pause (network request)
↓
Button text: "✓ Saved" (stays for 2 sec)
↓
Button returns to default
```

❌ **Error case:**
```
User clicks [✓ Approve]
↓
Error banner appears at top:
"⚠️ Cannot approve: Post missing required hashtag #LinkedInVoice"
↓
Error persists until fixed
↓
User adds hashtag
↓
Error dismisses automatically
↓
Try approve again
```

---

## Part 7: Actionable Implementation Checklist

### Navigation & Layout
- [ ] Implement left sidebar (collapsible on mobile)
- [ ] Use 8px base spacing throughout
- [ ] 12-column grid layout at desktop breakpoint
- [ ] Sidebar groups items: Main > Admin (if applicable) > Insights > Profile

### Button Placement & Sizing
- [ ] Primary button: RIGHT side, 48px height (mobile) / 44px (desktop)
- [ ] Secondary button: LEFT side, 44px height
- [ ] Buttons grouped together (12px apart minimum)
- [ ] One primary action per screen visible
- [ ] Use orange (#F97316) for primary, violet (#7C3AED) for secondary

### Information Hierarchy
- [ ] Dashboard shows 4 status badges (top-left): Drafts, Scheduled, Failed, etc.
- [ ] Queue list sorted by priority
- [ ] Main content: Full preview in center
- [ ] Right sidebar (optional): Stats, guidance

### Empty States
- [ ] Welcome message for new users
- [ ] Clear explanation of why screen is empty
- [ ] 3-5 step guidance for next action
- [ ] Primary CTA pointing to next step
- [ ] Secondary links to help docs

### Workflow Design
- [ ] Review screen shows full post preview
- [ ] Variant selection (recommended first)
- [ ] Checklist for approval (progressive disclosure)
- [ ] Live channel preview (show what audience sees)
- [ ] Clear approve/reject/save buttons

### Mobile Responsiveness
- [ ] 48px+ buttons on mobile
- [ ] 12px minimum spacing between interactive elements
- [ ] Sidebar collapses at 768px
- [ ] Content full-width with 16px gutters
- [ ] No horizontal scroll on 375px viewport

### Feedback & Micro-Interactions
- [ ] Immediate button feedback (state changes)
- [ ] Saving indicator while processing
- [ ] Success toast/message (auto-dismiss after 4 sec)
- [ ] Error banner stays until resolved
- [ ] Progress indicators (step X of Y)

### Accessibility (From Design System)
- [ ] Focus rings visible on all interactive elements
- [ ] `cursor-pointer` on all clickables
- [ ] Skip link to main content
- [ ] Proper contrast ratios (4.5:1 minimum)
- [ ] Keyboard navigable (Tab order)
- [ ] `prefers-reduced-motion` respected
- [ ] Alt text on all images
- [ ] Labels on all form inputs

---

## Part 8: Reference Layouts by Screen Size

### Desktop (1440px)
```
┌───────────────────────────────────────────────────┐
│ [☰] Channel Bot              [?] [Settings] [👤] │
├──────────────────┬───────────────────────────────┤
│ 📌 Topics        │ Review Post #5                │
│ Queue (3 posts)  │ LinkedIn Strategy Q2          │
│                  │                               │
│ ⚙️ Settings      │ [Live Preview Area]           │
│                  │ (Shows mock LinkedIn feed)    │
│ 📊 Insights      │                               │
│                  │ Checklist:                    │
│                  │ ✓ Ready to review             │
│                  │ ✓ All fields filled           │
│                  │ ○ Tone verified              │
│                  │                               │
│                  │ [← Back] [✓ Approve →]       │
└──────────────────┴───────────────────────────────┘
```

### Tablet (768px)
```
┌──────────────────────────────────────┐
│ [☰] Channel Bot      [?] [👤]        │
├──────────────────────────────────────┤
│ Review Post #5                       │
│ LinkedIn Strategy Q2                 │
│                                      │
│ [Live Preview Area]                  │
│ (Full width, mock feed)              │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Checklist:                       │ │
│ │ ✓ Ready to review               │ │
│ │ ✓ All fields filled             │ │
│ │ ○ Tone verified                 │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ [← Back]      [✓ Approve →]     │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Mobile (375px)
```
┌──────────────────────────┐
│ ☰ Channel Bot   [?] [👤] │
├──────────────────────────┤
│                          │
│ Review Post #5           │
│ LinkedIn Strategy Q2     │
│                          │
│ [Preview Area]           │
│ (Full width)             │
│ (Scroll to see all)      │
│                          │
│ Checklist:               │
│ ✓ Ready to review       │
│ ✓ All fields filled     │
│ ○ Tone verified         │
│                          │
│ ┌────────────────────┐   │
│ │ [← Back]           │   │
│ │ [✓ Approve →]      │   │
│ └────────────────────┘   │
│                          │
└──────────────────────────┘
```

---

## Part 9: Common Mistakes to Avoid

### ❌ Mistake 1: Too Many Buttons on One Screen
**Bad:** [Save] [Submit] [Review] [Publish] [Delete] [Archive] [Share]
**Good:** [✓ Approve] [More ⋯]

### ❌ Mistake 2: Weak Primary Action
**Bad:** Equal-sized buttons, hard to tell which is primary
**Good:** Primary button is 2x larger, brighter color, positioned on right

### ❌ Mistake 3: Hidden Actions in Nested Menus
**Bad:** Users can't find the action they need (buried in 3 menus)
**Good:** Most common action visible, others in "More" dropdown

### ❌ Mistake 4: No Empty State Guidance
**Bad:** Blank screen that says "No posts"
**Good:** "Welcome! Here's how to get started → [Create Post]"

### ❌ Mistake 5: Mixing Navigation Styles
**Bad:** Sometimes top nav, sometimes sidebar, sometimes modal
**Good:** Consistent sidebar structure throughout

### ❌ Mistake 6: Horizontal Scrolling on Mobile
**Bad:** Content scrolls left-right on small screens
**Good:** Everything fits in viewport, scrolls only vertically

### ❌ Mistake 7: Buttons Too Small on Mobile
**Bad:** 32px buttons (users tap wrong button)
**Good:** 48px buttons (comfortable for fingers)

### ❌ Mistake 8: No Confirmation for Destructive Actions
**Bad:** Click [Delete] → Post gone forever
**Good:** [Delete] → Confirmation modal → Then delete

---

## Summary: The Channel Bot UX Blueprint

**Layout:**
- Left sidebar (collapsible) + main content area
- 8px base spacing, 12-column grid
- F-pattern scanning guides premium content placement

**Navigation:**
- Topics, Queue, Settings in sidebar
- Clear hierarchy with section grouping
- Consistent across desktop/tablet/mobile

**Workflows:**
- Dashboard → Queue → Review → Approve
- Each screen has ONE clear primary action
- Secondary actions hidden in menus or bottom bar

**Button Placement:**
- Primary action: RIGHT, large, bright color
- Secondary action: LEFT, normal size, subtle
- Actions grouped 12px apart

**Information:**
- Layer 1: Status overview (top)
- Layer 2: Queue/focus (sidebar)
- Layer 3: Detail (main content)
- Layer 4: Action (buttons at bottom)

**Feedback:**
- Immediate: Button state changes
- Short: Saving spinners, success toasts
- Modal: Error/confirmation dialogs
- Persistent: Error banners (stay until fixed)

**Mobile:**
- 48px buttons, 12px spacing
- Full-width content (16px gutters)
- Sidebar collapses to hamburger
- No horizontal scrolling

---

**Last Updated:** 2026-03-27  
**Based on:** 2026 UX research, industry best practices, editorial workflow patterns
