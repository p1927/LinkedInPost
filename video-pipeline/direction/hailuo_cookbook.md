# Hailuo (MiniMax) Image-to-Video Prompt Cookbook

Evidence: [E secondary] = secondary guide summaries (akool, segmind, runcomfy); [R] = widely reported craft rules.

---

## Prompt Formula (Image-to-Video)

For I2V the first frame fixes subject appearance. Describe **motion only**—do not re-describe static elements already locked in the image.

```
[Camera command(s)] Subject + Action. Scene/setting detail. Style/lighting cue.
```

- **Camera command:** one bracket at the clause where the move starts; max 2–3 commands per bracket for simultaneous moves; separate brackets for sequential moves. [E secondary]
- **Subject + Action:** one subject (two at most), one concrete action. No complex multi-character scenes.
- **Style/lighting cue:** keep it short—"warm amber light, painterly" is enough. The image already sets the style.

---

## Documented Camera Commands (15) [E secondary — akool/runcomfy guides; verify against current Hailuo release]

`[Truck left]` `[Truck right]` `[Pan left]` `[Pan right]` `[Push in]` `[Pull out]`
`[Pedestal up]` `[Pedestal down]` `[Tilt up]` `[Tilt down]` `[Zoom in]` `[Zoom out]`
`[Shake]` `[Tracking shot]` `[Static shot]`

Combination syntax: `[Push in, Tilt up]` runs both simultaneously. `[Push in] ... [Pull out]` runs in sequence.

---

## 8 Example Prompts (I2V, picture-book / illustration style)

1. `[Push in] The little fox slowly lifts its lantern. Warm amber glow flickers across its face. Soft paper-grain storybook look.`

2. `[Pull out] A single gold coin rolls across a wooden table and a vast marketplace is revealed stretching behind it. Gentle morning light.`

3. `[Pan right] Three paper boats drift down a narrow stream. Ripples catch the afternoon light. Calm watercolor mood.`

4. `[Tilt up] A tall stack of coins grows upward toward a dark sky. Stars begin to appear at the top of frame. Painterly, hopeful.`

5. `[Static shot] A snowball rolls slowly forward across a snowy hillside. Small puffs of snow rise as it moves. Minimal motion elsewhere.`

6. `[Truck left, Push in] Seen from behind, a small girl in a yellow raincoat walks toward a glowing door at the end of a corridor. Autumn leaves drift past.`

7. `[Pedestal up] A red hot-air balloon lifts above terracotta rooftops. Clouds part above. Warm afternoon light, hopeful tone.`

8. `[Shake] Heavy rain strikes a tin roof. A tabby cat flinches and looks upward, ears back. Quick tense moment. [Static shot] The cat settles and blinks slowly.`

---

## Failure Modes [R, widely reported; not formally measured]

| Issue | What happens | Mitigation |
|---|---|---|
| Readable text / numbers | Letters distort or shift mid-clip | Never ask Hailuo to show text. Render all text in Remotion. |
| Hands and fingers | Extra digits, melting, wrong bends | Keep hands out of frame, pocketed, or behind objects. |
| Crowds / multiple faces | Faces merge or dissolve | Use silhouettes, backs, or limit to 1–2 characters. |
| Fast complex physics | Motion looks physically wrong | Simplify: one object, one action. |
| Morphing props | Objects change shape mid-clip | One prop per clip; keep it static or moving simply. |
| Camera orbit | Unseen sides of character generated inconsistently | Avoid `orbit`; stick to documented commands. |

---

## Character Consistency Tricks [R]

- **Lock the keyframe:** generate a character-sheet illustration first; use it as the first frame for every clip featuring that character.
- **Repeat descriptor verbatim:** copy the exact character description string into every image and video prompt. Do not paraphrase.
- **Chain clips:** generate each clip from the last frame of the previous clip to maintain continuity.
- **Short clips:** 5–6 s clips hold consistency better than 10 s.
- **One style prefix:** prepend the same style phrase to every prompt (`soft gouache and colored pencil texture, thick friendly outlines`).
- **Avoid showing the same character from an unseen angle** — the model will invent details that break consistency.
