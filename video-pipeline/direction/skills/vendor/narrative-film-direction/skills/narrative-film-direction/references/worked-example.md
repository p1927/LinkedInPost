# Worked Example

One scene, end to end. Dialogue between two characters in a kitchen at dusk.

The point is the *sequence of decisions* and the *order of operations* — not any single prompt. Every mistake below was made in the process that produced this example, and each is noted where it happened.

---

## The brief

MARA finds a letter. TOBIAS watches from the doorway. She reads it. He waits. She sets it down. Their eyes meet.

Two characters. No dialogue. Five beats.

---

## Step 1: Scene geography

Before generating anything:

```
SCENE 4 — Kitchen, Apartment, Story Day 2, Evening

Location: compact open-plan kitchen, south-facing window on the east wall.
Practical light: pendant lamp over the counter, warm 2700K.
Natural light: blue-hour sky visible through the east window, fading.

MARA: Standing at the counter, screen-left. Facing screen-right (toward the window).
TOBIAS: In the doorway, screen-right, facing screen-left (toward Mara).
Action line: runs east-west along the counter between them.

Camera working side: SOUTH of the counter for all setups except the Tobias insert.
Tobias insert (doorway POV): camera stays south of the threshold — technically crossing
  but bracketed by the neutral shot (see below).

Off-screen (south of Mara): hallway, off-screen
Off-screen (east, behind Mara): the window — blue-hour sky
Off-screen (west, behind Tobias): the apartment living area, dark
```

Notes: defined "what lies behind each character" before generating. This prevented the reverse-angle trap on the Tobias OTS — the space behind Mara (the window, the kitchen) was already designed.

---

## Step 2: Shot list

| # | Setup | Shot | Camera | Duration | Action | Transition |
|---|---|---|---|---|---|---|
| 1 | Master | Wide | Static, south of counter | 7s | Mara finds letter; Tobias watches from doorway | Cut to — |
| 2 | OTS medium on Mara | MCU | Static, slight high angle, over Tobias's shoulder | 5s | Mara reads, expression tightens | Cut on action — |
| 3 | Insert | ECU | Static, looking down at letter | 3s | Hands set letter down | Cut to — |
| 4 | OTS medium on Tobias | MCU | Static, south of counter, over Mara's shoulder | 5s | Tobias waits, watching | Cut on — |
| 5 | Two-shot close | Medium | Slow dolly back, reveals both | 6s | Eyes meet | Fade |

---

## Step 3: Master shot

**Prompt:**

```
SUBJECT: MARA — 38-42, dark curly hair, olive-green field jacket over black crew-neck —
  stands at a kitchen counter, screen-left. She has just picked up an envelope.
  TOBIAS — 45, fair, close-cropped hair, grey shirt sleeves rolled — stands in the doorway,
  screen-right, still, watching her.

SHOT: Wide establishing — both characters visible, full kitchen geography.
CAMERA: Static, south of the counter, slight high angle (camera at chest height).
LIGHTING: Warm pendant lamp over the counter, motivated top-down, 2700K.
  Blue-hour sky through the east window behind Mara, providing cool backlight on her left.
  The doorway behind Tobias: dark, no spill.
STYLE: Photorealistic, film grain, shallow depth of field (counter in focus), 2.39:1.
CONTINUITY: This is the master. All subsequent setups will derive from it.
```

**What happened:** First attempt placed Tobias screen-left and Mara screen-right — opposite of the brief. Rejected. Second attempt was approved. This is normal.

**Key frame extracted:** frame at 2.5 seconds — Mara has lifted the letter, Tobias is still, both positions clear.

---

## Step 4: Setup frames (stills)

### Setup 2 — OTS medium on Mara

**Prompt:**

```
[Master keyframe as reference image]

SHOT: Over-the-shoulder medium close-up on Mara.
CAMERA: Camera repositions to north side of Tobias — he is partially visible screen-right,
  back to camera. Mara fills frame screen-left, facing screen-right.
  Camera south of counter, angled north-northeast.
MARA POSITION: Screen-left, facing screen-right (toward the window/east).
TOBIAS POSITION: Screen-right, back to camera, right shoulder in frame.
MARA EYELINE: Looking down at the letter — 30 degrees downward, slightly camera-right.
LIGHTING: Same pendant source. Mara's face lit from above-left. Blue window spill from her left.
SINGLE STILL FRAME. Do not animate.
CONTINUITY: Match master — same wardrobe, same kitchen, same time of day.
```

