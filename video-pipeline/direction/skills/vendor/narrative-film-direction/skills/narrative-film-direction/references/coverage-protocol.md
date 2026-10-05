# Coverage Protocol

## What coverage means in AI filmmaking

In live-action, coverage is the set of shots from which an editor can assemble a scene. You shoot the master — the wide that shows everything — then close in progressively, giving the editor choices at every beat.

In AI filmmaking the challenge is that each clip is generated independently with no knowledge of the others. "Coverage" in this context means a *planned* set of clips that are geometrically consistent with each other — same action line, same geography, same screen positions — even though each was generated separately.

The master shot is what enforces that consistency. Every other clip is generated from it.

---

## The master shot first

**Always generate the master before any closer angle.** No exceptions.

The master shot shows all characters, their positions relative to each other and to the location, and establishes the action line. Once it is approved, it becomes the spatial law the rest of the scene must follow.

From the approved master:
1. Extract a representative frame — a moment that shows geography clearly
2. Use that frame as a reference image for every subsequent setup
3. Keep all closer angles on the same side of the action line as the master

The master is the source of truth. If a closer angle contradicts it, reject the closer angle, not the master.

---

## The 5-setup dialogue scene

A two-character conversation, fully covered, needs five setups minimum:

| Setup | Description | Frames |
|---|---|---|
| Master | Wide — both characters, full location | Establishes geography and action line |
| OTS medium A | Over the shoulder of B, looking at A | A's dialogue and reaction |
| OTS close A | Tighter on A, B partially visible | A's key moments, close emotion |
| OTS medium B | Over the shoulder of A, looking at B | B's dialogue and reaction |
| OTS close B | Tighter on B, A partially visible | B's key moments, close emotion |

The editor uses the master to establish, the mediums to carry dialogue, and the closes for emotional beats. J-cuts and L-cuts (audio carrying from one shot while the image changes) are added in the NLE after generation — they are not generated.

For scenes with more than two characters, or with significant blocking, add:
- A second master from a different angle (useful when geography must be revealed)
- Additional inserts for props, hands, reactions

---

## Generating setup frames

Each setup is generated in two stages: **still first, then animated**.

### Stage 1: Generate a setup still

Use the master keyframe as a reference image. Describe the camera's new position relative to the master.

```
[Master keyframe as reference image]

SUBJECT: [same characters, same geography as master — do not move them]
SHOT: [the new shot type — OTS medium on A, etc.]
CAMERA: Camera moves to [camera-right / camera-left / behind character B / etc.],
         remaining on the [north / south / etc.] side of the action line.
         Static, no movement. Single still frame.
CONTINUITY: Must match master — same wardrobe, same lighting source, same location.
             Characters in same positions as master, viewed from new angle.
```

Approve or reject the still before animating. The still stage is where you catch spatial errors cheaply.

**Do not animate a setup frame you have not approved as a still.**

### Stage 2: Animate the approved still

Pass the approved setup still as `firstFrameImage`. Add only the action for this clip.

```
[Approved setup still as firstFrameImage]

[Identity block if tool supports reference images separately from first frame]

CAMERA: Static / [specific movement if intended]
ACTION: [single specific action — A turns to face the door, or B picks up the glass, not both]
DURATION: 5–7 seconds [PRACTITIONER]
CONTINUITY: Hold the setup established in the first frame throughout.
```

---

## Clip length

**5–8 seconds is the practical working range.** [PRACTITIONER — reported across multiple practitioner sources; verify model-specific maximums before planning]

Why this range [PRACTITIONER]:
- Under ~3 seconds: a camera move does not register; the clip feels like a flash
- 5–8 seconds: enough for one action and one reaction, or two lines of dialogue
- Past ~10 seconds: models introduce unwanted secondary motion; identity decay begins in longer clips

Plan the edit to stitch short clips rather than generating long takes. A long take that holds identity perfectly for 12 seconds does not yet exist reliably.

---

## The one-action-per-clip rule

Each clip should contain exactly one specific action. Not "she walks over and picks up the letter." Two clips: she walks over. She picks up the letter.

Why: models handle one clear action reliably. Two actions introduces transitions between them that the model frequently gets wrong — wrong timing, wrong expression in the middle moment, wrong camera framing at the join.

The edit is free. Split the action.

---

## Scene geography checklist

Before generating the master:

- [ ] Where is each character standing?
- [ ] What is the action line? (The imaginary line between the two characters, or along the direction of movement)
- [ ] Which side of the action line will the camera stay on?
- [ ] What does each character see off-screen in each direction?
- [ ] What lies behind each character that will appear in the opposite OTS shots?
- [ ] What is the lighting source and how does it affect each character from their current position?

The last two are the ones people skip and regret. An OTS on B shows the space behind A — that space must be defined before the shot is generated, or it will contradict the master.

Write an overhead blocking diagram. Text description is fine:

```
SCENE 4 — Kitchen

     [window, camera-left of A]
A ----+---- B
      counter
      |
 ====[ ]====   ← camera, south side
   action line runs along the counter
   all setups stay south
```
