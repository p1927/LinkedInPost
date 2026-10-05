# Packaging: title, description, tags, thumbnail, captions (human voice + SEO)

Every episode carries a `packaging` block in episode.json BEFORE it can be published. `packaging.py` lints it; `seo.py` calibrates it against what actually ranks.
Evidence tags: [O] official platform doc, [F] craft/folk wisdom, [U] unverified. Test everything on our own analytics.

## Process
1. **Primary keyword** = the phrase a real person would type or ask ("how does wireless charging work"). Add 2-4 secondary phrases.
2. **Calibrate**: `python seo.py "<primary keyword>"` shows top results (title, views, age). Note the plain patterns that work and the gap we can fill (angle, recency, clarity). Do not copy titles.
3. **Write 5 title options** in the packaging block; pick one; record why in `title_rationale`.
4. **Deliver on the promise inside the first third of the video** (retention + trust). No title the video does not answer.
5. Lint: `run.py lint <ep>` includes packaging checks (length, keyword placement, AI-sounding phrases).

## Title [F unless noted]
- Aim for <= 60 characters so it is not cut off on phones (hard limit 100 [O]).
- Primary keyword in the first ~40 characters, in natural order.
- Sound like a person: "How wireless charging actually works", "Why your phone gets hot when it charges", "What happens when a card payment goes through".
- A real curiosity gap or concrete payoff; no false urgency, no ALL CAPS, no emoji, no brackets stuffed with keywords.
- Put #Shorts in the description, not the title.
- If there is a news hook, name the real thing that happened if it fits in the title; otherwise use it in line one of the description.

## Description (first two lines matter most: only ~125 characters show before "more") [F]
- Line 1-2: plain-language answer or promise containing the primary keyword. Written like a person talking, not a press release.
- Then 2-4 short sentences adding what the video shows and one fact worth remembering. No filler intro.
- **Sources:** list the URLs actually used (credibility; also helps viewers verify).
- 3-5 hashtags at the end (the first three appear above the title) [O: YouTube shows up to 3]; no hashtag spam.
- Platform AI/synthetic-content label is chosen in the upload form, not necessarily written in text; add a plain honest line only if the owner wants one.
- Never: keyword lists, "in this video we will", "delve", "unlock", "game-changer", "ever wondered", emoji bullet lists.

## Tags (low weight on YouTube today) [F]
5-10 relevant tags: the primary and secondary phrases and common misspellings. Under 500 characters total [O].

## Thumbnail / cover [F]
- <= 4 words of text, huge, high-contrast; one clear subject (an object or diagram, not a crowd); readable at 160 px wide.
- The text adds curiosity or the key noun; it must not repeat the whole title.
- YouTube: 1280x720, under 2 MB [O]. Shorts: custom thumbnails may not show in the Shorts feed; still set one for search/channel pages [U].
- Instagram Reels cover: 9:16 image; keep key content in the centre so the profile grid crop (4:5 / 3:4) does not cut it [F, U for exact crop].
- Same visual system across the series so the channel is recognisable.

## Instagram caption [F]
- Line 1 = hook with the keyword (only the first ~125 characters show). Short lines. One clear question or save/share CTA.
- 3-5 relevant hashtags; no hashtag wall. Sources in the caption or first comment.

## Three-surface keyword agreement [F]
The headline (title, thumbnail text, on-screen text), the voiceover and the written caption (description / Instagram caption) all carry the primary keyword's main words, so search, the viewer reading and the viewer listening all meet the same phrase. Lint `keyword_surfaces` (warn) checks that each surface holds at least half the keyword's content words.

## Engagement bait (lint `packaging_bait`, warn) [F + platform notes below]
Bait asks for the **act** of engagement, not its content. Flagged anywhere in title, description, captions, pinned comment, narration or on-screen text:
"comment YES" / "comment below" / "comment WORD for the link", "tag a friend" / "tag 3 friends", "like for part 2" / "like if", "share with 5 friends" / "send to everyone", "follow for more", "smash that like button", "like and subscribe", "double-tap", "drop a heart", "DM me" / comment-to-DM triggers, imperative "stop scrolling" hooks, three or more asks stacked in one sentence, and "subscribe" in a Short with no specific pointer.

| Bait | Rewrite (names a recipient, a moment, or an opinion) |
|---|---|
| "Tag a friend who needs this" / "Share with 5 friends" | "Send this to the friend who thinks [specific belief]." |
| "Like for part 2" / "Follow for more" | "Next: [specific next episode]." (hooks.md preferred frame) or cut it |
| "Comment below what you think" / "Comment YES" | "Tell me I'm wrong about [specific claim]." |
| "Comment WORD for the link" | Put the source link in the description and pinned comment, openly. |
| "Smash that like button" / "Drop a heart" | Cut it. |
| "Stop scrolling!" | Open on the hook object (hooks.md, mode-hook-retention-shapes). |
| "Like, save, share, follow" | Pick one. |

