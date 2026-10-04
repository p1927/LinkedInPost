# Storytelling and Script Design for 45-60s ELI5 Explainer Shorts

Date: 2026-10-05. Evidence labels: **[E]** = documented/primary or well-sourced; **[V]** = vendor/blog claim, treat as hypothesis; **[F]** = folk wisdom/craft heuristic, test on your own analytics. Timings are our own design proposals, not sourced facts.

## 1. Narrative structures that fit 45-60s

- **Story Spine** (Kenn Adams, c.1991; popularised at Pixar via Rebecca Stockley) **[E]**: "Once upon a time / Every day / But one day / Because of that (x3) / Until finally / And ever since then." Source: NPR, SessionLab.
- **ABT: And, But, Therefore** (Randy Olson, from the South Park "rule of replacing" and Frank Daniel) **[E]**: "and, and, and" is a list; "but" adds conflict, "therefore" adds resolution. Best default for a 30-60s explainer because it is a three-beat skeleton.
- **Harmon Story Circle** (You, Need, Go, Search, Find, Take, Return, Change) **[E]**: eight steps; too many for 60s unless compressed (see 90s sheet).
- **Misconception-first** (Veritasium) **[E]**: Derek Muller's PhD work reports that lecture-style science videos can reinforce misconceptions, and that videos which raise and address the common misconception do better. Source: Big Think, THE Journal. Veritasium's pattern: state the intuitive wrong idea, test it, explain.
- Kurzgesagt reportedly spends many drafts balancing facts with story **[E]** (kurzgesagt.org). Their depth is not replicable at Shorts scale; borrow the principle: cut anything not serving the one idea.

**Rule: one idea, one ABT, one analogy per Short.**

### Worked beat sheets (our proposals; at ~2.5 words/sec)

**30s (about 70 words)**
| Sec | Beat | Words |
|---|---|---|
| 0-3 | Hook (contradiction or question) | 8 |
| 3-10 | AND: the everyday normal | 17 |
| 10-18 | BUT: the surprise/problem | 20 |
| 18-27 | THEREFORE: analogy resolves it, true term lands | 22 |
| 27-30 | Punchline/loop back to hook | 8 |

**60s (about 135 words)**
| Sec | Beat | Words |
|---|---|---|
| 0-4 | Hook | 10 |
| 4-12 | AND: familiar world, mascot present | 20 |
| 12-22 | BUT: the puzzle; open loop #2 ("the weird part is coming") | 25 |
| 22-30 | Wrong guess tested (misconception) | 20 |
| 30-35 | Mid re-hook (visual change + "but here's the catch") | 12 |
| 35-48 | THEREFORE: analogy shown, then true term | 28 |
| 48-55 | Payoff: answer hook's question; callback | 14 |
| 55-60 | Ending line + CTA | 8 |

**90s (about 205 words), Story Circle compressed**
You/Need (0-10, hook plus desire to know) / Go (10-20, enter the strange case) / Search (20-45, two attempts, one fails, re-hook at 45) / Find (45-60, analogy click) / Take (60-72, cost or catch: the limit of the analogy) / Return (72-82, back to everyday, new eyes) / Change (82-90, callback plus CTA).

## 2. Hooks

Evidence note: the claims "50-60% of drop-off occurs in the first 3 seconds" and "3-second hold drives distribution" come from vendor blogs (Opus Pro, Toptal) **[V]**. The principle "start with the most interesting thing, no logo/intro" is consistent across creator guidance **[F/V]**. Measure your own Audience Retention graph.

Twelve patterns (ELI5 examples):
1. **Question**: "Why can't you just print more money?"
2. **Contradiction**: "Ice is lighter than water. That's the only reason fish survive winter."
3. **Stakes**: "If bees vanished, your breakfast shrinks. Here's by how much."
4. **Mystery**: "Nobody can explain why this spoon-shaped rock keeps rolling uphill." (only if true and payable)
5. **You've been told wrong**: "Your teacher lied about why the sky is blue." (see claim-check below)
6. **Visual shock**: first frame is a huge or impossible image (a car-sized grain of rice), narration explains in beat 2.
7. **Smallest-to-biggest**: "This one grain of salt holds more atoms than stars you can see."
8. **Challenge**: "Guess which falls faster. You're probably wrong."
9. **Cold-open result**: show the end (the soufflé collapsing), then "here's why".
10. **Kid's question**: "A 5-year-old asked me why the moon follows the car."
11. **Number with a face**: "$1 trillion is a stack of bills this high" with a visual.
12. **Second-person scenario**: "You're stuck in line at a bank. Everyone panics. Welcome to a bank run."

