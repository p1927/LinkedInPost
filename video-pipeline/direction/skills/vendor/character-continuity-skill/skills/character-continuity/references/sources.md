# Sources & Confidence

This skill mixes three grades of evidence. They are labelled here rather than blended, so you know which numbers to trust and which to test.

- **[VENDOR]** — documented by the tool maker or in the project's own repository. Reliable, but versioned: vendors change limits without notice
- **[RESEARCH]** — peer-reviewed or preprint academic work
- **[PRACTITIONER]** — reported by working users and industry writeups. Directionally useful, not benchmarked. Some of this category originates from AI-tool content marketing and should be treated as a hypothesis to test on your own material

All links verified reachable in August 2026.

---

## [VENDOR] Tool documentation

- Runway — Creating with Gen-4 Image References
  https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References
- Runway — Multi-Character Dialogues with Act-Two
  https://help.runwayml.com/hc/en-us/articles/41748090660499-Creating-Multi-Character-Dialogues-with-Act-Two
- Google — Veo 3.1 Ingredients to Video
  https://blog.google/innovation-and-ai/technology/ai/veo-3-1-ingredients-to-video/
- Google Cloud — Using reference images to guide video generation
  https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation
- Google Cloud — Veo 3.1 prompting guide
  https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1
- Midjourney — Omni Reference
  https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference
- Kling — Character consistency
  https://kling.ai/quickstart/ai-video-character-consistency
- Kling — Motion Control user guide
  https://kling.ai/quickstart/motion-control-user-guide
- Higgsfield — Soul ID
  https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character
- OpenAI — Sora 2 prompting guide
  https://developers.openai.com/cookbook/examples/sora/sora2_prompting_guide
- Luma — Ray3
  https://lumalabs.ai/ray3
- Luma — Character and object consistency
  https://lumalabs.ai/learning-center/articles/character-and-object-consistency

## [VENDOR] Open-source projects

- CodeFormer — https://github.com/sczhou/CodeFormer
  Fidelity weight semantics and the 0.5 / 0.7 example values are taken directly from the project README
- GFPGAN — https://github.com/TencentARC/GFPGAN
- InstantID — https://github.com/instantX-research/InstantID
- IP-Adapter — https://github.com/tencent-ailab/IP-Adapter
- kohya-ss sd-scripts, SDXL LoRA training — https://github.com/kohya-ss/sd-scripts/blob/main/docs/sdxl_train_network.md
- ostris ai-toolkit, Flux LoRA training — https://github.com/ostris/ai-toolkit

## [RESEARCH]

- Multi-Shot Character Consistency — https://arxiv.org/html/2412.07750v1
  Source for the identity-versus-motion tension and identity decay over long sequences
- PuLID — https://arxiv.org/html/2404.16022
- CharaConsist, ICCV 2025 — https://openaccess.thecvf.com/content/ICCV2025/papers/Wang_CharaConsist_Fine-Grained_Consistent_Character_Generation_ICCV_2025_paper.pdf
## [GRAY LITERATURE]

Unreviewed material — useful, but not peer-reviewed and not vendor-documented. Weigh accordingly.

- Chain Continuity and Multi-Master Keyframe Coverage — https://scholarworks.utrgv.edu/cgi/viewcontent.cgi?article=1019&context=the_fac
  Source for the setup-frame-before-animation workflow. This is a self-deposited item in a university institutional repository's theatre faculty series, by a single author, without peer review. It is the only citation behind that workflow, which is why the skill describes it as the approach I have found most reliable rather than as an established result

## [PRACTITIONER]

- Film Independent — script supervisor continuity practice
  https://www.filmindependent.org/blog/script-supervisor-tips-tricks-and-tools-for-better-continuity-and-careers/
  Basis for the continuity sheet, ported from live-action practice

Practitioner-reported and not independently benchmarked:

- The `--ow` behaviour bands beyond Midjourney's documented 1–1000 range and 100 default
- The 5–10 second clip sweet spot
- The claim that distinctive faces drift less than average ones — consistent with regression-to-mean, but not formally measured
- Specific CodeFormer band recommendations for narrative work; the project documents the parameter's meaning, not these bands
- Reported failure modes for individual tools, which shift with each model release

---

## What this skill does not claim

- That any tool achieves frame-identical consistency. None does
- That these parameters are stable. This space changes monthly — verify before relying on a number
- That the workflow removes the need for review. It reduces the failure rate; the QC gates exist because failures still occur
- That any of it substitutes for casting judgement. A poorly cast face fails no matter how well the pipeline is run

Accurate as of August 2026.
