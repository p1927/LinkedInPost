# Channel Bot: Quick UX Reference Guide

**A one-page guide to key UX principles for your publishing app**

---

## The Core Principle: One Action Per Screen

```
❌ WRONG: Dashboard with 6 equal buttons
[Draft New] [Edit] [Review] [Publish] [History] [Settings]
→ Users freeze, don't know what to do

✅ RIGHT: One clear action
[Review & Approve Your Posts] ← Main action
"View queue" ← Secondary option (link)
```

---

## Button Placement Rule

```
[← Cancel/Back]                [✓ Primary Action →]
   (Left side)                      (Right side)
   (Subtle style)                   (Bright color)
```

**Why Right?** Left-to-right reading direction. Users' eyes end on the right side.

---

## Information Architecture: 4 Layers

```
┌─────────────────────────────────────────────┐
│ Layer 1: Status       (Top of page)         │
│ "3 posts awaiting"                          │
├─────────────────────────────────────────────┤
│ Layer 2: Navigation   (Left sidebar)        │
│ • Topics • Queue • Settings                 │
├─────────────────────────────────────────────┤
│ Layer 3: Detail       (Main content)        │
│ Full post preview, channel mock             │
├─────────────────────────────────────────────┤
│ Layer 4: Action       (Bottom buttons)      │
│ [← Back]        [✓ Approve →]              │
└─────────────────────────────────────────────┘
```

---

## Progressive Disclosure Pattern

```
INITIAL VIEW (Minimal):
┌──────────────────────────┐
│ Post: LinkedIn Q2        │
│ Ready to review          │
│ [✓ Approve]              │
└──────────────────────────┘

ADVANCED OPTIONS (Hidden):
┌──────────────────────────┐
│ Post: LinkedIn Q2        │
│ Ready to review          │
│ [✓ Approve] [⋯ More]    │
│   [Schedule Later]        │ ← Reveal on click
│   [Save as Draft]        │
│   [Generate Variants]    │
│   [View Analytics]       │
└──────────────────────────┘
```

**Result:** Users approve without distraction. Power users access advanced features.

---

## F-Pattern Scanning (Eye-Tracking Study)

```
████████████████████ ← Premium real estate (top-left)
   Start here:
   • North Star Metric: "3 posts awaiting"
   • Primary action: "Review Next Post"

███                  ← Eyes scan down left edge
███                  
███
   This is where:
   • Navigation goes (sidebar)
   • Queue status sits
   • Important controls live
```

**Layout for Channel Bot:**
```
[Status: 3 Awaiting] ← Top-left (premium)
            [?] [👤] ← Top-right (secondary)

Sidebar (left edge): ← F-pattern vertical scan
Queue / Navigation

Center: ← Main content
Post preview

Bottom: ← Action zone
[← Back]  [✓ Approve]
```

---

## Hick's Law: Limit Choices

**The $300 Million Button Case:**
- Website had [Register] and [Continue] buttons
- Removing [Register] increased conversions by 45%
- **Lesson:** Fewer choices = faster decisions

**Application:**
```
❌ Dashboard with all options:
[New Post] [Edit] [Review] [Publish] [Analytics] [Settings]

✅ Focused dashboard:
"You have 3 posts to review"
[Start Review]
More options: (links in sidebar, not buttons)
```

---

## Button Sizing & Spacing (Fitts's Law)

**Principle:** Larger targets are faster to reach; closer targets need less movement.

```
DESKTOP:
[← Back]  [✓ Approve Post] ← 44px-48px height
     12px spacing minimum
     Prevent accidental clicks

MOBILE:
┌──────────────────────────┐
│                          │
│    [← Back]              │ ← 48px height
│                          │
│  [✓ Approve Post →]     │ ← Large, full width
│                          │
└──────────────────────────┘
```

---

## Empty State Formula

When there's nothing to display, guide users forward:

```
✅ GOOD EMPTY STATE:
┌──────────────────────────────────────┐
│ 🎯 Welcome!                           │
│                                      │
│ No posts to review yet               │ ← Explain why it's empty
│                                      │
│ Here's how to get started:           │ ← Guidance
│ 1. Draft a post in Google Sheets    │
│ 2. We'll queue it automatically     │
│ 3. Review & approve here            │
│                                      │
│ [← Go to Sheets] [View Guide]        │ ← Clear next steps
│                                      │
│ Recent activity:                     │ ← Show related info
│ • Sarah published "Q2 Roadmap"      │
│ • 3 posts in review                 │
└──────────────────────────────────────┘
```

---

## Mobile-Friendly Layout

**Breakpoints:**
```
Mobile:   < 768px  → Sidebar collapses to hamburger
Tablet:   768-1024px → Sidebar visible, responsive
Desktop:  > 1024px → Full layout
```

