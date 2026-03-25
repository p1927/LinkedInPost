---
title: LinkedIn Feed Post Anatomy Research
description: Public research notes on the visible anatomy of a LinkedIn feed post card on desktop and mobile
author: GitHub Copilot
ms.date: 2026-03-25
ms.topic: reference
keywords:
  - linkedin
  - feed post
  - ui research
  - responsive design
estimated_reading_time: 3
---

## Research Scope

* Confirm the typical visible sections of a LinkedIn feed post card on desktop web
* Note common metadata in the author/header row
* Capture text behavior, including truncation, hashtags, and see more treatment
* Capture common media treatment and aspect ratios
* Capture typical footer actions
* Note responsive adaptations visible on mobile

## Findings

### Desktop Feed Post Anatomy

* Typical top-to-bottom stack: card container, author/header row, post text, optional media module, social proof line, action row
* The header row commonly shows a profile photo, author name, secondary identity line, time since posting, audience/privacy indicator, and an overflow menu
* The secondary identity line is usually a title, company, follower context, or sponsored/promoted label depending on post type
* Text usually preserves author-entered line breaks, collapses after a short preview, and expands with a see more affordance
* Hashtags are visually link-like and kept inline with the text body rather than separated into chips
* Links may render as preview cards below the text when the post includes a supported URL and no higher-priority media treatment replaces it
* Media is commonly edge-to-edge within the card body with modest corner radius and a neutral background behind letterboxed assets
* Common still-media shapes seen publicly: square, landscape around 1.91:1, and portrait around 4:5; carousels/documents use paged cards or stacked preview frames
* Video generally occupies the same media slot as an image, with a cover frame and player chrome layered on top
* Below media, LinkedIn commonly shows a thin social-proof strip with reaction count and comment or repost counts before the main action row
* The footer action row commonly exposes like, comment, repost, and send or share actions

### Mobile Adaptations

* The same sections remain, but horizontal padding tightens and the content column becomes full width
* Header metadata compresses sooner, so secondary text wraps or truncates earlier than on desktop
* The text preview collapses more aggressively because of the narrower measure, which makes see more appear sooner
* Media usually remains full-width relative to the card, with portrait assets feeling taller and more dominant in the scroll
* Footer actions stay icon-plus-label, but labels may compress visually and touch targets become more important than exact spacing parity with desktop

### Implementation Notes

* Match the overall information hierarchy and spacing rhythm, not exact pixels or proprietary icons
* Use generic avatar circles, neutral reaction glyphs, and original iconography to avoid copying LinkedIn assets
* Treat truncation thresholds as responsive behavior rather than a fixed character count
* Plan for several post variants: text-only, single image, multi-image or carousel, video, document, and link preview

## Sources

* Public observation of current LinkedIn desktop feed cards and mobile screenshots on the open web, March 2026
* [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a507663): confirms LinkedIn serves a mobile-optimized narrow-view experience, which supports responsive adaptation assumptions
* [Sprout Social social media image sizes guide](https://sproutsocial.com/insights/social-media-image-sizes-guide/): accessible public sizing guide used to cross-check that LinkedIn supports multiple common image shapes and device-dependent rendering
* [Canva LinkedIn sizes guide](https://www.canva.com/sizes/linkedin/): accessible public sizing guide used to cross-check common LinkedIn image dimension conventions

## Follow-On Questions

* Whether the preview component should emulate personal posts only, or also company, sponsored, and reshared post variants
* Whether the target preview should include the social-proof counts row or stop at the action row
