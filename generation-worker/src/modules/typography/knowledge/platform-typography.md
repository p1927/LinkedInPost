# Platform Typography Rules

## Overview

Each publishing platform imposes distinct constraints on character limits, formatting support, and optimal line-break strategies. Typography choices that work on LinkedIn may actively harm readability on WhatsApp. This reference governs per-platform defaults.

---

## LinkedIn

**Character Limit:** 3,000 characters (post body); 220 characters visible before "see more" truncation

**Formatting Support:**
- No markdown rendering (bold/italic via Unicode characters only)
- Line breaks preserved
- Emojis fully supported and algorithmically neutral
- Hashtags functional and discoverable
- No clickable links in post body (URLs render as plain text previews)

**Line Break Strategy:** paragraph-break — use double line breaks between ideas to create visual breathing room; single-line paragraphs work well for punchy statements; avoid walls of text

**Optimal Line Length:** 60-80 characters per line for body text; hook line can be shorter (under 50 characters) for impact

**Notes:** The first 220 characters are critical — they appear before the fold. Opening line should be a standalone hook that earns the click to expand.

---

## Instagram

**Character Limit:** 2,200 characters (caption); first ~125 characters visible without tapping "more"

**Formatting Support:**
- No markdown rendering
- Line breaks preserved but double line breaks show as single in some clients
- Emojis heavily favored by algorithm and audience expectation
- Hashtags functional; standard practice is 5-15 at end of caption
- Unicode bold/italic supported

**Line Break Strategy:** rhythm-break — short sentences followed by deliberate single-line breaks; creates visual rhythm that matches the scroll-and-pause reading pattern; use emojis as visual bullet points

**Optimal Line Length:** 40-60 characters per line; shorter lines increase perceived readability on mobile

**Notes:** Hashtag block at end is convention; separate from body with line break or dot separator. Image carries primary message; caption supports and extends.

---

## Email

**Character Limit:** No hard limit; practical optimal is 500-800 words for professional newsletters

**Formatting Support:**
- HTML formatting fully supported (bold, italic, headings, bullet lists, dividers)
- Emojis supported in subject line and body; use sparingly in body
- Links fully clickable and trackable
- Images embedded or linked

**Line Break Strategy:** section-break — use clear H2/H3 headings to segment content; bullet lists for scannable content; white space between sections; single-column layout for mobile

**Optimal Line Length:** 60-75 characters per line (CSS line-width control); prevents long lines that cause eye fatigue

**Notes:** Subject line is the most important typographic element. Preview text (first 85-140 characters of body) is the second. Bold the most important sentence in each section.

---

## Gmail (Compose / Plain Text Context)

**Character Limit:** No enforced limit; 500-1,000 characters optimal for professional messages

**Formatting Support:**
- Rich text supported in compose (bold, italic, underline, lists)
- Plain text fallback common for automated or forwarded messages
- Emojis supported but professionally unusual
- Links fully clickable

**Line Break Strategy:** paragraph-break — standard business email paragraphing; short paragraphs (3-5 sentences); clear subject-body-CTA structure; no line-length constraints beyond convention

**Optimal Line Length:** 70-80 characters per line in plain text; no constraint in rich text

**Notes:** Treat like professional email. Formatting should be minimal and purposeful. Emoji usage typically signals informal register.

---

## WhatsApp

**Character Limit:** 65,536 characters (message); practical limit for broadcast messages is 300-500 characters

**Formatting Support:**
- Bold via `*text*`, italic via `_text_`, strikethrough via `~text~`, monospace via `` `text` ``
- No heading support
- Emojis fully supported and common in casual register
- Links clickable with preview
- Line breaks preserved

**Line Break Strategy:** breath-pause — very short paragraphs (1-3 sentences); heavy use of line breaks to create pauses; conversational rhythm; feels like a text message, not an article

**Optimal Line Length:** 40-55 characters per line; mobile-native reading; shorter is better

**Notes:** WhatsApp reads like a personal message. Formal language and long blocks of text feel out of place. Emojis are functional punctuation in this context.

---

## Telegram

**Character Limit:** 4,096 characters (message); unlimited for posts in channels

**Formatting Support:**
- Markdown supported: `**bold**`, `_italic_`, `` `code` ``, `[link](url)`
- Heading-style bold text achievable via `**Section Title**`
- Emojis fully supported
- Links clickable with preview
- Code blocks supported (useful for technical content)

**Line Break Strategy:** structured-section — can support longer-form content with bold section headers acting as visual anchors; use line breaks between sections; code blocks for technical examples

**Optimal Line Length:** 60-80 characters per line for body text; headers shorter

**Notes:** Telegram channels support richer formatting than WhatsApp. Technical audiences appreciate code blocks. Bold headers substitute for H2 structure.