Platform facts: YouTube's spam policy says plainly that asking viewers to like, comment or subscribe is allowed; it bans coercion, rewards for engagement and sub-for-sub [V: YouTube Help, Spam policy, support.google.com/youtube/answer/2801973]. So our bait rule is a craft and brand rule on YouTube, not a policy rule. Meta's distribution guidelines demote engagement bait ("comment YES", "tag three friends") on Facebook [S: Meta Transparency Center, "Engagement bait"; read via search summary, application to Instagram Reels unverified]. Third-party reach-penalty percentages are vendor claims and are never thresholds.

## CTA by content type (lint `cta_content_type`, `cta_recipient`, warn)
Consistent with hooks.md and psychology_rules.md: **one** CTA, **after the payoff**, reshare-framed by default. `packaging.content_type` (default `explainer`) picks the shape:
- **explainer** (almost every episode): a reshare or save to a named recipient or moment ("Send this to someone who thinks [X]", the audience card's `cta`), OR a specific next-episode / long-form pointer ("Next: why prices fall in a recession."). Kids: "ask a grown-up / share with a friend" (audience card).
- **recommendation**: a send to a named recipient.
- **opinion**: a stance ask ("Tell me I'm wrong about [claim]"), asking for the content of an opinion.
- **entertainment**: no CTA; let it loop.
A send/share CTA must name who (outside kids). No mid-video CTAs, no stacked asks.

## Short-to-long-form bridge (lint `bridge_pointer`, warn)
Only when a real long-form exists; record it as `packaging.long_form {title, url, extra}`. Four surfaces, aim for at least three:
1. **In-video callout** in the last seconds, after the payoff: names the exact long-form title and **one concrete extra not in the Short** ("the full burn-by-burn timeline"); "longer version" earns nothing.
2. **Pinned comment**: the long-form link plus that extra.
3. **End card / final frame**: "Full video: [short title]".
4. **Channel consistency**: channel trailer and pinned/recent Shorts on the same topic cluster.
Rules: a Short never says "subscribe" without a specific pointer; never promise a "full video" that `long_form` does not name. If no long-form exists, the Short has no funnel CTA and simply earns reach. The Short must still pay off on its own.

## Pinned comment (lint `pinned_comment`, warn)
`packaging.pinned_comment` = a genuine question that invites experience ("Which machine should we take apart next?") **or** an objection-killer that pre-empts the predictable correction ("Yes, it really speeds up by dropping lower: NASA's numbers are below."), **plus the main source URL**. Never: bait triggers, a repeat of the caption, "thanks for watching, follow for more", **self-seeding replies from our own or sock accounts**, or **comment-to-DM automation**.

## Metrics honesty
- Report **Engaged views** next to raw **Views** from YouTube Analytics. Views count every time a Short starts to play or replay with no minimum watch time (since 2025-03-31); Engaged views is the older metric that shows how many viewers chose to keep watching, and YPP eligibility and Shorts revenue sharing use engaged views [V: YouTube Help, support.google.com/youtube/answer/10059070]. From 2026-08-24 views count the moment a video starts to play in all formats, while YPP earnings stay based on engaged views and engaged watch hours [V: YouTube Help, support.google.com/youtube/answer/2991785].
- Never promise virality or quote expected numbers. Packaging is pattern-matching, not prediction.
- When two options compete, pick the one more likely to earn a **save** or a **completion/rewatch**, not raw views.
- Test every rule here on our own analytics (post-publish notes) before treating it as true for us; vendor percentages stay out of lint.

## Inauthentic (mass-produced) content: what it means for AI-narrated explainers
YouTube renamed "repetitious content" to **"inauthentic content"** on 2025-07-15: mass-produced or repetitive content, e.g. content that looks template-made or feels repetitive after several videos in a row; its examples include "AI-generated content made with generic or unoriginal templates" without the creator's own insight, and characters in the same situation with the same outcome. Allowed: a shared intro/outro when the bulk differs, and a series where each video has a distinct storyline, focus or concept [V: YouTube Help, channel monetization policies, support.google.com/youtube/answer/1311392]. Shorts views from non-original content are ineligible for revenue sharing [V: support.google.com/youtube/answer/12504220].
Implications for us: every episode states a real `original_contribution` (lint warns when empty) that says what this video adds beyond its sources; director `variety()` rotates audience, format, analogy domain and mode; lint `repeated_structure` warns on an identical beat sequence to an earlier episode. Packaging also varies: no copy-paste titles, descriptions or CTAs across episodes; the series look stays, the substance changes.

## AI-sounding words and patterns the linter flags
delve, dive into, unlock, unleash, game-changer, revolutionize, elevate, journey, tapestry, landscape, navigate, seamless, robust, testament, crucial, "it's important to note", "in today's", "buckle up", "ever wondered", "let's explore", "look no further", "in this video", more than one em dash, more than one exclamation mark, more than 2 emoji, more than 5 hashtags, three-item adjective stacks.
