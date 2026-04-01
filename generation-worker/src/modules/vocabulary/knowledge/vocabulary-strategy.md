# Vocabulary Strategy Guide

How to select, calibrate, and deploy vocabulary for maximum authenticity and engagement.

---

## Register Levels

Register is the formality and style of language appropriate for a given audience and context.

### Casual (Register 1)
- **Voice**: Conversational, first-person, contractions allowed
- **When to use**: Consumer audiences, lifestyle content, Twitter/X, personal brand storytelling
- **Example**: "We almost shipped the wrong thing. Here's what saved us."
- **Signals**: Short sentences, everyday words, colloquial phrasing, self-deprecating humor

### Professional (Register 2)
- **Voice**: Confident, direct, minimal jargon, outcome-focused
- **When to use**: LinkedIn posts, business audiences, B2B content, newsletters
- **Example**: "Reducing time-to-hire by 40% required rethinking our sourcing strategy entirely."
- **Signals**: Concrete metrics, third-person evidence, balanced sentence length, no slang

### Technical (Register 3)
- **Voice**: Precise, domain-specific, assumes shared vocabulary
- **When to use**: Engineering blogs, developer communities, ML/AI audiences, niche expert communities
- **Example**: "We switched from polling to WebSockets and cut p99 latency by 200ms."
- **Signals**: Acronyms used without definition, domain terms as shorthand, implementation detail comfort

### Executive (Register 4)
- **Voice**: Strategic, high-level, ROI-framed, minimal operational detail
- **When to use**: Board communications, C-suite audiences, investor updates, keynote-style content
- **Example**: "The initiative delivered 3x ARR growth while reducing CAC by 28% in two quarters."
- **Signals**: Business outcomes over methods, compressed timelines, authority framing, no "how" detail

---

## Jargon Budget (0-10 Scale)

The jargon budget controls how much insider terminology to use. Too little signals outsider status; too much alienates the uninitiated or reads as performative.

| Score | Description | Best For |
|-------|-------------|----------|
| 0 | Zero jargon. Plain language only. | Mass consumer audiences, beginners |
| 1-2 | One or two terms max. Defined in-context. | General business audiences, mixed technical literacy |
| 3-4 | Light sprinkling. Terms assumed known but not relied on. | LinkedIn professionals, mid-market B2B |
| 5-6 | Moderate. Assumes shared domain vocabulary. | Practitioners in a field, specialist newsletters |
| 7-8 | Dense. Insider shorthand throughout. | Expert-to-expert content, niche communities |
| 9-10 | Maximum insider. No concessions to outsiders. | Deep technical docs, research papers |

**Default for LinkedIn**: 3-5 depending on persona's domain expertise.

---

## Audience Calibration

Match vocabulary to the persona's `language` field and professional context.

### Matching Rules
1. **Mirror the persona's language style**: If their field uses "ship," you use "ship." If they say "go-to-market," you say "GTM."
2. **One level above or at their register**: Never talk down; slightly elevating register signals respect.
3. **Use their concerns as vocabulary anchors**: If they care about "retention," work that word into framing naturally.
4. **Industry first, role second**: A PM at a SaaS company speaks SaaS + PM vocabulary. Both matter.
5. **Channel shapes register ceiling**: LinkedIn caps at Professional/Technical. Twitter can go casual. Email can go executive.

### Calibration by Persona Language Field
- `"builder"` → Tech/SaaS vocabulary, casual-to-technical register, jargon 4-6
- `"operator"` → Finance/Business vocabulary, professional register, jargon 3-5
- `"marketer"` → Marketing vocabulary, casual-to-professional, jargon 3-5
- `"executive"` → Leadership vocabulary, executive register, jargon 2-4
- `"engineer"` → Tech + AI/ML vocabulary, technical register, jargon 6-8
- `"founder"` → SaaS + Finance mix, professional register, jargon 3-6

---

## Authenticity Signals

Vocabulary is a trust signal. Using the right words demonstrates membership in a professional community.

