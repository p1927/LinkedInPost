# Worked Example

One character, one scene, three shots, start to finish. Tool-agnostic — substitute whichever generator you use, following the conditioning-mode guidance in `tool-matrix.md`.

The point of this file is the *order of operations* and the decision points, not the specific prose.

---

## The brief

A two-shot scene plus a reverse. MARA, late thirties, finds a letter on a kitchen counter at dusk and reads it. Second character TOBIAS watches from the doorway.

---

## Step 1 — Cast

Generated 14 candidate portraits. Rejected the first nine as too conventionally attractive — smooth, symmetrical, no anchor for the model to hold onto.

Kept the candidate with a slightly crooked nose, heavy brows and a visible scar through the left eyebrow. Not the prettiest. The most *specific*.

**Approved as `refs/mara_canon.png`.** Front, neutral, mouth closed, soft even light, plain mid-grey background, 2048px. Never regenerated after this point.

Decision recorded: Tobias is cast tall, fair, close-cropped — deliberately unlike Mara in silhouette, hair and colouring, because two dark-haired characters of similar build blend when they share a frame.

## Step 2 — Turnarounds

Six generations from the canon frame, one angle each, using the turnaround prompt in `prompt-blocks.md`.

The 3/4 left came back with a subtly different jaw. Regenerated it twice before it matched. **This is normal and it is much cheaper here than later** — a wrong 3/4 reference silently poisons every shot generated from it.

```
refs/mara_canon.png
refs/mara_3q_left.png
refs/mara_3q_right.png
refs/mara_prof_left.png
refs/mara_prof_right.png
refs/mara_rear.png
refs/mara_detail_brow_scar.png
```

## Step 3 — Identity block

```
IDENTITY — MARA
Age: 36-40
Build: medium, 168cm, square shoulders
Face: broad oval, wide-set grey eyes, heavy dark brows,
      nose slightly crooked to the left, full lower lip,
      soft jaw
Hair: dark brown, shoulder-length, centre-parted, tucked behind
      the right ear
Marks: 2cm white scar through the left eyebrow, vertical
Skin: fair, freckled across the nose, visible pores
WARDROBE (locked, scene 4): navy wool cardigan over a white tee,
      buttoned to the third button; dark jeans; no jewellery
LOCKED: face structure, eye colour, brow scar, hair, wardrobe
FREE: expression, pose, head angle
```

## Step 4 — Environment

One master establishing frame of the kitchen at dusk, approved as `refs/kitchen_master.png`.

Written into the environment sheet, including the line that matters most: **what is off-screen behind camera** — a doorway to the hall, screen-right of the counter. That is where Tobias will stand in the reverse, and defining it now is the difference between one room and two.

## Step 5 — Setup frames, before any motion

Three stills, each generated from the canon frame plus the kitchen master.

**4A wide.** Mara at the counter, screen-left, facing right. Camera south of the counter — the action line runs along the counter, and every setup stays south of it.

**4B close.** Mara's hands and the letter. Approved first time.

**4C reverse.** Tobias in the doorway, screen-right, looking screen-left toward Mara.

4C failed twice. The first attempt put the camera on the wrong side of the line, so both characters looked screen-left and the geometry collapsed. The second attempt invented a different doorway. Fixed by supplying `kitchen_master.png` as a second reference and stating the camera side explicitly:

> Camera remains south of the counter. Tobias stands in the hall doorway, screen-right, body angled toward camera-left, gaze 20 degrees camera-left and slightly down toward Mara's position off-screen.

Approved on the third attempt. **Three cheap stills, no video generated yet.**

## Step 6 — Animate the approved frames

Each setup frame animated as a separate 6-second clip, one action each:

- 4A — she stops, sees the letter, reaches
- 4B — hands unfold the paper
- 4C — Tobias shifts his weight, does not speak

Note what is *not* being asked for: no simultaneous complex subject action and camera movement, no dialogue, nothing longer than about eight seconds. Each clip does one thing.

## Step 7 — Continuity check

Logged per shot: story day 2, dusk, Mara dry and composed, letter folded in 4A and open in 4B (state change recorded at 4B), cardigan buttoned to the third button throughout, brow scar visible in 4A and 4C, not visible in 4B.

That last line matters. If the scar were *invisible* in a shot where it should show, that is a defect. Recording where it legitimately does not appear stops a later reviewer from "fixing" a shot that was correct.

## Step 8 — Audit

```bash
./scripts/contact-sheet.sh refs/mara_canon.png shots/ audit_s04.jpg
```

Sheet showed 4C's Mara — visible in the background of the reverse — reading about five years younger than canon, with the brow scar missing.

**Decision: regenerate, not repair.** The scar was absent rather than degraded, and age had shifted structurally. Restoration would have produced a cleaner wrong face. Regenerated 4C from the approved setup frame with the identity block re-pasted verbatim; the second pass held.

---

## What this example is actually demonstrating

1. **Casting cost one session and saved the production.** The distinctive face made the 4C drift *visible* — an averaged face would have drifted just as much and nobody would have caught it
2. **Three of the six failures happened at the still stage**, where a retry is cheap
3. **The only video regeneration was caught by the audit**, not by watching the shots — drift was invisible in playback and obvious in the contact sheet
4. **The reverse angle was the hardest shot**, exactly as predicted, and both failures were geometric rather than facial

If you take one thing: **the still stage is where the film is actually made.** Everything after it is execution.
