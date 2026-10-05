# Shot Vocabulary, Camera Moves, Composition, Pacing, and Storyboard Rules

Evidence tags: [E] sourced, [R] craft rule/consensus, [U] unverified—check primary platform docs before locking.

---

## Shot Types

| Shot | Purpose | 9:16 note |
|---|---|---|
| Wide / establishing | Context, scale, "where are we" | Works best for tall subjects (towers, stacks). Avoid—loses width. |
| Medium | Default: character acting, explaining | Best workhorse in 9:16. |
| Close-up | Emotion, one key detail, reaction | Strong for mascot reaction beats. |
| Insert | Cutaway proving the point: a prop, a diagram, a number | Use for term-reveal and data beats. |
| POV | Viewer becomes the character ("imagine you…") | Good for second-person scenario hooks. |
| Over-the-shoulder | Two-party relationship (buyer/seller, banker/customer) | Use sparingly; hard to stage in 9:16. |

---

## Camera Moves and What Each Does

All psychological effects are [R, film-craft convention, not experimentally proven].

| Move | Effect | Hailuo command | Remotion equivalent |
|---|---|---|---|
| Push in | Focus, intimacy, rising tension, "this matters" | `[Push in]` | `scale: 1.0 → 1.08` |
| Pull out | Context reveal, isolation, resolution, ending | `[Pull out]` | `scale: 1.1 → 1.0` |
| Pan left/right | Scan, follow movement, lateral reveal | `[Pan left]` / `[Pan right]` | `translateX` |
| Tilt up | Scale, power, aspiration | `[Tilt up]` | `translateY` (great for tall 9:16) |
| Tilt down | Weight, defeat, landing | `[Tilt down]` | `translateY` |
| Truck left/right | Parallel travel, neutral observation | `[Truck left]` / `[Truck right]` | `translateX` with no zoom |
| Pedestal up | Rise, reveal what's above, optimism | `[Pedestal up]` | `translateY` + slight `scale` |
| Pedestal down | Zoom into detail, ground the scene | `[Pedestal down]` | reverse above |
| Zoom in | Emphasis, same as push but field-of-view | `[Zoom in]` | `scale` |
| Zoom out | Grand reveal | `[Zoom out]` | `scale` |
| Static | Calm; let narration and subject carry the scene | `[Static shot]` | no move |
| Shake | Urgency, anxiety, impact | `[Shake]` | use lightly |
| Tracking | Follow a moving subject | `[Tracking shot]` | `translateX` tracking |
| Orbit | 3D importance of an object | natural language only; less reliable | not built-in |

**Bracket form (Hailuo 2.3; permitted on H3 but not the house default):** on MiniMax-H3 write the move as a natural camera sentence ("The camera pushes in with small amplitude at slow speed toward ..."), per `craft/dialects/hailuo.md` sections 0b and 12.6. Hailuo combination rule: put commands in one bracket to run simultaneously (max 2–3), separate brackets run in sequence. Example: `[Push in, Tilt up] The coin stack grows.`

---

## 9:16 Composition Rules [R]

- **Canvas:** 1080 × 1920 px. [E]
- **Vertical frame bias:** favor tall subjects, stacks, columns, and single centered characters with generous vertical negative space.
- **Rule of thirds:** key subject on upper-middle third intersection (y ≈ 640 px); eyes at 35–40% from top.
- **Headroom:** 8–10% above the subject's top.
- **Captions:** lower-middle zone (y ≈ 55–65% of height), above the platform UI zone, never over the focal subject.
- **Icons and stickers:** upper third beside subject, not under the right-hand button column.
- **Ken Burns margin:** generate illustrations with 10–15% extra canvas so push-in moves never expose edges.

---

## Safe-Zone Constants

No numbers here: `video-pipeline/config/safe_zones.yaml` is the single source (owner: `DESIGN_SYSTEM.md` section 4). The value of record is the preset `shorts_9x16_platform` (decided 2026-10-05 from the platforms' own overlays, evidence in the yaml): a text box, a right-rail no-go notch, a caption band and a decoration-bleed box. Read it in code with `safe_zones.box("text" | "rail" | "caption" | "art")`. The third-party union that used to be inlined here is kept as `shorts_9x16_strict`.

---

## Pacing Rules [R, no rigorous public evidence found for optimal cut rate]

- **Visual change cadence:** every 2–4 s (new image, camera move, sticker pop, caption emphasis).
- **Max static hold without any motion:** ~5 s; beyond this, drop-off risk rises.
- **Hook rule:** first 1–2 s must contain visible motion and the claim/question in frame.
- **Rhythm pattern:** fast cluster (3 shots in ~4 s) for a list → held shot (4–6 s) for the key insight → short silence before punchline.
- **Hold intentionally on:** formula/diagram the viewer must read; a surprising number; the final CTA frame (≥ 2 s).
- **Cut timing:** on sentence and clause boundaries; visual arrives ~100–200 ms before the word it illustrates.
- **Transitions:** mostly hard cuts and quick (6–10 frame) slides; one signature transition maximum per episode.

**Motion easing principles [R, derived from Disney's 12 animation principles]:**
- Ease-in/out everything; no linear moves.
- Anticipation: small counter-move before a large one.
- Overshoot and settle on sticker/caption pops.
- One focal point per frame (staging).
- Secondary action sparingly.

---

## Storyboard Rules (ViMax-style, expressed independently)

Purpose of each shot: state in one sentence what question it answers or what feeling it creates. A shot without a clear purpose is cut.

1. **First shot is the widest.** Establish scale and world before moving closer.
2. **Wide → medium → close.** Each shot narrows the viewer's attention to the key detail.
3. **Show concrete actions, not states.** "Bruno lifts the cookie" is storyboard-ready. "The cookie is expensive" is not.
4. **Repeat character descriptors verbatim** across every prompt that includes the same character. Do not paraphrase the character description—AI image models drift.
5. **Camera move is its own sentence.** Describe what the camera does separately from what the subject does. Example (H3 house form): `The camera pushes in at slow speed toward Bruno. Bruno lifts his lantern. Warm light spills over his face.` (2.3 form: `[Push in] Bruno lifts his lantern. ...`) Not: `Push-in on Bruno lifting the lantern with warm light.`
6. **No text inside AI-generated images.** All text, numbers, labels, and captions are rendered in Remotion. Do not prompt an image model to show readable text.
7. **One action per AI-video clip.** Complex simultaneous actions (character runs, crowd cheers, rain falls, dog barks) degrade quality. Split into sequential clips or simplify.
8. **Hide hands when possible.** Hands are a known failure mode for current image/video models. Use pockets, behind-back, or out-of-frame compositions.