**Anti-clickbait rules [F]**: the hook must be paid off in the same video, using the same words; no promise the script cannot keep; a "you were told wrong" hook requires a documented source for the claim; avoid false urgency. Hooks that are paid off protect retention and trust; the retention penalty for broken promises is widely asserted but not rigorously documented here **[F]**.

## 3. Open loops, payoffs, re-hooks, endings

- **Open loop [F, widely taught; vendor sources say a hook should "create an open loop"]**: ask a question the viewer wants answered, delay the answer. Max 2 loops open at once in 60s. Every loop needs a logged payoff.
- **Mid re-hook** around 50-60% of runtime: a visual change (new scene style, zoom, mascot reaction) plus a line like "But that's not the weird part." Rationale **[F]**: viewers re-decide to stay mid-video.
- **Callbacks**: reuse the hook's exact object or phrase in the last beat so the loop closes (e.g., hook "a grain of rice"; final line "...and that's one grain of rice").
- **Ending**: end on the payoff or a punchline, not on "so yeah." Consider a seamless loop (last line flows into first line) since Shorts loop **[F]**.
- **CTA**: one CTA only, at the end, framed as the next open loop ("Next: why prices fall in a recession. Follow to see it."). Avoid CTAs before the payoff.

## 4. Analogy design

Process **[F, craft synthesis; no controlled study cited]**:
1. **Name the mechanism** in one sentence in true terms (the "source claim").
2. **Pick a familiar domain** a 5-year-old has touched: food, toys, playground, traffic, water.
3. **Map the parts**: list source-element to analogy-element pairs (e.g., voltage to water pressure, current to flow, resistor to narrow pipe).
4. **Test accuracy**: for each pair, what relation is preserved? Where does the analogy break? State one limitation in the script or a pinned comment. Reject analogies that predict a wrong result (e.g., "electricity is used up like water").
5. **Picture first, term second**: show and say the image ("the crowd all runs to the bank"), then name it ("that's a bank run") after the viewer has the picture. Match with an on-screen text label at the moment of naming.
6. **Cap at one analogy**; mixing two confuses.

Fact-check: the director step should emit a "claims" list, each with a source URL, which the human verifies before approval.

## 5. Writing for the ear

- **Pace**: audiobook/narration norm about 150-160 wpm; explainers 140-160; lively promos 160-180; comprehension reportedly drops above about 180 **[V: voice-over and speech-rate blogs; Mental Floss, Narrationbox]**. Use **2.5 words/sec (150 wpm)** for budgeting; short-form often goes faster, so run TTS timing and adjust.
- **Budgets**: 30s about 70 words, 45s about 105, 60s about 135 (leaves room for pauses).
- **Sentences**: 6-12 words average; one idea each; maximum 18. Vary length: short, short, longer, short.
- **Rhythm**: rule of three; end sentences on the stressed noun; put the surprise last in the sentence.
- **Reading level**: aim for grade 3-5 vocabulary for ELI5 **[F]**; check with Flesch-Kincaid but treat it as a proxy.
- **Ear rules [F]**: no parentheses, no stacked clauses, no homophone traps, say numbers as people say them ("about a million"), repeat the key noun rather than "it/they", read aloud before approval, avoid tongue twisters.
- **Pronunciation field**: list hard terms with phonetic spellings for TTS.

## 6. Recurring characters and series design

