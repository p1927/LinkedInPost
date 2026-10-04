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

## Pinned comment
A genuine question that invites experience ("Which gadget would you like explained next?") plus the main source link.

## AI-sounding words and patterns the linter flags
delve, dive into, unlock, unleash, game-changer, revolutionize, elevate, journey, tapestry, landscape, navigate, seamless, robust, testament, crucial, "it's important to note", "in today's", "buckle up", "ever wondered", "let's explore", "look no further", "in this video", more than one em dash, more than one exclamation mark, more than 2 emoji, more than 5 hashtags, three-item adjective stacks.
