# Shot Grammar — The 8-Point Framework

Every AI video prompt benefits from deliberate choices across these eight elements. Each element gives the model specific direction. Omitting one invites a default, and defaults in AI video are usually wrong — a slow push-in, a neutral expression, a clock-position light, a vague location.

Write each prompt top-to-bottom through the eight elements. The order matters: subject first anchors the frame, style last influences the render.

---

## 1. Subject

Who or what is in frame, and what are they doing.

Be specific. The model generates the most likely person matching a vague description; that person will not match your character.

- ❌ "A woman looking at the door"
- ✅ "MARA — 38-42, dark curly hair, olive-green field jacket — turns her head slowly toward the door, jaw tightening"

Name the character. Name the action with a verb and a result. Adjectives alone don't generate motion.

---

## 2. Emotion

The internal state that should drive the performance. This shapes micro-expressions, body language and the rhythm of movement even when the camera is too wide to see the face clearly.

State it explicitly rather than expecting the model to infer it from the situation:

- "Controlled fear — she's not letting it show"
- "Surprised, then immediately masking it"
- "Exhausted but resolved"

One emotion + one qualification is usually enough. More than two creates conflict.

---

## 3. Optics (Shot Type)

| Shot Type | Frame | When to Use |
|---|---|---|
| Extreme wide | Full environment, character very small | Location establishment, scale, isolation |
| Wide / full | Head to toe in context | Action in space, entrances and exits |
| Medium | Waist up | Dialogue, gesture, reaction |
| Medium close-up | Chest up | Conversation, moderate intimacy |
| Close-up | Face fills frame | Emotion, key dialogue beats |
| Extreme close-up | Eyes, hands, a prop | Intensity, revelation, texture |
| Over-the-shoulder | Looking past one character at another | Dialogue, confrontation |
| Insert | A prop, a detail | Story information |
| POV | Exactly what the character sees | Identification, dread, desire |

Choose one. If you want two shot sizes in one clip — a wide that pushes to a close — that is a camera movement choice, not a shot type.

---

## 4. Motion (Camera Movement)

| Movement | Effect | Use When |
|---|---|---|
| Static / locked | Stability, authority, weight | Dialogue, confrontation, revelation |
| Slow pan (L/R) | Revelation, searching | Environments, characters entering a space |
| Tilt (up/down) | Scale, grandeur, threat | Buildings, creatures, the sky |
| Dolly in | Increasing tension or intimacy | The moment before a key beat |
| Dolly out | Context, loss, scale reveal | A character dwarfed by their situation |
| Tracking | Following energy | Characters in motion |
| Handheld | Urgency, instability, authenticity | Conflict, crisis, documentary feel |
| Arc/orbit | Spatial dimension, examines subject | Hero shot, emotional circling |

**The slow push-in default:** current generators default to a gentle handheld push-in even when unprompted. It scores well in training feedback. To override it: state the camera movement explicitly ("locked tripod, static"), include it in your negative prompt ("no camera drift, no zoom, no push, no handheld"), and use UI controls where available (Static Camera checkbox in Runway, reset all displacement sliders in Kling Professional Mode). [PRACTITIONER: converged from multiple sources; verify UI controls in current model version]

---

## 5. Lighting

| Style | Mood | Use When |
|---|---|---|
| Golden hour | Warm, aspirational, hopeful | Arrival, reunion, beauty |
| Blue hour | Cool, melancholy, mystery | Departure, longing, dusk atmosphere |
| Hard side-key | Drama, tension, moral ambiguity | Confrontation, revelation, noir |
| Soft diffused | Clean, neutral, honest | Dialogue where face is the subject |
| Practical-motivated | Authentic, lived-in | Kitchen scenes, street scenes, offices |
| Backlit | Silhouette, anonymity, drama | Reveals, thresholds, power figures |
| Neon/coloured | Energy, nightlife, unease | Urban night, bars, underground |

State: **source** (where the light is coming from), **direction** (camera-left/right, above/below, front/back), **hardness** (hard / soft / diffused), and **colour temperature** (warm/cool, or degrees Kelvin if the model responds to it). The combination is more precise than a named style alone.

---

## 6. Style

The overall visual treatment. Sets expectations for colour grading, texture, aspect ratio and the "film" it should look like.

Examples:
- "Photorealistic, Alexa-quality, anamorphic lens, 2.39:1, shallow depth of field, slight film grain"
- "Desaturated teal-and-amber grade, high contrast, contemporary thriller aesthetic"
- "Warm, textured, Super 16 grain, slightly overexposed highlights — late 70s European cinema"
- "Clean, neutral, Apple-brand-film level finish — no stylisation"

Avoid generic modifiers like "cinematic" alone. "Cinematic" means nothing specific to a generator. Describe the specific look.

---

## 7. Audio (Mood Direction)

Veo 3.1 generates native synchronised audio. Other generators may ignore audio prompts or generate ambient sound only. In either case, define the intended audio mood — it affects the *rhythm* of the generated performance even when the audio itself is replaced in post.

| Mood | Direction | Tempo |
|---|---|---|
| Tension | Minimal — low hum, silence, distant sounds | 60–80 BPM equivalent |
| Drama | Strings, building, motivated by action | Variable, following the scene |
| Intimacy | Acoustic, room tone, breath | Slow, 50–70 BPM |
| Action | Driving beat, rhythm-forward | 120–140 BPM |
| Unease | Atonal, slightly off, ambient | Irregular |

---

## 8. Continuity

How this clip connects to the ones before and after it. Every prompt should state what must match — and what may change — relative to adjacent clips.

```
CONTINUITY
Previous clip: [brief description of previous shot]
Must match: character screen position, lighting source and direction, wardrobe state, location
May change: expression, head angle, camera angle (within 30° of previous or >30° with a cut, not between)
Transition: [cut / match-on-action / dissolve]
```

This is the field most often left blank and most often the reason adjacent clips don't cut together.

---

## Prompt template

```
SUBJECT: [character/object, specific action, specific result]
EMOTION: [internal state + qualification]
SHOT: [type from table above]
CAMERA: [movement or STATIC]
LIGHTING: [source · direction · hardness · colour]
STYLE: [specific visual treatment]
AUDIO: [mood and direction]
CONTINUITY: [what matches / what changes / transition]
```

Use the same field order every time. Consistent structure means a dropped field is visible before you generate.
