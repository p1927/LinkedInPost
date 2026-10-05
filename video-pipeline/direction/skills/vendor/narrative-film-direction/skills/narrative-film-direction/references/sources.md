# Sources & Confidence

Three grades, same system as `character-continuity`:

- **[VENDOR]** — documented by the tool maker or in the tool's own repository. Reliable but versioned; vendors change capabilities and limits without notice.
- **[RESEARCH]** — peer-reviewed or preprint academic work.
- **[PRACTITIONER]** — reported by working users, industry writeups, or practitioner guides. Directionally useful, not formally benchmarked. Some of this category originates from tool-vendor content marketing.

Claims labelled **[PRACTITIONER]** are reported experience, not measured results. They are reasonable starting points. Test on your own material and update the label if you find otherwise.

All links verified reachable in August 2026.

---

## [VENDOR] Tool documentation

- Runway Gen-4 References — https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References
- Runway Act-Two multi-character dialogue — https://help.runwayml.com/hc/en-us/articles/41748090660499-Creating-Multi-Character-Dialogues-with-Act-Two
- Google Veo 3.1 prompting guide — https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1
- Kling character consistency — https://kling.ai/quickstart/ai-video-character-consistency
- Kling Motion Control — https://kling.ai/quickstart/motion-control-user-guide
- OpenAI Sora 2 prompting guide — https://developers.openai.com/cookbook/examples/sora/sora2_prompting_guide

---

## [RESEARCH]

- Chain Continuity and Multi-Master Keyframe Coverage (UTRGV, gray literature — theatre faculty deposit, unreviewed) — https://scholarworks.utrgv.edu/cgi/viewcontent.cgi?article=1019&context=the_fac
  Source for the master-first, setup-frame-before-animation workflow. Filed here because the UTRGV deposit is not peer-reviewed — treat as practitioner-grade, not research-grade, despite the institutional URL.

Note: no peer-reviewed papers are cited here for the directing methodology itself — this is an applied practice discipline, not a research field. If you find relevant academic work, please open an issue.

---

## [PRACTITIONER]

The following are reported from practitioner writeups, tool guides and worked examples. They are reasonable defaults. Verify against your own model and workflow.

**Clip length (5–8 seconds):** converged across multiple sources. Model maximums vary — Veo 3.1 base clips are 8s (extendable), Sora 2 up to 15s, Kling 3.0 up to 15s.

**4-frame head/tail trim:** reported working practice.

**30° rule:** classical film editing rule applied to AI clip assembly.

**Cut-hide technique:** described in InVideo FAQ and AI editing practitioner guides.
- https://invideo.io/faq/what-is-the-cut-hide-technique-in-ai-filmmaking-and-how/

**Shot-reverse-shot with AI:** https://invideo.io/faq/how-do-you-generate-a-shotreverse-shot-pair-with/

**180° rule AI implementation:** https://www.artarch.ai/blog/ai-video-180-degree-rule-shot-reverse-shot

**Slow push-in default and mitigations:** converged across tool documentation and practitioner guides.
- https://aitoolsguidebook.com/en/articles/ai-video-camera-jitter-fix/
- https://cineprompt.io/field-notes/camera-movement-keywords

**Colour matching workflow:**
- https://hackernoon.com/how-to-color-match-ai-video-clips-when-every-model-grades-differently

**NLE capabilities (Premiere Pro 26.0, DaVinci Resolve 20.3.2):**
- https://weandthecolor.com/the-coolest-new-features-in-adobe-premiere-v26-0-and-davinci-resolve-20-3-2-and-my-personal-favorites/208910

**Eyeline degree notation:** developed from practitioner patterns described in:
- https://hailuoai.video/pages/knowledge/director-guide-shot-reverse-shot-spatial-logic
- https://github.com/Eric-Lautanen/seamless-ai-video-prompt-template

---

## What this skill does not claim

- That any technique works identically across all generators — model behaviour varies significantly
- That the clip duration ranges are hard limits — they are reported practitioner ranges, not formal measurements
- That the 30° rule always produces a clean cut — it reduces jump-cut risk, it does not eliminate it
- That the overhead blocking diagram prevents all spatial errors — it makes them visible and diagnosable sooner

Accurate as of August 2026. Clip length maximums, native camera controls and colour pipeline capabilities change with each model release. Verify before planning a production schedule.