### Why Vocabulary Signals Insider Status
- Domain terms are learned through lived experience, not Wikipedia
- Authentic practitioners use shorthand; outsiders use full forms
- Mirroring the audience's vocabulary reduces cognitive distance
- Correct usage of nuanced terms (e.g., "RAG" vs. "retrieval") separates credible voices

### Positive Authenticity Signals
- Using terms that are **currently in active use** in the field (not dated buzzwords)
- Combining technical terms with human outcomes ("p99 latency → users stayed")
- Self-correcting or nuancing a term ("what we call 'alignment' internally...")
- Acknowledging trade-offs implied by domain terms ("velocity can be misleading")

### Negative Authenticity Signals
- Using jargon outside its domain context (e.g., "synergy" in a technical post)
- Stacking buzzwords without substance underneath
- Using terms that have been reclaimed as ironic within the field
- Avoiding acronyms that every practitioner uses (signals outsider status)

---

## Avoid List: Overused Buzzwords

These words have been diluted to meaninglessness and now signal inauthenticity. Avoid unless used ironically or with deliberate subversion.

| Word / Phrase | Why to Avoid | Alternative |
|---------------|-------------|-------------|
| synergy | MBA jargon; implies corporate speak | collaboration, combined effect |
| leverage | Overused verb; sounds calculated | use, apply, build on |
| disrupt | Startup cliché; now signals hype | change, challenge, replace |
| paradigm shift | Overpromises; rarely true | fundamental change, rethinking |
| pivot | Overused startup vocabulary; lost impact | changed direction, shifted focus |
| ecosystem | Vague; applied to everything | network, platform, community |
| holistic | Empty modifier; signals vagueness | complete, end-to-end, integrated |
| proactive | Filler adjective | just act; describe the action |
| best-in-class | Self-serving superlative | back with data or remove |
| game-changer | Hyperbole; credibility cost | describe the actual change |
| thought leader | Self-applied; signals insecurity | demonstrate leadership through ideas |
| value add | Corporate HR-speak | contribution, impact, what it unlocks |
| move the needle | Sports metaphor; overused | improve by X%, drive growth |
| low-hanging fruit | Implies laziness | quick wins, easy improvements |
| circle back | Passive avoidance language | follow up, revisit on [date] |

---

## Register Mixing Rules

The highest-engagement formula is **technical insight in accessible language**.

### Rules for Effective Register Mixing
1. **Lead with accessible language, finish with technical credibility**
   - Open in casual/professional register to hook broad audience
   - Deliver the insight in domain-specific terms to signal expertise
   - Example: "Most teams are slow not because of poor engineers — it's the deploy process. When we moved to trunk-based development and cut our CI pipeline from 22 to 4 minutes, velocity doubled."

2. **Never mix registers within a sentence**
   - Consistent register within a clause; allow shifts between sentences or paragraphs
   - Bad: "We leveraged our cross-functional synergies to ship faster."
   - Good: "We broke down silos between design and engineering. The result: features shipped in days, not weeks."

3. **Technical terms earn their place; casual language does the carrying**
   - Each technical term should do specific work (precision, shorthand, credibility)
   - Surrounding language keeps the piece readable for near-domain readers
   - Ratio: 1 technical term per 40-60 words in professional content

4. **Tone words bridge registers**
   - Words like "honest," "real," "practical," "hard-won," "earned" span registers
   - They signal authenticity without being either too casual or too corporate

5. **Avoid jargon laddering** (technical term defines technical term defines technical term)
   - Always ground the chain in a concrete, human outcome

---

## Tone Words by Register

Quick reference for tone-setting vocabulary that doesn't itself carry jargon weight.

| Casual | Professional | Technical | Executive |
|--------|-------------|-----------|-----------|
| honest | direct | precise | strategic |
| real | proven | rigorous | decisive |
| hard | results-driven | systematic | high-impact |
| raw | practical | reproducible | scalable |
| earned | focused | measurable | transformative |
| candid | clear | efficient | authoritative |
| grounded | accountable | optimized | visionary |
