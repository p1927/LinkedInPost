# 12 - Cinematic Craft for AI Directors (cold opens, grammar, realism QA, model dialects)

Date: 2026-10-05. Scope: what the director and verifier agents need to make dramatized cold opens (5-20 s mini scenes) that feel coherent and plausible, plus pure explainers. Does NOT repeat: 03 (shot list/camera table/9:16 safe zones), 02 (ABT/hook patterns/open loops), `direction/shots.md`, `direction/hailuo_cookbook.md` (Hailuo 15 commands, base failure table). Those are referenced, not restated.

Evidence legend: **[P]** primary or vendor doc fetched/seen; **[S]** secondary (blog, film-school site, aggregator); **[R]** craft consensus/rule of thumb; **[W]** weak (single third-party blog, SEO content, or search snippet only, not verified on a primary page). Search results were summarized by tool; where I could not open a primary page I say so.

Card-distillation hooks: sections 3 (archetype -> recipe), 4 (checks with `severity`), 5 (dialect cards) are written as repeating field blocks so each maps to one YAML card.

---

## 1. Cold opens and hooks (what to add beyond doc 02)

### 1.1 Retention data and its trust level
- "50-60% of viewers who drop do so in the first 3 s" and "intro retention above 70%" appear in OpusClip-style vendor blogs and aggregator posts **[W]**. A claim that "YouTube Creator Academy explicitly recommends removing channel intros" came from a search summary, not a page I opened **[W]**. Treat as direction (skip logos, start at the value moment), not as a threshold. Pipeline rule: log first-3 s retention per episode and let analytics replace these numbers. (Same caveat already in doc 02.)
- Pattern names repeatedly cited for Shorts hooks **[W/R]**: visual surprise (incongruous first frame), direct question with on-screen text, and "mid-action open" (start at what would be the 30% mark).

### 1.2 Trailer-editor taxonomy of openings (best-sourced item here)
Derek Lieu (working game/film trailer editor), "Editing an Engaging Trailer Opening" **[S, practitioner]** https://www.derek-lieu.com/blog/2019/10/2/editing-an-engaging-trailer-opening lists six cold-open types. Mapped to our pipeline:
| Type | What it is | Fit for explainer cold open |
|---|---|---|
| Scene lift / in medias res | drop into the middle of an action | best default; "how did we get here?" |
| Thumbstopper/bumper | flash of best images ending on title | good for long-form teaser, weak for 9:16 short |
| Flashback montage | rapid images of backstory | history/biography topics |
| Rug pull | mislead, then reveal true direction | only when the reveal is the topic (misconception videos); spoils on titled platforms |
| Name reveal | withhold identity until end of opening | biographies, "who/what is this" |
| Enigma | intriguing concept demanding resolution (pledge and turn) | mystery/"why does X happen" |
Core test from the same source: the opening must contain a question that begs an answer, or start in the middle of an idea that needs resolving.

