---
title: Editor Generation Workflow Plan
description: Overview of the implementation plan for selection-based editing, preview-first generation, and explicit variant persistence
author: GitHub Copilot
ms.date: 2026-03-26
ms.topic: how-to
keywords:
  - editor
  - generation
  - cloudflare worker
  - google sheets
  - planning
estimated_reading_time: 6
---

## Purpose

This plan defines how we should implement the new editor and generation workflow for draft review.

The target workflow is:

1. Edit draft text in a lightweight editor.
2. Run AI actions on either selected text or the whole post.
3. Preview generated output before any persistence.
4. Compare generated output against the current editor state.
5. Apply generated content only after explicit confirmation.
6. Save four generated variants to Google Sheets only when the user clicks Save Variants.
7. Approve final text independently from whether preview variants were saved.

## Locked Product Decisions

* Editing supports selected text and whole-post scope.
* Formatting stays lightweight for now.
* Formatting uses plain-text-safe conventions, including Unicode where practical.
* Quick changes are transient by default.
* Four-variant generation is preview-only until the user explicitly saves.
* Apply to editor must use a diff-style compare first.
* Approval remains separate from variant persistence.
* Shared rules apply to all generation paths.
* The implementation should be modular across frontend and Worker layers.

## Document Map

Use the supporting files in this folder as the source of truth for execution.

* [Phase plan](./phases.md)
* [Architecture plan](./architecture.md)
* [Acceptance criteria](./acceptance-criteria.md)

## Recommended Delivery Sequence

Implement this work in the following order:

1. Extract the current review experience into smaller frontend modules.
2. Add the editor shell and selection model.
3. Add compare-before-apply behavior.
4. Add Worker preview APIs for quick changes.
5. Add Worker preview APIs for four-variant generation.
6. Add explicit Save Variants persistence.
7. Add shared rules configuration.
8. Remove the old deferred refine flow after parity is reached.

## Non-Goals For The First Iteration

The first implementation should not include the following:

* Full rich-text document storage
* HTML-based editor persistence
* Complex nested formatting semantics
* Full audit history for prompts and generated drafts
* Automatic save of preview variants
* Silent editor replacement without compare