- **Mascot [F]**: one character who asks the dumb-smart question, reacts visually, and carries humor (the "kid" stand-in). Keep a fixed design, voice, and 2-3 traits.
- **Running gags [F]**: one small recurring visual (e.g., mascot always ends in a food-related mishap). Never let the gag block explanation.
- **Catchphrase [F]**: a short sign-off or reveal line used at the payoff beat (e.g., "Simple, right?"). Use sparingly to stay fresh.
- **Series bible (fields)**: premise and audience; mascot sheet (look, voice, traits, do/don't); topic pillars (economics, science, physics, food, places, math); per-pillar visual palette; fixed intro length (zero seconds recommended); recurring formats (e.g., "Myth vs Fact", "Zoom Out"); banned words; tone; analogy library and used-analogy log; CTA wording; sponsor rules; fact-check policy.
- **Format variety**: rotate 3-4 recurring formats so viewers can predict the pleasure but not the content **[F]**.

## 7. Weaving a sponsor honestly

Principle **[F]**: the product must be true to the story, never a pivot to an ad. Disclose per platform rules (YouTube paid-promotion label; check current policy) and keep the sponsor segment short and visibly marked. Never claim what the product cannot do.

1. **Product as the example**: Topic "compound interest"; a savings app is shown as the real place compounding appears. Beat: THEREFORE shows the app's interest line growing, with the limit stated ("rates change").
2. **Product as the prop**: Topic "how plants make food"; a sponsor's plant-sensor/gadget measures sunlight on the mascot's windowsill; the reading is the evidence in the Search beat.
3. **Product as the solution**: Topic "why bread goes stale"; a sponsor's airtight container is the Therefore: it addresses the exact mechanism just explained (moisture migrating), no more.

Test: remove the sponsor beat; the story must still make sense. Add the sponsor beat; it must still be true.

## 8. SCRIPT TEMPLATE and QA checklist

```yaml
title:
pillar: economics|science|physics|food|places|math
one_idea: (one sentence, true terms)
audience_misconception: (what they think)
structure: ABT | Spine | Circle
target_runtime_sec: 45-60   # word_budget = runtime * 2.3
hook: {pattern: , line: , visual: , seconds: 0-4}
open_loops: [{question, opened_at, payoff_at}]
analogy: {source_term, analogy_domain, mapping: [[a,b]], limitation, true_term_reveal_at}
mascot_role:
claims: [{claim, source_url, verified: false}]
sponsor: {present: false, role: example|prop|solution, disclosure: }
scenes:
  - n:
    t_start: t_end:
    beat: hook|and|but|therefore|rehook|payoff|cta
    narration: ""
    words: 0
    visual: ""
    camera: ""   # shot, move, framing
    on_screen_text: ""
    sfx_music: ""
    pronunciation: ""
ending: {callback, cta, loop_to_hook: bool}
pinned_comment: (sources + analogy limits)
```

**QA checklist (director step runs before human approval)**
1. One idea, one analogy, one CTA.
2. Hook within 4 seconds, with a visual and a line; promise paid off verbatim.
3. Every open loop has a payoff time; at most 2 open at once.
4. Re-hook between 50 and 60% of runtime.
5. Word count within budget (total words / 2.5 within runtime +/- 3s); sentences average 12 words or fewer.
6. Picture-before-term: analogy shown before true term named; term appears on screen.
7. Analogy mapping complete; limitation stated; no wrong predictions.
8. Every factual claim has a source URL; numbers re-computed.
9. Hook is not clickbait (no unsupported "everyone is wrong").
10. Callback present in the final beat; ending is not a trailing sentence.
11. Scene durations sum to runtime; each scene has narration, visual and camera fields; no scene over 8s without a visual change.
12. Sponsor (if any) passes the remove/add test and has disclosure.
13. Read-aloud pass: no tongue twisters; pronunciation list included.
14. Mascot and series-bible compliance.

## Limits of this research
No controlled studies were found on hook patterns or short-form analogies; most short-form retention numbers are vendor claims. Treat this as a hypothesis set and A/B on your own analytics (audience retention graph, swipe-away rate).

## Sources
- Story Spine, NPR (2026-06-23): https://www.wlrn.org/npr-breaking-news/2026-06-23/meet-the-creator-of-the-story-spine-an-8-sentence-tool-to-create-and-analyze-stories
- SessionLab Story Spine: https://www.sessionlab.com/methods/story-spine
- Randy Olson ABT (Houston, We Have a Narrative): https://edgeforscholars.vumc.org/applying-a-narrative-framework-to-communicating-science/
- Dan Harmon Story Circle: https://www.thebookdesigner.com/the-dan-harmon-story-circle/ and https://fictionary.co/journal/dan-harmon-story-circle
- Veritasium/Derek Muller: https://thejournal.com/Articles/2015/05/05/Watching-Videos-Does-Not-Necessarily-Lead-to-Learning.aspx and https://www.scientificamerican.com/article/how-youtube-star-derek-muller-of-veritasium-is-challenging-scientific/
- Kurzgesagt video process: https://kurzgesagt.org/youtube/
- Shorts hook guidance (vendor): https://www.opus.pro/blog/youtube-shorts-hook-formulas and https://www.toptal.com/creator/post/youtube-shorts-length
- Narration pace: https://www.mentalfloss.com/posts/how-many-words-per-minute-do-people-speak and https://narrationbox.com/tools/words-to-minutes-audio-calculator