Trailer structure **[S: Derek Lieu "Matrix and 3-act structure" https://derek-lieu.medium.com/the-matrix-and-movie-trailer-3-act-structure-b06a68e01214 ; Rare Form audio https://www.rareformaudio.com/blog/how-production-music-reveals-trailer-structure ; Wikipedia Cold open]**: cold open (own mini act) -> setup (shots 2-4 s, sparse music) -> turn/escalation (smash cut or drop to silence, cuts shorten) -> climax montage -> button/stinger. Cold-open music is sparse/percussive and must "wrap up quickly and segue". "Enter late, leave early; calm, pressure, release" is the pacing curve **[S]**.

### 1.3 Cold open budget for our formats **[R, our proposal, untested]**
- Short (<=60 s): cold open 5-8 s (max 10), 2-4 shots, ONE dramatic question, no dialogue longer than one line.
- Long-form: 10-20 s, up to 6 shots, may include a short line of in-scene dialogue.
- Open at peak tension or the moment of consequence (the pursuit already running, the cup already tipping), not the setup. Cut before resolution; the explainer pays off the question.
- Rule: the cold open must pose the same question the explainer answers (same object, same words in the first VO line). A cold open that is only atmosphere is a broken promise.

### 1.4 Bridging from drama into explanation (6 techniques) **[R unless noted; film-grammar sources in section 2]**
1. **Freeze/hold + rewind**: last drama frame freezes, desaturates or gets a UI-style scrub back; VO: "To understand this, rewind 5 minutes."
2. **Sound bridge (J-cut)**: VO or explainer music starts under the last 0.5-1 s of the drama, then picture catches up. L-cut inverse: drama ambience bleeds under the first explainer shot. J/L cuts are the exact bridging device; note the CutCraft benchmark found multi-shot generators are weak at executing J/L cuts **[P-paper abstract, https://arxiv.org/abs/2609.08275]**, so do the audio split in the editor (Remotion/ffmpeg), not in the video model.
3. **Match cut**: shape/motion/colour match between the last drama shot and first explainer visual (spinning coin -> planet, closing door -> bank vault graphic). Needs a graphic designed to the same silhouette and screen position; verify in QA.
4. **Question card**: hard cut to a still/graphic frame carrying the hook question in Remotion text, 0.5-1 s of silence or sub-drop (trailer "drop to silence" device).
5. **Pull-back reveal**: the dramatic scene turns out to be a diorama/screen/map the narrator is looking at (also resets style from cinematic to explainer look).
6. **Narrator step-in**: the explainer mascot/narrator enters the frame in the same lighting and says "Let's slow that down."
Rules: one bridge per episode; the bridge changes style on purpose (cinematic grade -> explainer palette) and must not do both a style change and a location change without a transitional anchor (sound, object or motion).
Return: optionally callback to the final cold-open frame at the end (the loop closes, supports seamless looping in Shorts, see doc 02).

---

## 2. Cinematic grammar the director must obey

### 2.1 Spatial and editing rules (sources: StudioBinder, MasterClass, Learn About Film, Film Independent, script-supervisor guides; all **[S]**)
- **Shot sizes**: extreme wide / wide (establish geography) / medium (action, relationship) / medium close-up / close-up (emotion) / extreme close-up (detail, inserts). Coverage planning goes wide -> medium -> close for clean cutting, preserving geography and blocking. https://www.masterclass.com/articles/film-101-what-is-a-shot-list-how-to-format-and-create-a-shot-list
- **180-degree rule**: draw an axis between two subjects (or along a movement line); keep all camera setups on one side so A always looks screen-right and B screen-left. https://en.wikipedia.org/wiki/180-degree_rule , https://learnaboutfilm.com/film-language/sequence/
- **Crossing the line legitimately [R/S]**: cut to a neutral shot on the axis (POV, extreme close-up, head-on), have the camera move across the line visibly, or have a subject change direction in frame. The StudioBinder Mad Max analysis calls out neutral shots (POV, extreme close-up of a detail) to reorient. https://www.studiobinder.com/blog/best-car-chase-scenes-shots/
- **30-degree rule [R]**: successive cuts on the same subject should change angle by at least ~30 degrees or size by a step, else it reads as a jump cut. (Common rule; I did not open a primary source.)
- **Eyeline match**: shot 1 shows a person looking; shot 2 shows what they see; look direction must be consistent with the position of the target (looking slightly camera-left at B means B looks slightly camera-right at A). https://www.studiobinder.com/blog/what-is-an-eyeline-match/ , https://www.filmmakersacademy.com/glossary/eyeline-match/
- **Shot/reverse shot**: over-the-shoulder or single-subject pairs; eyeline match underpins it. https://www.masterclass.com/articles/shot-reverse-shot
- **Screen direction**: a character/vehicle moving left-to-right must continue left-to-right across cuts unless a visible turn or neutral shot intervenes. For travel/journey/chase, pick a direction once for the sequence (hero moves screen-right = "going forward"; pursuer behind them or opposite side, consistent).
- **Match on action**: cut during the movement (door starts opening in wide, finishes in medium). With AI clips this means ending clip A mid-action and starting clip B at the same pose/velocity (use last-frame chaining, section 2.5).
- **Match cut / graphic match**: shape, colour, position, or motion carries across the cut.
- **Kuleshov effect**: meaning arises from juxtaposition (neutral face + soup/child/coffin = hunger/tenderness/grief). Useful for AI: a neutral, safe-to-generate reaction shot (low-motion face) + a cutaway generates emotion without needing complex acting. https://www.britannica.com/topic/Kuleshov-effect , https://www.premiumbeat.com/blog/kuleshov-effect-in-films/
- **J-cut / L-cut**: J = next shot's audio leads; L = previous audio trails. https://thefilmpost.medium.com/film-cuts-explained-f2151761bd54
- **Establishing then reduce**: but chases may open in the middle, geography established a few seconds later **[S: StudioBinder/Videomaker chase articles]**. The rule in `shots.md` ("first shot is the widest") is the safe default for explainers; allow the exception for pursuit/thriller cold opens only if a wide appears within 2 shots.
- **Parallax and speed [S]**: foreground objects passing the lens fast read as speed; keep action centred so viewers do not search the frame; low camera and tracking exaggerate speed.

### 2.2 Lighting motivation and continuity (cinematography craft **[R]**, script-supervisor sources **[S]**)
- Every light must have a plausible source (window, lamp, sun, screen, fire) visible or implied; hard light direction and colour temperature stay constant within a scene.
- Time of day, weather and sun side must agree between shots in one scene; sun/light direction is as much a continuity element as screen direction.
- Practical (in-frame) lights: if a lamp is on in the wide it is on in the close-up.
- Colour temperature motif: warm tungsten interior vs cool daylight exterior; teal/orange is a style, not a rule, and must be stated once and held.
- Day-for-night, golden hour and overcast give the AI model the easiest, most stable lighting; avoid mixed sources (candle + neon + moonlight) for multi-clip scenes.
- Script-supervisor taxonomy of what must match **[S, https://emahofilms.com/film-continuity-ultimate-guide-to-script-supervision/ ; https://storyflow.so/blog/what-is-continuity-in-film ; https://www.filmindependent.org/blog/script-supervisor-tips-tricks-and-tools-for-better-continuity-and-careers/]**: physical (props, wardrobe, hair, set dressing, state of objects, which hand), spatial (screen direction, eyelines, positions), temporal (light, time of day, weather, story-time), performance (energy, pace, emotional arc).

### 2.3 Lens language (translate to prompt words) **[R]**
| Intent | Lens/words that models generally understand | Realism note |
|---|---|---|
| Epic scale, environment | wide-angle 24 mm, deep focus | edge stretching on faces; keep faces central or small |
| Natural human view | 35-50 mm, medium shot | safest default for dialogue/people |
| Intimacy/isolation | 85 mm, shallow depth of field, bokeh, long lens | background blur hides geography mistakes; good for AI |
| Compressed distance (pursuit, crowd) | telephoto, long lens | flattens depth; hides compositing errors |
| Macro/insert | macro lens, extreme close-up | very good AI territory (objects, textures) |
Kling's and Veo's official guides both list: close-up/extreme close-up, bokeh/shallow DoF, telephoto/long lens, wide-angle, low/high/overhead angle, aerial, pan/tilt/zoom/tracking **[P: https://kling.ai/blog/kling-ai-prompt-guide ; https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1 via fetch]**.

### 2.4 Camera-move vocabulary beyond doc 03
Doc 03 covers push/pull/pan/tilt/truck/pedestal/orbit/handheld/crane. Add: **dolly zoom** (vertigo effect; Seedance and Veo vocab, unreliable), **whip pan** (use as transition, hides cuts), **rack focus** (Runway lists it; shifts attention), **follow/POV/FPV**, **dutch angle** (unease; use rarely), **low-angle** (power) vs **high-angle** (weakness), **over-the-shoulder**, **two-shot**, **one-shot long take** (Seedance token). Prompt rule across vendors: ONE camera move per clip (Seedance, Runway, Hailuo advise it) **[P/S]**.

### 2.5 How AI video models break realism and mitigation
Sources: VBench-2.0 (human fidelity, physics, commonsense, controllability, multi-view) https://arxiv.org/abs/2503.21755 **[P: abstract-level via search; full PDF too large to fetch]**; CutCraft multi-shot editing benchmark https://arxiv.org/abs/2609.08275 **[P-abstract]**; Morphic and Higgsfield troubleshooting posts **[S/W]** https://morphic.com/resources/how-to/ai-video-troubleshooting , https://higgsfield.ai/blog/why-ai-video-generations-fail . Benchmarks report: models struggle with multi-scene narratives (typically single-shot), fail often when asked to change attributes or spatial relations mid-video, are weak on physics for some models, and "plausible multi-shot videos yet fail to execute editorial instructions reliably"; sharp degradation on higher-order montage. Benchmarks under-measure between-shot continuity.

| Failure | Typical sign | Mitigation (director-side) |
|---|---|---|
| Hands/fingers | extra/merged digits, melting grips | hide or occlude hands, simple static grips ("both hands holding a cup"), insert on object not fingers, shorter clips |
| Faces/identity drift | face changes mid-clip or between clips | image-to-video from the same approved keyframe/ref sheet, reference-image features (Kling Elements, Veo Ingredients, Seedance @Image refs, Runway refs), 5-6 s clips, never reframe to an unseen side |
| Text/numbers/signs | letters shimmer or change | never rely on in-video text; ask for blank/blurred/out-of-focus signage; render text in Remotion |
| Physics: liquids, cloth, collisions, gravity | liquid floats, objects pass through each other, impact with no reaction | one object one action, avoid pours/splashes/crashes in close view, show effect via cutaway (sound + reaction + aftermath), slow motion terms, Kuleshov cut instead of depicting the impact |
| Morphing props/objects | cup becomes a different cup, vehicle shape drifts | one prop per clip, keep it in frame centre, lock with I2V keyframe, avoid occlusion then re-emergence |
| Scale/proportion | giant hands, miniature buildings, wrong relative size | include a scale reference (person, door, car), match lens to scale (wide for epic), avoid tilt-shift/miniature wording |
| Crowds | faces merge | silhouettes, backs, long lens, <=2 identifiable people |
| Geography/screen direction | subject flips direction between clips, left/right swap | specify "walking left to right" in every clip of the sequence, give a map sentence in a continuity block, test with a first-frame-last-frame chain |
| Lighting/time-of-day drift | sun side changes, colour grade shifts | single lighting line pasted verbatim into every prompt, same reference image |
| Jitter / too much motion | frame disagreement | pace words ("slowly"), single clear motion, anchor camera or subject **[S: Morphic]** |
| Ignored prompt details | model skips clauses | subject+action first, prune; <=1 camera move; split to two clips **[S]** |
| Cross-shot style inconsistency | each clip a different look | same references and fixed settings across the sequence **[S: Morphic]** |
| Unwanted burned-in subtitles/watermarks/music | Veo/Seedance add captions/logos | see dialect cards in section 5 |
| Multi-shot-in-one-prompt reliability | cuts happen at wrong time or style jumps | prefer one clip per shot, assembled by us; use in-model multi-shot only for 5-8 s mini scenes and verify **[S/P-paper]** |
Best mitigation overall: **generate or pick a keyframe first, then animate** (stated by Seedance guide: "strongest when it starts from a frame you already like" **[S]** https://fuser.studio/articles/seedance-2-5-prompt-guide); use first-frame/last-frame conditioning for match-on-action and continuity (Veo 3.1 first/last frame **[P]**, Hailuo 02 start/end frames **[P: https://www.minimax.io/news/minimax-hailuo-02-start-end-frames-feature-is-now-live]**).

---

## 3. Scene archetypes -> shot recipes (distill to YAML cards)

Conventions: size codes ECU/CU/MCU/MS/WS/EWS; camera move = ONE per clip; each clip 3-6 s; `axis` = the screen direction rule to hold; `ai_safe` = what to prefer so the clip is generatable; `bridge_out` = how to hand to the explainer. All recipes are **[R]** (craft consensus synthesized from the sources in section 2; no single source defines them) unless marked.

```yaml
archetype: duel_standoff            # two opposed parties, tension before action
purpose: stakes, anticipation
shots:
  - {size: WS, move: static, note: "two figures facing each other, left vs right; establishes axis A-left B-right"}
  - {size: MCU, subject: A, move: slow push in, look: screen-right}
  - {size: ECU, subject: A eyes or a hand-less detail}
  - {size: MCU, subject: B, look: screen-left}
  - {size: ECU, subject: B detail}
  - {size: WS or MS, move: static, note: "the moment just before action"}
axis: A always looks screen-right, B screen-left; no crossing without neutral ECU insert
ai_safe: "long lens, shallow DoF, strong silhouette; avoid hands on weapons/props; rely on sound + cut rhythm"
bridge_out: "cut at the beat before action; explainer begins with the cause"
total_s: 8-12
```
```yaml
archetype: pursuit_chase
purpose: urgency, momentum
shots:
  - {size: MS tracking, subject: pursued, move: tracking, note: "moving screen-right"}
  - {size: ECU, subject: feet/wheel/hubcap, note: "speed insert / neutral reorientation shot"}
  - {size: MS, subject: pursuer, direction: also screen-right, depth: behind in frame}
  - {size: POV, note: "obstacle ahead"}
  - {size: WS, note: "geography revealed: gap between them"}
  - {size: MCU, subject: pursued glancing back, look: screen-left (back toward pursuer)}
axis: both move screen-right; pursuer enters from screen-left; reversing direction only with visible turn or neutral shot
ai_safe: "foreground parallax objects; tracking shots; subject from behind; avoid crowd and collisions on screen; imply impact via cut"
bridge_out: "freeze + rewind or sound bridge to 'how did it get here?'"
source_note: "StudioBinder Mad Max analysis: eyelines, neutral shots to reorient, centred action, Kuleshov juxtaposition [S]"
total_s: 6-10
```
```yaml
archetype: reveal
purpose: surprise, scale, 'oh that's what it is'
shots:
  - {size: CU/MCU, subject: observer's face reacting, look: off-screen toward target, move: static or slow push}
  - {size: MS/POV, subject: partial view of target (hidden/occluded)}
  - {size: WS or pull-out/crane, subject: full target with human scale reference}
axis: observer look direction matches target position (eyeline match)
ai_safe: "pull back or tilt up for the reveal in ONE clip; keep person tiny in frame; avoid face morph by showing back/silhouette"
bridge_out: "hold final reveal frame, narrator: 'This is X. Here is why it matters.'"
total_s: 6-10
```
```yaml
archetype: discovery
purpose: curiosity, a found object or clue
shots:
  - {size: WS, subject: character in environment, move: static}
  - {size: MS, subject: character stops/notices, from behind or 3/4}
  - {size: ECU insert, subject: the object, move: slow push}
  - {size: MCU, subject: face, expression: neutral->wonder (Kuleshov)}
axis: character looks the same screen direction in 2 and 4; object is at that position
ai_safe: "object insert is easy; avoid hands touching the object, use light change (glow/spotlight) as the discovery cue"
bridge_out: "object insert becomes first explainer visual (match cut)"
total_s: 8-12
```
```yaml
archetype: confrontation
purpose: conflict between people with dialogue
shots:
  - {size: WS or OTS two-shot, move: static}
  - {size: OTS A->B, move: static, note: "over A's left shoulder"}
  - {size: OTS B->A, note: "mirror of previous, same side of axis"}
  - {size: CU reaction of the listener, not the speaker}
  - {size: MS two-shot as release/escalation}
axis: standard shot/reverse-shot; same side of line; eyelines match
ai_safe: "generate dialogue in separate clips and join; use Veo native audio for single-line dialogue only; avoid more than 2 characters"
total_s: 8-15
```
```yaml
archetype: journey_transit
purpose: movement through space, passage of time, distance
shots:
  - {size: WS, subject: traveller small in landscape, direction: screen-right}
  - {size: MS tracking from behind, same direction}
  - {size: ECU, subject: steps/wheel/compass, note: "same direction"}
  - {size: WS aerial or pull-out showing distance travelled, same direction}
  - {size: time-of-day change only through a dissolve; light must progress logically (morning -> noon)}
axis: all movement screen-right (outbound) and reverse direction (return) to signal coming back
ai_safe: "landscapes and vehicles from far are strong; chain clips with last-frame -> first-frame"
total_s: 8-15
```
```yaml
archetype: countdown_clock
purpose: ticking pressure
shots:
  - {size: ECU, subject: clock/timer/display (rendered in Remotion for exact digits) }
  - {size: MCU, subject: face/eyes, move: slow push}
  - {size: MS, subject: environment reacting (door, light, crowd silhouettes)}
  - {size: ECU, subject: clock again, closer to zero}
  - {size: CU/black, note: "smash cut at zero or drop to silence"}
axis: n/a; keep screen position of the clock constant across cuts
ai_safe: "never let the model draw digits; composite the numbers; use sound design (tick, heartbeat) and cut rate acceleration (3 s -> 1 s shots)"
bridge_out: "smash cut to black -> question card"
total_s: 6-10
```
```yaml
archetype: mystery_enigma
purpose: unanswered question, dread or curiosity
shots:
  - {size: WS, subject: empty or strange space, move: slow push or static, light: low-key, one motivated source}
  - {size: ECU insert, subject: anomaly (object, mark, light)}
  - {size: MS, subject: someone investigating, from behind/silhouette}
  - {size: POV, subject: something partially seen}
  - {size: hold, note: "end before the answer"}
ai_safe: "darkness hides artifacts; fog/mist; avoid human faces"
note: "Trailer 'enigma' and 'thumbstopper' openings [S: Derek Lieu]; must pay off in the explainer"
total_s: 6-12
```
```yaml
archetype: awe_scale
purpose: wonder at size/power
shots:
  - {size: EWS, subject: landscape/cosmos with human or vehicle for scale, move: tilt up or pull-out}
  - {size: CU, subject: face looking up (small), look: up}
  - {size: EWS, subject: reveal of the large thing, move: crane up/pedestal up}
axis: look direction upward must match the position of the object in the following shot
ai_safe: "wide-angle, one move, a recognisable scale reference; no text; VFX space/nature are generally strong"
total_s: 6-10
```
```yaml
archetype: intimate_dialogue
purpose: emotion between two people (or person + mascot)
shots:
  - {size: MS two-shot, move: static, note: "establish positions, who sits left/right"}
  - {size: CU A speaking (screen-right looking), mid-length line}
  - {size: CU B listening, screen-left looking}
  - {size: ECU insert, object (cup, ring) not hands}
  - {size: MS two-shot as button}
axis: A looks screen-right, B screen-left; soft key from the window side, same side every shot
ai_safe: "shot/reverse shot as separate clips from keyframes; short lines; ambient room tone; avoid occluding faces with hands"
total_s: 10-20
```
```yaml
archetype: montage
purpose: time compression, process, accumulation
shots:
  - {size: mix of CU/ECU/MS, count: 5-8, each: 1-2 s}
  - rules: ["one visual theme or a match cut chain", "consistent grade", "rhythm accelerates", "end on a held shot"]
ai_safe: "montages hide continuity because each shot is brief; but CutCraft finds higher-order montage is where models degrade, so assemble clips yourself rather than prompting a montage in one clip [P-abstract]"
total_s: 5-10
```

Selection note for the director: choose the archetype from the topic's emotional question (stakes -> countdown/pursuit, mechanism hidden -> mystery/discovery, scale -> awe, misunderstanding -> confrontation or rug pull, process over time -> journey/montage). Pure explainer remains default; cold open is opt-in per episode and must be paid off.

---

## 4. Realism / coherence QA checklist for the verifier agent

Adapted from script-supervisor four-way continuity (physical, spatial, temporal, performance) **[S]** plus the AI failure taxonomy (2.5). Each item = card. `severity`: blocker (regenerate), major (fix before publish), minor (note). `how`: what to check frame-by-frame (extract first/mid/last frame per clip; compare adjacent clips' last and first frames).

```yaml
- id: spatial.axis_consistent
  severity: blocker
  check: "Within a scene, subject A/B screen-left/right and travel direction are consistent across clips; any flip is motivated by a neutral shot or visible turn"
  how: "Compare last frame of clip N with first frame of N+1 and the declared axis in the continuity block"
- id: spatial.eyeline_match
  severity: major
  check: "Looker's gaze points toward where the target appears in the next shot; reaction shots look the opposite way of the speaker"
- id: spatial.geography_plausible
  severity: major
  check: "Shot relationships fit a single physical map; buildings, doors, roads, horizons do not teleport; real places match their real layout/climate/architecture"
- id: spatial.scale_plausible
  severity: major
  check: "Relative sizes human/vehicle/building/animal are realistic; no giant hands, toy-like cities"
- id: temporal.light_direction
  severity: blocker
  check: "Key light direction, colour temperature and time of day are constant within a scene; practical lights keep their state"
- id: temporal.time_progression
  severity: minor
  check: "Time-of-day, weather and season progress logically between scenes; no sun jumping sides"
- id: physical.props_state
  severity: major
  check: "Props/wardrobe/hair/injuries/vehicle colour same across clips; objects do not appear, vanish, or change type; which hand holds what is stable"
- id: physical.identity
  severity: blocker
  check: "Same face, age, clothing and proportions across clips; compare to the reference keyframe"
- id: physical.hands
  severity: blocker
  check: "Visible hands have 5 digits, plausible joints, no merging with objects; if bad, hide hands or recompose"
- id: physical.physics
  severity: major
  check: "Gravity, liquid, smoke, cloth, impacts behave plausibly; objects do not pass through each other or float; reactions follow causes"
- id: physical.morphing
  severity: blocker
  check: "No object/background morph mid-clip; check first/mid/last frame of each clip"
- id: physical.text_signs
  severity: blocker
  check: "No garbled/shimmering text, watermarks, logos, burned-in subtitles; real signage absent or intentionally blurred; all text comes from Remotion"
- id: physical.crowd_faces
  severity: major
  check: "Background people have no melting faces; crowds are silhouettes or small"
- id: performance.motion_quality
  severity: major
  check: "No jitter, rubbery limbs, foot-sliding, face stuck, floating walk; speed and energy continuous across the cut"
- id: performance.reaction_motivation
  severity: minor
  check: "Characters react to events visible/audible in the scene; emotion consistent with the Kuleshov-juxtaposed shot"
- id: editing.match_on_action
  severity: major
  check: "Cuts on action keep pose/velocity/direction; no jump cuts (same size, same angle within ~30 degrees)"
- id: editing.shot_variety_and_size_logic
  severity: minor
  check: "Wide appears within first 2 shots (except chase), size progression purposeful, no more than one camera move per clip"
- id: editing.bridge_quality
  severity: major
  check: "Cold-open -> explainer bridge is intentional (sound bridge, match cut, card, or reveal), and the first explainer line answers the cold-open question"
- id: editing.cold_open_budget
  severity: minor
  check: "Cold open within budget (5-10 s short, 10-20 s long); first 1-3 s has motion and a question/stakes; no logo/title first"
- id: audio.sync_and_continuity
  severity: major
  check: "Dialogue/SFX/ambience match picture; room tone consistent across cuts; no accidental music/subtitles from the model"
- id: factual.real_world_plausibility
  severity: blocker
  check: "Drama obeys the explainer's facts (correct era, technology, geography, units); props are period-correct; any simplification is declared in the claims list"
- id: safety.style_bible
  severity: minor
  check: "Palette, grade, aspect, safe zones follow the style bible and doc 03 checks"
```
Verifier protocol suggestion **[R]**: (1) extract first/middle/last frames per clip and a contact sheet per scene, (2) run the blocker list on every clip, (3) run spatial/temporal on every cut pair, (4) return a per-clip verdict `pass | regenerate(reason) | recompose(reason)` with the exact frames cited. Keep authoring and verifying in separate agent lanes (project rule).
Note: automated metrics (VBench-style) measure fidelity/physics at the single-video level and under-measure between-shot continuity **[P-abstract]**, so a vision-LLM or human pass on adjacent-frame pairs is needed; treat LLM-judge accuracy on physics as unverified.

---

## 5. Per-model prompt dialects

Vendor docs were partly unreachable (Google blog and Replicate failed with an SSL error on one tool attempt; BytePlus and Alibaba docs returned navigation shells). Cards cite what was actually read; versions change monthly, so every card carries `verify`.

```yaml
model: hailuo_minimax
evidence: "S (minimax-ai.chat guide, segmind, search snippet citing MiniMax docs) - official platform.minimax.io page not opened"
structure: "[Camera Shot + Motion] + Subject + Action + Scene + Lighting + Style/Mood (alt: Subject, Action, Setting, Light/Look, Camera Command, Continuity note)"
camera_tokens: "15 bracket commands, see direction/hailuo_cookbook.md; max 3 per bracket e.g. [Pan left,Pedestal up]; keep exact capitalisation/brackets; avoid mixing near-duplicates (pan+truck, tilt+pedestal)"
length: "max 2000 chars API / 1000 chars demo UI [S]; 5-10 s clips; start/end frames feature on Hailuo 02 [P-news]"
negative_prompt: "unsupported [S]"
pitfalls: ["bracket commands documented for Hailuo-2.3 / 02 / Director variants; claim that the newest 'MiniMax-H3' endpoint dropped them is single-source [W] - test", "don't over-describe appearance in I2V", "multiple scenes in one short clip degrade", "natural language fallback when unsure"]
verify: "run one A/B test per command before trusting"
```
```yaml
model: kling
evidence: "P for kling.ai blog (fetched); formula for 2.1 from search summaries [S]"
structure: "Subject + Subject movement + Scene + (Camera language + Lighting + Atmosphere); I2V: Subject + Movement + Background"
camera_tokens: "natural language: close-up, medium close-up, full body, establishing wide, push-in, pan, tilt, tracking, low-angle, overhead, aerial, bokeh, telephoto, rule of thirds; 'slow dolly-in' beats vague 'cinematic' [S]"
length: "no strict limit; clarity over length; plain language"
multi_shot: "Multi-Shot mode: automatic (prompt-led) or custom (per-shot duration, size, perspective, camera move); 'define the setting first, then organise by shot order' [P]"
consistency: "Element References / video references for character/prop/product [P]"
negative_prompt: "not covered in the official guide fetched [P]"
pitfalls: ["vague words like 'magic'", "technical claims instead of visible motion", "inconsistent character description across shots"]
```
```yaml
model: veo
evidence: "P for Google Cloud Veo 3.1 guide (fetched once successfully); dialogue/subtitle tips from third-party posts [S/W]"
structure: "[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance] (+ Audio)"
camera_tokens: "dolly, tracking, crane, aerial, slow pan, POV, wide, close-up, extreme close-up, low angle, two-shot, shallow DoF, wide-angle, macro, soft focus [P]"
length: "clips 4/6/8 s; 720p/1080p; 16:9 and 9:16 [P]"
audio: "dialogue in plain speech phrasing; 'SFX: ...'; 'Ambient noise: ...' [P]; use colon not quotes ('Character says: line') and add 'no subtitles' to avoid burned-in captions, avoid apostrophes in spoken lines [W - community consensus, not vendor]"
multi_shot: "timestamp prompting [00:00-00:02] ... [00:02-00:04] ... inside one 8 s generation [P]"
consistency: "Ingredients to Video (reference images), First & Last Frame interpolation [P]"
negative_prompt: "Google guide says use negative prompts to exclude unwanted elements [P]"
pitfalls: ["subtitle bug", "8 s ceiling means one micro-scene per generation", "dialogue short"]
```
```yaml
model: seedance
evidence: "S (fuser.studio guide for 2.0/2.5; search snippets for 1.0 official 'lens switch' formula). BytePlus docs page fetched was a nav shell - claims about 2.5 are third-party [W]"
structure: "subject + action, scene, style, camera movement, sound (BytePlus order per aggregator); 1.0 formula: Subject + Action + Scene + Camera + Style/Atmosphere"
camera_tokens: "natural-language film terms: extreme wide/wide/medium/close-up; push in, pull out, pan, track, orbit, tilt, dolly zoom, handheld shake, one-shot long take; ONE movement per shot"
multi_shot: "'Shot 1 / Shot 2' blocks; 'lens switch' / 'Cut to' for cuts; integer-second timestamps only on 2.5 (2.0 may misbehave with timestamps) [W]"
length: "2.0: 4-15 s up to 4K; 2.5: 4-30 s 1080p [W]"
audio_syntax: "angle brackets for effects, curly braces for dialogue, round brackets for music [W]"
references: "@Image1/@Video1/@Audio1 with explicit purpose ('Image 1 is the face') [W]"
pitfalls: ["unwanted subtitles/watermarks/BGM: state 'No subtitles, no watermarks'", "style drift: state style or pre-style refs", "best from a keyframe you already like"]
verify: "model versions named 2.0/2.5 and their limits come from one blog; confirm in the BytePlus console"
```
```yaml
model: runway
evidence: "S (queststudio summary of the Gen-4.5 guide; search summary of official Gen-4 guide). Official help page not opened"
structure: "Gen-4.5: Subject + action + setting + camera + motion over time + style + lighting + constraints; I2V: camera move + subject action, text prompt almost entirely about motion"
camera_tokens: "static frame ('camera remains perfectly still'), push in, pull back, orbit, track, rack focus"
length: "4-12 s on Gen-4.5; one shot per prompt"
negative_prompt: "NOT supported; use positive phrasing (official guide, per summaries)"
pitfalls: ["screenplay-length prompts", "re-describing the image in I2V", "too many simultaneous changes", "omitting camera instruction"]
strength: "temporal/world consistency and references for characters"
```
```yaml
model: wan
evidence: "S (search summaries of Alibaba Cloud Model Studio guide, VEED, MimicPC). Alibaba doc fetch returned empty"
structure: "Subject + Scene + Motion description (amplitude/speed/effect) + Aesthetic control (light source, lighting environment, shot size, camera angle, lens, camera movement) + Style"
i2v_formula: "Motion + Camera movement"
camera_tokens: "pan L/R, tilt U/D, dolly in/out, tracking, orbital arc, crane, pull-back, whip pan; keep motion description separate from camera description"
pitfalls: ["mixing motion and camera in one clause", "unspecified speed words ('slowly')"]
verify: "wan 2.2 vs later versions differ; confirm clip length (commonly ~5 s) and prompt-extension setting"
```

Cross-model rules the pipeline can encode **[R, consistent across all vendor guides read]**: (1) one subject, one action, one camera move per clip; (2) camera on its own clause; (3) I2V prompts describe change only; (4) positive phrasing, except Veo/Seedance where explicit "no subtitles/watermark" constraints are community-standard; (5) for sequences prefer one clip per shot with references and last-frame chaining; (6) all readable text via Remotion; (7) add an explicit "camera static" when only the subject should move (Runway and Hailuo both say so).

---

## 6. Gaps and weak claims
- Retention thresholds (3-s drop-off, 70% intro retention) are vendor/aggregator figures **[W]**.
- Shot-recipe cards (section 3) are my synthesis of craft sources; no source gives canonical recipes for "duel", "countdown", etc. **[R]**. They should be A/B tested with the verifier checklist.
- Model dialects: official pages for Hailuo, Seedance, Wan, Runway, and the Veo blog were not all retrievable; Seedance 2.x/2.5 specifics and Hailuo "H3" are third-party **[W]**. Re-verify before hard-coding tokens.
- VBench-2.0 and CutCraft were read at abstract level only.
- The 30-degree rule and lens-to-feeling mapping are standard craft but I did not open a primary ASC/film-school page for them **[R]**. No ASC article was fetched.
- The ability of an LLM verifier to judge physics/eyelines from frames is untested; start with human spot checks.

## 7. Sources
- Cold opens/trailers: https://www.derek-lieu.com/blog/2019/10/2/editing-an-engaging-trailer-opening ; https://derek-lieu.medium.com/the-matrix-and-movie-trailer-3-act-structure-b06a68e01214 ; https://www.rareformaudio.com/blog/how-production-music-reveals-trailer-structure ; https://en.wikipedia.org/wiki/Cold_open
- Retention (weak): https://www.opus.pro/blog/ideal-youtube-shorts-length-format-retention ; https://aibrify.com/blog/youtube-shorts-retention-curve-playbook
- Grammar: https://en.wikipedia.org/wiki/180-degree_rule ; https://learnaboutfilm.com/film-language/sequence/ ; https://www.studiobinder.com/blog/what-is-an-eyeline-match/ ; https://www.filmmakersacademy.com/glossary/eyeline-match/ ; https://www.masterclass.com/articles/shot-reverse-shot ; https://www.britannica.com/topic/Kuleshov-effect ; https://www.premiumbeat.com/blog/kuleshov-effect-in-films/ ; https://thefilmpost.medium.com/film-cuts-explained-f2151761bd54 ; https://www.studiobinder.com/blog/best-car-chase-scenes-shots/ ; https://www.masterclass.com/articles/film-101-what-is-a-shot-list-how-to-format-and-create-a-shot-list
- Continuity: https://emahofilms.com/film-continuity-ultimate-guide-to-script-supervision/ ; https://storyflow.so/blog/what-is-continuity-in-film ; https://www.filmindependent.org/blog/script-supervisor-tips-tricks-and-tools-for-better-continuity-and-careers/ ; https://howtofilmschool.com/dictionary/continuity-film/
- AI failure/benchmarks: https://arxiv.org/abs/2503.21755 ; https://arxiv.org/abs/2609.08275 ; https://arxiv.org/pdf/2503.06800 (VideoPhy-2, listed not read) ; https://morphic.com/resources/how-to/ai-video-troubleshooting ; https://higgsfield.ai/blog/why-ai-video-generations-fail
- Models: https://kling.ai/blog/kling-ai-prompt-guide ; https://kling.ai/blog/kling-ai-motion-prompts-guide ; https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1 ; https://minimax-ai.chat/guide/hailuo-video-prompts/ ; https://www.minimax.io/news/minimax-hailuo-02-start-end-frames-feature-is-now-live ; https://fuser.studio/articles/seedance-2-5-prompt-guide ; https://docs.byteplus.com/en/docs/ModelArk/1587798 ; https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt ; https://queststudio.io/blog/runway-prompts ; https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide ; https://www.veed.io/learn/wan-2-2-prompting-guide ; https://github.com/snubroot/Veo-3-Prompting-Guide
