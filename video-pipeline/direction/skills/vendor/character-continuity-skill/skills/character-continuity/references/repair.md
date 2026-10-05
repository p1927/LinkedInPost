# Repair or Regenerate

## The decision rule

**Repair** when identity is still coherent and the defect is local — blur, compression artifacts, mild warping.

**Regenerate** when identity has collapsed or a different person's features have appeared.

A restoration model reconstructs a *plausible* face from degraded evidence. It cannot recover identity that is genuinely absent or replaced. Run restoration on a wrong face and you get a cleaner wrong face, which is worse, because it now looks deliberate.

---

## Decision tree

| Symptom | Action |
|---|---|
| Recognisable; blur, compression or low resolution only | Masked restoration at conservative fidelity, then light upscale |
| Only a few frames fail | Isolate and repair that window, blend with neighbours, leave the rest untouched |
| Each frame plausible alone, but flickers across frames | **Temporal problem.** Track by face ID, hold settings constant frame to frame, smooth transitions. Do not re-run single-frame restoration — it will make it worse |
| Different person, structural geometry shift, unrecognisable | **Regenerate** from the locked reference |

The third row is the one people get wrong. Per-frame quality and temporal stability are different problems with different fixes. A clip can be sharp in every single frame and unusable in motion.

---

## Repair pipeline order

1. Preserve the original; extract frames
2. Detect faces and landmarks, then **track by face ID across frames**. Frame-independent processing is the direct cause of flicker
3. Stabilise and crop the face region
4. Face swap or identity-conditioned generation, if needed
5. Restore **only the face region**, with a feathered mask. Never reprocess the whole frame
6. Upscale face and background **separately**, and **upscale last**
7. Temporally stabilise across neighbouring frames
8. Composite and re-encode at the original frame rate and colour management

Two ordering rules carry most of the value: **restore at native resolution before upscaling**, and **mask to the face** rather than treating the frame.

---

## Restoration settings

### CodeFormer — the identity-first default

Fidelity weight `w` lies in [0, 1]. Smaller `w` produces higher *quality* (more invented detail); larger `w` produces higher *fidelity* (more faithful to the input). The project's own examples use `-w 0.5` for cropped and aligned faces and `-w 0.7` for whole-image enhancement.

For narrative film, where identity matters more than prettiness, bias upward:

| Band | Use |
|---|---|
| **0.8 – 0.95** | Identity-critical material. Faithful, little invented detail |
| **0.6 – 0.8** | Balanced. Reasonable starting point for most shots |
| **0.4 – 0.6** | Only where original detail is genuinely unusable |

[PRACTITIONER — the project documents what the parameter means and uses 0.5 and 0.7 in its own examples. These narrative-work bands are my recommendation, not documentation.]

Note the trade at the top of the range: as `w` approaches 1.0, output hews so closely to the input that restoration does progressively less. If you find yourself at 0.95 and unhappy, the answer is usually regeneration, not a higher weight.

Supports whole-video processing, with optional background and face upsampling.

### GFPGAN

Faster and more forgiving on severe blur, blockiness or structural damage. Its README describes v1.3 as producing more natural results than v1.2, though sometimes less sharp, and notes that v1.3 can take a repeated (twice) restoration pass.

My own caution, which goes beyond what the project claims: **treat repeated passes as a last resort for narrative work.** Each pass is another opportunity for identity to migrate, and the drift compounds silently across a sequence. Prefer one conservative pass, and regenerate if it is not enough.

---

## Prompt patterns

The face-swap prompt, the targeted temporal-repair prompt and the repair negative list all live in `prompt-blocks.md`, so there is one copy to keep current rather than two that drift apart.

---

## QC before delivery

- Inspect every shot at 100% for identity, mouth and eye geometry
- Inspect at playback speed for flicker and temporal seams
- Compare restored frames against the originals, to catch invented features — restoration adds detail that was never there, and some of it is wrong
- Check side turns, occlusions, glasses, smiles and motion blur separately. Each is its own failure surface
- **Reject any version that is sharper but less recognisably the same person.** This is the single most useful rule in the document, because the sharper version always looks better in isolation and always looks wrong in the cut
- Keep a lossless intermediate so a bad pass can be replaced without re-running the whole chain

---

## Why people repair when they should regenerate

Repair is cheap and bounded. Regeneration reopens every continuity question the shot had already settled — lighting, wardrobe, prop state, screen direction. That asymmetry biases everyone toward repair.

Budget for it explicitly. By the time a subtly-wrong face becomes obvious, later shots have been matched to it, and the regeneration you avoided has become several.