**Mobile Rules:**
- Buttons: **48px height minimum** (fingers, not mouse)
- Spacing: **12px minimum** between interactive elements
- Preview: Full width, scrolls **vertically only** (no horizontal scroll!)
- Content: 100% width - 32px gutters
- Actions: Sticky at bottom (don't scroll out of view)

---

## Feedback Types

After every user action, provide feedback:

```
IMMEDIATE (instant):
User clicks button → Button state changes visually

SHORT (< 1 second):
"Saving..." spinner appears → Disappears → "✓ Saved" (2 sec)

MODAL (user dismisses):
Error occurs → Modal appears → User reads & dismisses

PERSISTENT (stays until fixed):
Form invalid → Error banner appears → User fixes → Error disappears
```

---

## Navigation Structure

**Recommended Sidebar:**
```
📋 Channel Bot    [← collapse]

📌 MAIN
  • Topics (3)
  • Queue (12)

⚙️ ADMIN
  • Settings
  • Integrations

📊 INSIGHTS
  • Performance

[─────────────]

👤 You
   Sign Out
```

**Why sidebar > top navigation?**
- Scales vertically (content grows down)
- Clearer hierarchy (grouping)
- Mobile-friendly (collapses to menu)
- Consistent layout

---

## Workflow: Review Post

```
STEP 1: Pick Post
┌──────────────────┐
│ 3 posts waiting  │
│ [Post #5]        │
│ [Post #4]        │
│ [Post #3]        │
│ [Start Review] ← Primary
└──────────────────┘

STEP 2: Review & Edit
┌──────────────────────────┐
│ LinkedIn Preview         │
│ [Mock feed shows post]   │
│ Variant selection:       │
│ ✓ Recommended (original) │
│ ○ More casual            │
│ [✓ Approve →]           │
└──────────────────────────┘

STEP 3: Confirm & Next
┌──────────────────────────┐
│ "✓ Approved!"           │
│ "Scheduled: Tue 9 AM"   │
│ [Next Post →]           │
└──────────────────────────┘
```

---

## Color Palette Quick Reference

```
Primary (Main Actions):       #7C3AED (Violet)
Secondary (Supporting):       #A78BFA (Lavender)
CTA (Approval/Publish):       #F97316 (Orange)

Text (Headlines/Body):        #1E1B4B (Dark purple)
Muted (Secondary text):       #475569 (Gray)

Success:                      #10B981 (Emerald)
AI-Generated:                 #06B6D4 (Cyan)
Error:                        #EF4444 (Red)

Background:                   #FAF5FF (Very light)
Glass panels:                 #FFFFFF/80 (White 80% opacity)
```

---

## Spacing Scale

All spacing based on **8px base unit**:

```
xs: 4px   (very tight)
sm: 8px   (standard)
md: 16px  (component padding)
lg: 24px  (section padding)
xl: 32px  (large gap)
2xl: 48px (section margin)
```

---

## Do's ✅ vs Don'ts ❌

| Do ✅ | Don't ❌ |
|------|----------|
| One primary button per screen | Multiple equal-weight buttons |
| Primary on RIGHT | Primary scattered randomly |
| 48px buttons on mobile | 32px buttons (users tap wrong area) |
| Show status at top (F-pattern) | Bury status in bottom section |
| Progressive disclosure (More ⋯) | Show all options at once |
| Sidebar navigation | Top navigation for complex apps |
| Live preview showing real mockup | Generic preview |
| Clear empty state with guidance | Blank screen |
| Fast feedback (immediate visual) | Silence (user doesn't know if click worked) |
| 4.5:1 text contrast minimum | Low contrast (hard to read) |

---

## Quick Checklist: Before Launch

- [ ] Dashboard: Status visible, ONE main action clear
- [ ] Buttons: Primary on RIGHT, 48px on mobile
- [ ] Navigation: Sidebar (not top bar), grouped logically
- [ ] Workflow: 3-5 steps max, progress shown
- [ ] Empty state: Guidance + CTA for first-time users
- [ ] Feedback: Every action shows immediate result
- [ ] Mobile: No horizontal scroll, 48px buttons, sticky actions
- [ ] Colors: Violet primary, orange CTA, clear hierarchy
- [ ] Spacing: Consistent 8px grid
- [ ] Accessibility: Focus rings visible, keyboard navigable

---

## References

- Hick's Law: Decision time increases with number of choices
- Fitts's Law: Larger, closer targets are faster to reach
- F-Pattern: Eye-tracking study of web scanning behavior
- Progressive Disclosure: Show essential info, hide advanced options
- Miller's Law: Cognitive load = 7±2 chunks of information

**Created:** 2026-03-27  
**Based on:** 2026 UX research, editorial workflow patterns, industry best practices
