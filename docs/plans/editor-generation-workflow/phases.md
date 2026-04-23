---
title: Editor Generation Workflow Phase Plan
description: Phased implementation plan for the new editor, generation, compare, and persistence workflow
author: GitHub Copilot
ms.date: 2026-03-26
ms.topic: how-to
keywords:
  - implementation phases
  - editor
  - variants
  - quick changes
estimated_reading_time: 8
---

## Phase 1: Lock The UX Contract

Goal: define stable behavior before editing components or Worker APIs.

Tasks:

* Define action semantics for Generate 4 Variants, Quick Change, Apply to Editor, Save Variants, and Approve.
* Define the difference between sheet state, editor working state, and preview state.
* Define selection scope behavior for selected text and whole post.
* Define save and failure behavior for preview content.

Exit criteria:

* Every user action has one clear meaning.
* No action both previews and persists in the same step.
* Unsaved preview state is explicitly represented in the UI model.

## Phase 2: Refactor The Frontend Review Surface

Goal: break the current review flow into modular features before adding new behavior.

Tasks:

* Extract review logic out of the current monolithic component.
* Introduce feature folders for editor, generation, compare, rules, and persistence.
* Preserve current approval behavior while refactoring.

Exit criteria:

* Current review and approval still work.
* New modules have stable boundaries.
* Refinement behavior is no longer tightly coupled to approval UI.

## Phase 3: Add The Lightweight Editor And Selection Model

Goal: support manual editing and explicit selection-based targeting.

Tasks:

* Add an editable draft surface.
* Add selected-text detection.
* Add whole-post fallback mode.
* Add lightweight formatting actions.
* Add scope indicator UI.

Exit criteria:

* User can edit text directly.
* User can target selected text or whole post.
* Formatting works without introducing rich-text persistence requirements.

## Phase 4: Add Preview-Only Worker Generation

Goal: generate preview content without persisting it.

Tasks:

* Add Worker endpoint for quick change preview.
* Add Worker endpoint for four-variant preview.
* Normalize generated output into plain string results.
* Return enough metadata for compare and save actions.

Exit criteria:

* Quick changes can be previewed without saving.
* Four variants can be previewed without saving.
* Selection and whole-post inputs are both supported.

## Phase 5: Add Compare-Before-Apply

Goal: prevent silent overwrite of editor content.

Tasks:

* Add diff-style compare view.
* Support compare for selection replacement.
* Support compare for whole-post replacement.
* Support apply and cancel flows.

Exit criteria:

* Generated content cannot overwrite editor text without confirmation.
* The compare view works for both scopes.
* Applied content updates editor state only.

## Phase 6: Add Explicit Persistence And Recovery

Goal: save only when the user asks and recover cleanly from save failures.

Tasks:

* Add Save Variants action.
* Persist the current previewed four-variant set to Sheets.
* Add clear sync state messaging.
* Allow approval even if variant save fails.
* Add retry save behavior.

Exit criteria:

* Variants save only on explicit user action.
* Variant save failure does not destroy preview content.
* Approval remains independent from variant persistence.

## Suggested Sprint Split

### Sprint 1

* Phase 1
* Phase 2
* Phase 3

### Sprint 2

* Phase 4 for quick changes
* Phase 5

### Sprint 3

* Phase 4 for four-variant preview
* Phase 6

### Sprint 4

* Shared rules configuration
* Cleanup and removal of legacy refine path
* Hardening and polish