---
title: Editor Generation Workflow Acceptance Criteria
description: Acceptance criteria for the new editor, generation, compare, and variant persistence workflow
author: GitHub Copilot
ms.date: 2026-03-26
ms.topic: reference
keywords:
  - acceptance criteria
  - testing
  - editor
  - variants
estimated_reading_time: 7
---

## Core Workflow Criteria

* User can open a draft in a lightweight editor.
* User can edit content before generating anything.
* User can target either selected text or the whole post.
* The active target is always visible in the UI.

## Formatting Criteria

* Formatting remains lightweight.
* Formatting does not require full rich-text persistence.
* The saved output remains valid plain-text content for downstream platforms.
* Unicode-based styling, if used, degrades gracefully when not rendered consistently.

## Quick Change Criteria

* Quick change can run on selected text.
* Quick change can run on the whole post.
* Quick change returns preview output without writing to Sheets.
* Quick change output can be compared before apply.
* Applying quick change output updates editor state only.

## Four-Variant Criteria

* Four-variant generation can run on selected text.
* Four-variant generation can run on the whole post.
* Four-variant generation returns four preview variants without writing to Sheets.
* The preview state is clearly marked as unsaved.
* The user can save the previewed four-variant set explicitly.

## Compare Criteria

* Generated content never replaces editor content without confirmation.
* Compare view supports selected-text replacement.
* Compare view supports whole-post replacement.
* User can cancel compare without losing current editor content.

## Persistence Criteria

* Save Variants writes variants to Sheets only when the user clicks it.
* Approval does not require prior Save Variants success.
* Variant save failures do not remove previewed results.
* Save retry is available after variant save failure.

## Rules Criteria

* Shared rules can be configured centrally.
* Shared rules are applied to quick changes.
* Shared rules are applied to four-variant generation.
* Per-run instruction is supported in addition to shared rules.

## Modularity Criteria

* Editor logic is isolated from generation transport logic.
* Compare logic is isolated from persistence logic.
* Worker generation logic is isolated from Sheets persistence logic.
* The implementation does not add major new behavior to one oversized component.

## Migration Criteria

* Existing approval behavior remains functional during refactor.
* The old refine path is removed only after the new preview-first flow reaches parity.
* Users are not forced into a broken transition state during rollout.