**Approved first attempt.** No spatial error because the master keyframe held the positions.

### Setup 3 — Insert (letter)

```
[Master keyframe as reference]

SHOT: Extreme close-up. Mara's hands on the counter, holding the letter.
  The letter is partially visible — handwritten text, not legible.
  She is in the act of setting it down.
CAMERA: Looking straight down at the counter surface, slight angle.
LIGHTING: Pendant lamp direct from above. Warm on the paper.
SINGLE STILL FRAME.
```

Note: the insert technically "crosses the line" by isolating a detail without a clear side. Inserts are permitted to do this — they reset spatial logic.

### Setup 4 — OTS medium on Tobias

```
[Master keyframe as reference]

SHOT: Over-the-shoulder medium close-up on Tobias.
CAMERA: Camera remains south of counter. Mara partially visible screen-left, back to camera.
  Tobias fills frame screen-right, facing screen-left.
  Camera angled north-northwest toward the doorway.
TOBIAS POSITION: Screen-right, facing screen-left.
MARA POSITION: Screen-left, back to camera, left shoulder in frame.
TOBIAS EYELINE: 12 degrees camera-left, level — watching Mara.
LIGHTING: Tobias lit by spill from the pendant, soft. His back is to the dark living area.
SINGLE STILL FRAME.
```

**Failed first attempt** — model placed Tobias screen-left. Rejected. Second attempt correct.

### Setup 5 — Two-shot close

```
[Master keyframe as reference]

SHOT: Medium shot — both characters visible, tighter than master.
CAMERA: Static, same south-of-counter working side. Slightly closer.
  Mara screen-left, Tobias screen-right — same as master, tighter crop.
  This is the beginning of a slow dolly back — capture the starting frame.
EYELINES: Both characters facing each other. Eyes level.
SINGLE STILL FRAME.
```

---

## Step 5: Animation

Each approved still animated separately.

**Setup 2 (OTS Mara):**

```
[Approved still as firstFrameImage]
CAMERA: Static, locked tripod.
ACTION: Mara reads the letter. Expression tightens, breath shortens.
  She does not look up. Eyes moving left to right across the page.
DURATION: 5 seconds.
```

**Setup 3 (Insert):**

```
[Approved still as firstFrameImage]
CAMERA: Static.
ACTION: Her hands set the letter face-down on the counter. Slow, deliberate.
DURATION: 3 seconds.
```

**Setup 4 (OTS Tobias):**

```
[Approved still as firstFrameImage]
CAMERA: Static.
ACTION: Tobias waits. He shifts his weight slightly — one barely perceptible breath.
  Does not speak.
DURATION: 5 seconds.
```

**Setup 5 (Two-shot):**

```
[Approved still as firstFrameImage]
CAMERA: Very slow dolly back, barely perceptible — widening the frame over 6 seconds.
ACTION: Their eyes meet. Hold. No expression change — just the meeting of the gaze.
DURATION: 6 seconds.
```

---

## Step 6: Assembly

Editing order: 1 → 2 → 3 → 4 → 5.

**Colour issue discovered:** Setup 4 (Tobias OTS) had significantly cooler colour temperature than the other clips — the model had picked up on "dark living area" and desaturated the whole frame. Fixed with DaVinci Shot Match against Setup 2.

**Trim applied:** 4 frames from head and tail of each clip before joining.

**Cut-hide used:** The cut from Setup 2 (Mara reading) to Setup 3 (insert) placed at the moment her hands move toward the letter — the hand movement hides the edit.

**L-cut used:** Room tone from Setup 4 (Tobias, near-silence) carried into the start of Setup 5, so the visual cut arrives in silence before any audio shift.

---

## What this scene demonstrates

1. **Geography first:** The overhead blocking diagram was written before a single prompt. Both cross-line failures happened where the diagram was ignored.

2. **Master is law:** Every approved setup still matched its master reference. Every rejected still had deviated from it.

3. **Stills before animation:** The two spatial errors — Tobias wrong side twice — were caught as stills, not as animated clips. Cost: two regenerations. Not caught: would have cost the animation plus all continuity-matched clips.

4. **Colour drift is real:** Each clip generated with a slightly different interpretation of "dusk kitchen." Colour matching was not optional.

5. **The insert resets:** The letter insert let the scene breathe without requiring perfect spatial logic. Insert shots are tools for both pacing and spatial relief.
