# Prompt Blocks

Reusable text structures. The whole method rests on one habit: **the identity block never changes, the scene block always does.**

---

## The locked identity block

Write this once per character, from the approved canon frame. Paste it verbatim into every prompt for the rest of the production.

```
IDENTITY — [CHARACTER NAME]
Age: 38-42
Build: lean, 178cm, narrow shoulders
Face: long oval, high cheekbones, deep-set hazel eyes,
      heavy dark brows, thin straight nose slightly broken
      at the bridge, thin lips, defined jaw with light stubble
Hair: dark brown, short, side-parted, greying at the temples
Marks: 3cm pale scar through the left eyebrow
Skin: olive, weathered, visible pores, faint under-eye shadow

WARDROBE (locked, scene 4): charcoal wool overcoat worn open
      over a grey crew-neck; dark denim; scuffed brown leather boots

LOCKED: face structure, eye colour, scar, hair, wardrobe
FREE:   expression, pose, head angle
```

Notes on why each part earns its place:

- **Age as a range, not an adjective.** Unanchored age regresses younger and smoother
- **Face described structurally**, in bone and proportion, not in impressions. "Handsome" is not a specification
- **Marks with position and size.** "A scar" gets reinvented; "3cm through the left eyebrow" does not
- **Skin texture stated.** Omitting it invites the plastic-skin default
- **Wardrobe scoped to the scene**, so a costume change is an explicit edit rather than a drift
- **LOCKED / FREE lines.** Declaring where the model may improvise is a technique, not decoration

---

## Generating the turnaround set

Every turnaround is generated *from* the approved canon frame, supplied as the reference image. You are asking for a camera move around a fixed subject, not for a new person in a new pose. Phrase it that way.

One angle per generation. Run each separately.

```
[canon frame as reference image]

Same person, same face, same hair, same wardrobe, same lighting.
Rotate the camera to a [3/4 left | 3/4 right | left profile |
right profile | rear] view of the same subject.
Neutral expression, mouth closed, head level, shoulders square.
Identical even lighting, identical plain background.
Do not change facial structure, age, hairstyle, skin tone or clothing.
Reference framing: head and shoulders, same distance, same crop.
```

Negative:
```
different person, different face, changed hairstyle, changed clothing,
new expression, tilted head, different lighting, different background,
stylised, beautified
```

Two things do the work here. **"Same person, same face"** stated before anything else, and **"rotate the camera"** rather than "turn her head" — the second phrasing invites a new pose and often a new face along with it.

Verify each angle against the canon frame before accepting. A wrong 3/4 view poisons every shot generated from it.

### Detail plates

Same principle, moving in rather than around:

```
[canon frame as reference image]

Same person. Extreme close-up of [the scar through the left eyebrow |
the left wrist | the hairline at the left temple].
Same skin tone, same texture, same lighting.
Sharp focus on the detail. Do not alter, stylise or remove the mark.
```

If the mark is not present in the canon frame, it does not exist yet. Add it to the canon frame first and re-approve, or it will appear and disappear at random for the rest of the production.

### Setup frames

The setup frame is the still that a shot gets animated from. It is generated from the canon frame plus the environment reference, and it is where you resolve framing, blocking, screen direction and light — as a still, cheaply, before any motion exists.

```
[canon frame as reference image]
[environment master as second reference, if the tool accepts two]

[IDENTITY BLOCK — pasted verbatim]

[SCENE BLOCK — pasted, with this shot's values]

Single still frame. No motion.
```

Approve or reject the setup frame before animating. Rejecting a still costs one generation. Rejecting an animated shot costs the generation, the review time, and often the shots you already matched to it.

---

## The scene block

This is the part that changes. Keep it structurally identical shot to shot so only the values vary.

```
SCENE — [LOCATION], [STORY DAY], [TIME]
Light:   single motivated source, window camera-left, hard,
         4300K, deep shadow on the fill side
Palette: desaturated slate blue, warm skin, one red accent
Lens:    35mm, shallow, focus on eyes
Frame:   medium, subject screen-right, looking off camera-left
Action:  he sets the cup down and turns toward the door
Camera:  static, locked tripod
```

Holding the field order fixed across every shot in a sequence is itself a consistency mechanism — it stops you accidentally dropping a specification, and dropped specifications are where defaults creep in.

---

## Assembly order

Identity block → scene block → action → negative list.

Keep this order constant across a production. Reordering changes emphasis in ways that are hard to attribute later.

---

## Negative lists

### General generation

```
different person, altered face shape, age change, changed eye colour,
changed nose or jaw, generic face, beauty filter, plastic skin,
waxy skin, extra fingers, deformed hands, morphing, warping
```

### Repair and upscale passes

```
different person, altered jawline, changed eye shape, changed nose,
asymmetrical eyes, waxy skin, plastic skin, beauty retouching,
excessive sharpening, double mouth, extra teeth, deformed hands,
flicker, frame-to-frame morphing, halo, seam, texture swimming
```

### Camera, when you want a locked frame

```
camera shake, handheld, drifting camera, zoom, wobble, push-in
```

The unrequested slow push-in is the most common default motion in current generators. If you want a static frame, you generally have to say so in both the positive and the negative.

---

## Face swap prompt

```
Replace the person at [screen position] with the source identity.
Preserve the target pose, lighting, camera perspective, wardrobe,
mouth timing and expression rhythm. Keep the same person frame to frame.
Change facial identity only. Do not adopt the source hairstyle,
clothing or background.
```

---

## Targeted temporal repair prompt

```
Repair frames [range] only. Preserve source identity and all facial
proportions. Match preceding and following frames in pose, lighting,
skin tone, expression and sharpness. Do not beautify, age, reshape,
change hairstyle or invent new facial features. Maintain stable
identity across neighbouring frames.
```

---

## Multi-beat global block

For tools with a storyboard or multi-beat mode (Sora 2 Storyboard and equivalents), split the prompt in two:

**Global block** — repeated verbatim into every beat: identity, wardrobe, visual style, grade, technical requirements.

**Per-beat block** — the only part that varies: location, action, composition, lens.

This makes a weak beat regenerable in isolation without disturbing the rest of the sequence.
