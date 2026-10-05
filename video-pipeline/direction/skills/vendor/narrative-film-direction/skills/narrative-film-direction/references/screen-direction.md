# Screen Direction, Eyelines, and the 180° Rule

## The core problem

AI generators have no persistent world model. Each clip is generated independently. If you put character A on the left in one clip and don't enforce screen direction in the next, the model may place A on the right. When the clips cut together, A appears to teleport. The audience loses all sense of geography.

Screen direction discipline is what prevents this. It must be enforced actively in every prompt — it will not happen automatically.

---

## The 180° rule

The action line is an imaginary line running between two characters (in a conversation) or along the direction of movement (in a chase, a walk, a car journey). The camera must stay on one side of this line throughout a scene.

**Cross the line and characters appear to swap positions.** If A was on the left and B on the right, crossing the line puts A on the right and B on the left — in the next cut, they appear to have moved without moving.

### How to state the line in a prompt

Name a visible anchor — something in the location — and declare which side the camera is on.

```
The action line runs along the kitchen counter, east to west.
All camera positions in this scene stay SOUTH of the counter.
Characters maintain their east/west positions relative to each other.
```

Or use compass directions relative to the blocking diagram.

Or use screen positions:
```
A remains screen-left throughout this scene.
B remains screen-right throughout this scene.
Camera stays on the south side of the line between them.
```

**Naming a side explicitly is more reliable than describing the desired result.** "A should be on the left" is weaker than "camera working side: south of the counter."

### Crossing the line — when it's intentional

Directors cross the line deliberately at certain moments — a point-of-view shift, a character crossing the line in the frame (they take the camera's permission with them), or a clear pause that reorients the audience (a neutral shot where neither character is on either side).

If crossing the line is intentional, state it: "Camera crosses the line here. Following shot will have A screen-right, B screen-left. New working side: north of the counter."

---

## Eyelines

An eyeline is the direction a character is looking, expressed from the camera's point of view. In a shot-reverse-shot between A and B:
- A must look off-camera in the direction where B would be
- B must look off-camera in the direction where A would be

If both look camera-right, they appear to be looking at the same off-screen object rather than at each other.

### The problem with vague eyeline descriptions

"Looking at the other character" produces inconsistent results. Models default to the statistically likeliest framing — often slightly toward the camera, or ambiguously off-axis.

### The solution: degree notation

Specify eyelines as degrees off the camera axis:

```
A's eyeline: 12 degrees camera-left, level — looking toward where B stands
B's eyeline: 15 degrees camera-right, slightly downward — looking up at A
```

This is more work but produces consistent shot-reverse-shot pairs.

**Practical bands:**
- 0° = staring directly at camera (avoid unless intentional — fourth-wall break)
- 5–15° = subtle off-camera look — natural in tight close-ups
- 15–30° = clear off-camera look — readable in medium shots
- 30°+ = dramatically looking away — useful for OTS shots where the other character is implied at a distance

### The reverse angle trap

A reverse angle — the shot over B's shoulder looking at A, after a shot over A's shoulder looking at B — exposes the set space *behind* A. This space was not visible in the master or the OTS on B. If it is not defined before generation, the model invents it — and it frequently contradicts the master.

**Generate or define the background of every reverse angle before attempting the shot.**

---

## The 30° rule

Cutting between two shots of the same subject, from angles less than 30° apart, produces a disturbing "jump" — the subject appears to pop or shift slightly without a clean motivation. The cut feels like an error rather than a choice.

**The 30° rule: the angle between adjacent setups of the same subject must be at least 30°.** [Classical film grammar, widely documented in cinematography literature; applied here to AI clip sequencing — the same visual artifact occurs regardless of how the footage was generated] If you want to go closer without a 30° angle change, use an insert (a detail shot that resets spatial logic) or cut to the reverse first.

In AI generation: ensure each new setup prompt describes a camera position that is clearly distinct from the previous. Derive every setup from the master keyframe, then specify a camera angle that is meaningfully different.

---

## Screen direction in motion

When a character moves through the frame, they establish a screen direction. If they walk from screen-left to screen-right in one clip, they must enter from screen-left in the next clip if the cut is continuous. If they enter from screen-right, the audience reads it as them now moving in the opposite direction — and assumes they turned around off-screen.

For AI generation: state the movement direction explicitly in every clip that contains character movement.

```
A walks from screen-left toward screen-right, exiting frame right.
[cut]
A enters screen-left, continuing in the same direction toward her destination.
```

---

## Prompt pattern for shot-reverse-shot

```
SETUP: OTS medium on A (looking at B)
CAMERA: Camera south of the counter, angled north-northeast. B partially visible screen-right, back to camera.
A POSITION: Screen-left, facing screen-right.
B POSITION: Screen-right, back to camera.
A EYELINE: 18 degrees camera-right, level — looking at B's face.
WORKING SIDE: south of the counter — do not cross the line.

[cut]

SETUP: OTS medium on B (looking at A)
CAMERA: Camera south of the counter, angled north-northwest. A partially visible screen-left, back to camera.
B POSITION: Screen-right, facing screen-left.
A POSITION: Screen-left, back to camera.
B EYELINE: 15 degrees camera-left, slightly downward — looking at A's face.
WORKING SIDE: south of the counter — same side as previous shot.
```

The working side appears twice in each prompt. That redundancy is intentional. If it's only stated once, a model with a long context can drop it.

---

## Structural mitigations

**Generate the master first.** The master establishes screen positions. Every setup derives from it — meaning the positions are inherited rather than re-specified, which reduces drift.

**Use an overhead blocking diagram.** Even a two-line text diagram forces you to commit to positions before generating and makes a screen direction error visible before you've spent a generation budget on it.

**Reject fast.** A shot with crossed screen direction should be rejected immediately rather than fixed in post. Color correction can hide a lot. Screen direction errors cannot.
