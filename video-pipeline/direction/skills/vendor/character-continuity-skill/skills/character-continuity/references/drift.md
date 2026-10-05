# Seven Causes of Drift

A working taxonomy — mine, not a standard one — for diagnosing why a character stopped looking like themselves. The value is in having a fixed checklist to run, so diagnosis is elimination rather than guesswork.

Underlying tension, documented in the research literature: the features that preserve identity also encode motion. Force identity too hard and movement goes unnatural; leave it unconstrained and identity dissolves. Longer sequences additionally suffer identity decay, where fine details — moles, tattoos, skin texture — fade or flicker over time.

---

## 1. Prompt rewording

**Mechanism.** Rephrasing the character re-samples age, hair and bone structure from scratch. "The same man" is not a reference; it is a fresh roll of the dice.

**Mitigation.** Paste the locked identity block **verbatim**. Vary only action, camera and setting. Never redescribe the character, even in words you think are equivalent.

---

## 2. Lighting shift

**Mechanism.** Changed direction, hardness or colour temperature alters shadow placement, skin tone and facial contour enough to read as a different person. This is the most underestimated cause — the face may be technically correct and still look wrong.

**Mitigation.** Lock light source, direction, hardness, colour temperature and palette in a scene block that travels with the identity block. Do not swap lighting style shot-to-shot without generating a fresh reference frame in that light first.

---

## 3. Angle extremes

**Mechanism.** A frontal reference underspecifies profile anatomy, ear shape, jaw line, and how hair and costume sit from behind. The model invents the missing information, differently each time.

**Mitigation.** Supply the controlled turnaround set. Do not generate ad-hoc "similar" references per shot — each one is a new invention that compounds.

---

## 4. Wardrobe drift

**Mechanism.** Loosely re-described clothing invites reinterpretation. "A dark coat" is a different coat every time.

**Mitigation.** Treat wardrobe as invariant text: garment type, colour, material, pattern, fasteners, footwear, accessories. Add a negative fence — "same wardrobe, no new jewellery, no colour change."

Negatives only constrain the edges. Image anchoring is what holds the centre, so do not rely on a negative list to carry wardrobe on its own.

---

## 5. Age ambiguity

**Mechanism.** Models regress toward an averaged age when age is unanchored. Characters drift younger and smoother across a production.

**Mitigation.** State an explicit age range in the identity block every single time. Not "middle-aged" — "38 to 42."

---

## 6. Feature averaging

**Mechanism.** Weak or generic prompts regress toward the model's mean face. This is why distinctive casting matters: a strongly specific face has further to fall before it becomes generic, and the drift is visible sooner.

**Mitigation.** Anchor with images, not text alone. Image conditioning is the single strongest lever against regression-to-mean.

---

## 7. Compound change

**Mechanism.** Changing character, camera and lighting simultaneously makes drift undiagnosable. You know the shot is wrong; you cannot know which input caused it.

**Mitigation.** **Change one variable at a time.** This is the master rule from which the others follow.

When a shot drifts, work the diagnosis in order:
1. Did the reference image itself change?
2. Did the prompt wording change?
3. Did the lighting or lens change?
4. Only then suspect the model

---

## Chain continuity

The workflow I have found most reliable against all seven. Steps 2 and 3 are separated deliberately: some tools will not accept identity references and a first frame in the same request, so constructing the frame and animating it become two passes rather than one.

1. Create and approve a canonical keyframe in neutral, even lighting
2. Build each subsequent **setup frame from that approved image**, repositioning the camera by instruction. Verify identity, wardrobe, screen direction and light **as a still**
3. Generate performance and motion only once the setup frame is locked. Two distinct stages: construct the frame, then perform it
4. Chain: the previous clip's **final frame** becomes the next clip's **starting reference**, where the tool supports frame conditioning
5. Hold seed fixed where exposed. Hold aspect ratio, duration and style constant
6. Keep clips **5–10 seconds** [PRACTITIONER]. Reported experience is that under about 3 seconds a camera move does not register, while past about 10 seconds models introduce unwanted secondary motion and identity decay accelerates. Test the boundaries on your own material rather than treating these as hard numbers

**Chaining is not auditing.** Each link inherits the previous link's error, so chaining forward ratchets drift. Chain for continuity between adjacent clips; audit against the canon frame, never against the previous shot.

---

## The drift audit

Slow drift is invisible shot-to-shot and obvious in aggregate.

Every 8–10 accepted shots, build a contact sheet of those shots beside the canon frame and compare directly. Always compare against the **canon frame**, never against the previous shot — the previous shot may itself have drifted, and comparing to it ratchets the error forward.

Catching drift at shot 10 costs ten regenerations. Catching it at shot 60 costs the film.
