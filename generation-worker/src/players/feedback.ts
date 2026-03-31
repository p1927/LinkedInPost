import type { FeedbackRequest } from '../types';

export async function saveFeedback(
  db: D1Database,
  req: FeedbackRequest,
  patternId: string,
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO generation_feedback
        (id, run_id, selected_variant_index, final_text, selected_image_id, notes, pattern_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      req.runId,
      req.selectedVariantIndex ?? null,
      req.finalText ?? '',
      req.selectedImageId ?? '',
      req.notes ?? '',
      patternId,
    )
    .run();
  return id;
}
