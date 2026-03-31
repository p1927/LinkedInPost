import type { SheetRow } from '../../generation/types';
import { buildTopicKey, mergePipelineVariantsWithSelection, type BulkCampaignSheetPostInput } from '../drafts';
import type { SheetsGateway } from '../drafts';
import { mergeTopicWithPipeline, pipelineFieldsFromGooglePipelineRow, sheetRowToPipelineColumns } from './mappers';
import type { PipelineStateDbRow } from './types';

/**
 * Deterministic A/B test group assignment using a simple hash of the rowId.
 * Returns 'A' or 'B' consistently for the same input.
 */
export function getRandomizedTestGroup(rowId: string): string {
  const id = String(rowId || '').trim();
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 2) === 0 ? 'A' : 'B';
}

/** Atomic upsert — INSERT OR REPLACE leverages PRIMARY KEY (spreadsheet_id, topic_id) to replace in one statement. */
const INSERT_PIPELINE_ROW_SQL = `
INSERT OR REPLACE INTO pipeline_state (
  spreadsheet_id, topic_id, topic, date, status,
  variant1, variant2, variant3, variant4,
  image_link1, image_link2, image_link3, image_link4,
  selected_text, selected_image_id, selected_image_urls_json,
  post_time, email_to, email_cc, email_bcc, email_subject,
  topic_generation_rules, generation_template_id, published_at,
  topic_delivery_channel, topic_generation_model,
  content_review_fingerprint, content_review_at, content_review_json,
  generation_run_id, pattern_id, pattern_name, pattern_rationale
) VALUES (
  ?1, ?2, ?3, ?4, ?5,
  ?6, ?7, ?8, ?9,
  ?10, ?11, ?12, ?13,
  ?14, ?15, ?16,
  ?17, ?18, ?19, ?20, ?21,
  ?22, ?23, ?24,
  ?25, ?26,
  ?27, ?28, ?29,
  ?30, ?31, ?32, ?33
)
`;

const UPDATE_EMAIL_FIELDS_SQL = `
UPDATE pipeline_state
SET email_to = ?1, email_cc = ?2, email_bcc = ?3, email_subject = ?4, updated_at = datetime('now')
WHERE spreadsheet_id = ?5 AND topic_id = ?6
`;

function normalizeStatus(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function pipelineDbRowIsDisplayEmpty(p: PipelineStateDbRow): boolean {
  const st = normalizeStatus(p.status);
  if (st && st !== 'pending') {
    return false;
  }
  const variants = [p.variant1, p.variant2, p.variant3, p.variant4].map((v) => String(v ?? '').trim());
  if (variants.some(Boolean)) {
    return false;
  }
  if (String(p.selected_text ?? '').trim()) {
    return false;
  }
  return true;
}

function pickGoogleSheetFieldsForD1(
  draftValues: string[] | undefined,
  postValues: string[] | undefined,
  topicId: string,
  topic: string,
  date: string,
): ReturnType<typeof pipelineFieldsFromGooglePipelineRow> | null {
  const postF = postValues ? pipelineFieldsFromGooglePipelineRow(postValues, topicId, topic, date) : null;
  const draftF = draftValues ? pipelineFieldsFromGooglePipelineRow(draftValues, topicId, topic, date) : null;
  if (postF && normalizeStatus(postF.status) === 'published') {
    return postF;
  }
  if (draftF) {
    return draftF;
  }
  return postF;
}

function bindPipelineInsert(stmt: D1PreparedStatement, spreadsheetId: string, row: SheetRow): D1PreparedStatement {
  const c = sheetRowToPipelineColumns(spreadsheetId, row);
  return stmt.bind(
    c.spreadsheet_id,
    c.topic_id,
    c.topic,
    c.date,
    c.status,
    c.variant1,
    c.variant2,
    c.variant3,
    c.variant4,
    c.image_link1,
    c.image_link2,
    c.image_link3,
    c.image_link4,
    c.selected_text,
    c.selected_image_id,
    c.selected_image_urls_json,
    c.post_time,
    c.email_to,
    c.email_cc,
    c.email_bcc,
    c.email_subject,
    c.topic_generation_rules,
    c.generation_template_id,
    c.published_at,
    c.topic_delivery_channel,
    c.topic_generation_model,
    c.content_review_fingerprint,
    c.content_review_at,
    c.content_review_json,
    c.generation_run_id,
    c.pattern_id,
    c.pattern_name,
    c.pattern_rationale,
  );
}

function pipelineUpsertStatement(db: D1Database, spreadsheetId: string, row: SheetRow): D1PreparedStatement {
  return bindPipelineInsert(db.prepare(INSERT_PIPELINE_ROW_SQL), spreadsheetId, row);
}

export class PipelineStore {
  constructor(private readonly db: D1Database) {}

  async ensureWorkspace(spreadsheetId: string): Promise<void> {
    await this.db
      .prepare(`INSERT OR IGNORE INTO workspaces (spreadsheet_id) VALUES (?)`)
      .bind(spreadsheetId)
      .run();
  }

  async deletePipelineRow(spreadsheetId: string, topicId: string): Promise<void> {
    const id = String(topicId || '').trim();
    if (!id) return;
    await this.db
      .prepare(`DELETE FROM pipeline_state WHERE spreadsheet_id = ? AND topic_id = ?`)
      .bind(spreadsheetId, id)
      .run();
  }

  private async fetchPipelineMapByTopicIds(
    spreadsheetId: string,
    topicIds: string[],
  ): Promise<Map<string, PipelineStateDbRow>> {
    const map = new Map<string, PipelineStateDbRow>();
    const ids = [...new Set(topicIds.map((t) => String(t || '').trim()).filter(Boolean))];
    if (ids.length === 0) {
      return map;
    }
    const chunkSize = 80;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const ph = chunk.map(() => '?').join(',');
      const stmt = this.db.prepare(
        `SELECT * FROM pipeline_state WHERE spreadsheet_id = ? AND topic_id IN (${ph})`,
      );
      const bound = stmt.bind(spreadsheetId, ...chunk);
      const res = await bound.all<PipelineStateDbRow>();
      for (const r of res.results ?? []) {
        map.set(r.topic_id, r);
      }
    }
    return map;
  }

  async getMergedRows(sheets: SheetsGateway, spreadsheetId: string): Promise<SheetRow[]> {
    await sheets.ensurePipelineSheets(spreadsheetId);
    await this.ensureWorkspace(spreadsheetId);

    const topics = await sheets.getTopicsInOrder(spreadsheetId, { skipEnsure: true });
    const topicIds = topics.map((t) => {
      const id = String(t.topicId || '').trim();
      if (!id) {
        throw new Error('Every Topics row must have a Topic Id in column C. Add topics via the app or fill UUIDs.');
      }
      return id;
    });
    let pipelineMap = await this.fetchPipelineMapByTopicIds(spreadsheetId, topicIds);
    const { draftByTopicKey, postByTopicKey } = await sheets.getGooglePipelineSheetMaps(spreadsheetId, {
      skipEnsure: true,
    });

    const hydrateUpserts: SheetRow[] = [];
    for (const t of topics) {
      const id = String(t.topicId || '').trim();
      const key = buildTopicKey(t.topic, t.date);
      const p = pipelineMap.get(id);
      const draftVals = draftByTopicKey.get(key);
      const postVals = postByTopicKey.get(key);
      const fields = pickGoogleSheetFieldsForD1(draftVals, postVals, id, t.topic, t.date);
      if (!fields) {
        continue;
      }
      const needsHydrate = !p || pipelineDbRowIsDisplayEmpty(p);
      if (!needsHydrate) {
        continue;
      }
      const sheetCh = String(fields.topicDeliveryChannel || '').trim();
      const sheetModel = String(fields.topicGenerationModel || '').trim();
      const mergedFields = {
        ...fields,
        topicDeliveryChannel: sheetCh || (p ? String(p.topic_delivery_channel ?? '').trim() : ''),
        topicGenerationModel: sheetModel || (p ? String(p.topic_generation_model ?? '').trim() : ''),
      };
      const sourceSheet: SheetRow['sourceSheet'] =
        normalizeStatus(mergedFields.status) === 'published' ? 'Post' : 'Draft';
      hydrateUpserts.push({
        rowIndex: t.rowIndex,
        sourceSheet,
        topicRowIndex: t.rowIndex,
        ...mergedFields,
      });
    }

    if (hydrateUpserts.length > 0) {
      await Promise.all(hydrateUpserts.map((row) => this.upsertFull(spreadsheetId, row)));
      pipelineMap = await this.fetchPipelineMapByTopicIds(spreadsheetId, topicIds);
    }

    return topics.map((t) => {
      const id = String(t.topicId || '').trim();
      const p = pipelineMap.get(id);
      return mergeTopicWithPipeline(t, p);
    });
  }

  async getRowByTopicId(
    sheets: SheetsGateway,
    spreadsheetId: string,
    topicId: string,
  ): Promise<SheetRow | null> {
    const id = String(topicId || '').trim();
    if (!id) return null;
    const rows = await this.getMergedRows(sheets, spreadsheetId);
    return rows.find((r) => String(r.topicId || '').trim() === id) ?? null;
  }

  async upsertFull(spreadsheetId: string, row: SheetRow): Promise<void> {
    await this.ensureWorkspace(spreadsheetId);
    await pipelineUpsertStatement(this.db, spreadsheetId, row).run();
  }

  async saveDraftVariants(
    spreadsheetId: string,
    row: SheetRow,
    variants: string[],
    previewSelection?: {
      selectedText: string;
      selectedImageId: string;
      selectedImageUrlsJson: string;
    },
  ): Promise<SheetRow> {
    const next: SheetRow = {
      ...row,
      variant1: variants[0] ?? '',
      variant2: variants[1] ?? '',
      variant3: variants[2] ?? '',
      variant4: variants[3] ?? '',
      ...(previewSelection
        ? {
            selectedText: previewSelection.selectedText,
            selectedImageId: previewSelection.selectedImageId,
            selectedImageUrlsJson: previewSelection.selectedImageUrlsJson,
          }
        : {}),
    };
    await this.upsertFull(spreadsheetId, next);
    return next;
  }

  async updateRowStatus(
    spreadsheetId: string,
    row: SheetRow,
    status: string,
    selectedText: string,
    selectedImageId: string,
    postTime: string,
    emailTo = '',
    emailCc = '',
    emailBcc = '',
    emailSubject = '',
    selectedImageUrlsJson = '',
  ): Promise<{ success: true }> {
    let next: SheetRow = {
      ...row,
      status: status || 'Pending',
      selectedText,
      selectedImageId,
      postTime,
      emailTo,
      emailCc,
      emailBcc,
      emailSubject,
      selectedImageUrlsJson,
    };

    if (status === 'Approved') {
      const merged = mergePipelineVariantsWithSelection(
        row.variant1 || '',
        row.variant2 || '',
        row.variant3 || '',
        row.variant4 || '',
        row.imageLink1 || '',
        row.imageLink2 || '',
        row.imageLink3 || '',
        row.imageLink4 || '',
        selectedText,
        selectedImageId,
        selectedImageUrlsJson,
      );
      next = {
        ...next,
        variant1: merged.variant1,
        variant2: merged.variant2,
        variant3: merged.variant3,
        variant4: merged.variant4,
        imageLink1: merged.imageLink1,
        imageLink2: merged.imageLink2,
        imageLink3: merged.imageLink3,
        imageLink4: merged.imageLink4,
      };
    }

    await this.upsertFull(spreadsheetId, next);
    return { success: true };
  }

  async saveEmailFields(
    spreadsheetId: string,
    row: SheetRow,
    emailTo: string,
    emailCc: string,
    emailBcc: string,
    emailSubject: string,
  ): Promise<{ success: true }> {
    const topicId = String(row.topicId || '').trim();
    await this.db
      .prepare(UPDATE_EMAIL_FIELDS_SQL)
      .bind(emailTo, emailCc, emailBcc, emailSubject, spreadsheetId, topicId)
      .run();
    return { success: true };
  }

  async saveTopicGenerationRules(spreadsheetId: string, row: SheetRow, topicRules: string): Promise<SheetRow> {
    const next = { ...row, topicGenerationRules: topicRules };
    await this.upsertFull(spreadsheetId, next);
    return next;
  }

  async saveGenerationTemplateId(spreadsheetId: string, row: SheetRow, generationTemplateId: string): Promise<SheetRow> {
    const value = String(generationTemplateId || '').trim();
    const next = { ...row, generationTemplateId: value };
    await this.upsertFull(spreadsheetId, next);
    return next;
  }

  async savePatternMetadata(
    spreadsheetId: string,
    row: SheetRow,
    meta: {
      generationRunId: string;
      patternId: string;
      patternName: string;
      patternRationale: string;
    },
  ): Promise<SheetRow> {
    const next: SheetRow = {
      ...row,
      generationRunId: meta.generationRunId,
      patternId: meta.patternId,
      patternName: meta.patternName,
      patternRationale: meta.patternRationale,
    };
    await this.upsertFull(spreadsheetId, next);

    const topicId = String(row.topicId || '').trim();
    const testGroup = getRandomizedTestGroup(topicId);
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO template_assignments (
          spreadsheet_id, topic_id, generation_run_id,
          pattern_id, pattern_name, pattern_rationale, test_group
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(
        spreadsheetId,
        topicId,
        meta.generationRunId,
        meta.patternId,
        meta.patternName,
        meta.patternRationale,
        testGroup,
      )
      .run();

    return next;
  }

  async getTemplateAssignment(
    spreadsheetId: string,
    topicId: string,
  ): Promise<{
    generationRunId: string;
    patternId: string;
    patternName: string;
    patternRationale: string;
    testGroup: string;
  } | null> {
    const tid = String(topicId || '').trim();
    if (!tid) return null;
    const row = await this.db
      .prepare(
        `SELECT generation_run_id, pattern_id, pattern_name, pattern_rationale, test_group
         FROM template_assignments WHERE spreadsheet_id = ? AND topic_id = ?`,
      )
      .bind(spreadsheetId, tid)
      .first<{
        generation_run_id: string;
        pattern_id: string;
        pattern_name: string;
        pattern_rationale: string;
        test_group: string;
      }>();
    if (!row) return null;
    return {
      generationRunId: row.generation_run_id,
      patternId: row.pattern_id,
      patternName: row.pattern_name,
      patternRationale: row.pattern_rationale,
      testGroup: row.test_group,
    };
  }

  async listTemplateAssignments(
    spreadsheetId: string,
  ): Promise<
    Array<{
      topicId: string;
      generationRunId: string;
      patternId: string;
      patternName: string;
      patternRationale: string;
      testGroup: string;
      assignedAt: string;
    }>
  > {
    const res = await this.db
      .prepare(
        `SELECT topic_id, generation_run_id, pattern_id, pattern_name, pattern_rationale, test_group, assigned_at
         FROM template_assignments WHERE spreadsheet_id = ? ORDER BY assigned_at DESC`,
      )
      .bind(spreadsheetId)
      .all<{
        topic_id: string;
        generation_run_id: string;
        pattern_id: string;
        pattern_name: string;
        pattern_rationale: string;
        test_group: string;
        assigned_at: string;
      }>();
    return (res.results ?? []).map((r) => ({
      topicId: r.topic_id,
      generationRunId: r.generation_run_id,
      patternId: r.pattern_id,
      patternName: r.pattern_name,
      patternRationale: r.pattern_rationale,
      testGroup: r.test_group,
      assignedAt: r.assigned_at,
    }));
  }

  async saveTopicDeliveryPreferences(
    spreadsheetId: string,
    row: SheetRow,
    prefs: { topicDeliveryChannel?: string; topicGenerationModel?: string },
  ): Promise<SheetRow> {
    let next: SheetRow = { ...row };
    if (prefs.topicDeliveryChannel !== undefined) {
      next = { ...next, topicDeliveryChannel: String(prefs.topicDeliveryChannel || '').trim() };
    }
    if (prefs.topicGenerationModel !== undefined) {
      next = { ...next, topicGenerationModel: String(prefs.topicGenerationModel || '').trim() };
    }
    await this.upsertFull(spreadsheetId, next);
    return next;
  }

  async updatePostSchedule(spreadsheetId: string, row: SheetRow, postTime: string): Promise<{ success: true }> {
    await this.upsertFull(spreadsheetId, { ...row, postTime });
    return { success: true };
  }

  async createDraftFromPublished(
    sheets: SheetsGateway,
    spreadsheetId: string,
    sourceRow: SheetRow,
    selectedText: string,
    selectedImageId: string,
    postTime: string,
    emailTo: string,
    emailCc: string,
    emailBcc: string,
    emailSubject: string,
    selectedImageUrlsJson = '',
  ): Promise<{ success: true; topicId: string }> {
    await sheets.ensurePipelineSheets(spreadsheetId);
    const today = new Date().toISOString().slice(0, 10);
    const topicId = crypto.randomUUID();

    await sheets.appendTopicRows(spreadsheetId, [[sourceRow.topic, today, topicId]]);

    const merged = mergePipelineVariantsWithSelection(
      sourceRow.variant1 || '',
      sourceRow.variant2 || '',
      sourceRow.variant3 || '',
      sourceRow.variant4 || '',
      sourceRow.imageLink1 || '',
      sourceRow.imageLink2 || '',
      sourceRow.imageLink3 || '',
      sourceRow.imageLink4 || '',
      selectedText,
      selectedImageId,
      selectedImageUrlsJson,
    );

    const newRow: SheetRow = {
      rowIndex: 0,
      sourceSheet: 'Draft',
      topic: sourceRow.topic,
      date: today,
      topicId,
      status: 'Drafted',
      variant1: merged.variant1,
      variant2: merged.variant2,
      variant3: merged.variant3,
      variant4: merged.variant4,
      imageLink1: merged.imageLink1,
      imageLink2: merged.imageLink2,
      imageLink3: merged.imageLink3,
      imageLink4: merged.imageLink4,
      selectedText,
      selectedImageId,
      postTime,
      emailTo,
      emailCc,
      emailBcc,
      emailSubject,
      topicGenerationRules: sourceRow.topicGenerationRules || '',
      selectedImageUrlsJson,
      generationTemplateId: sourceRow.generationTemplateId || '',
      publishedAt: undefined,
      topicDeliveryChannel: sourceRow.topicDeliveryChannel || '',
      topicGenerationModel: sourceRow.topicGenerationModel || '',
    };

    await this.ensureWorkspace(spreadsheetId);
    await this.upsertFull(spreadsheetId, newRow);
    return { success: true, topicId };
  }

  async markRowPublished(spreadsheetId: string, row: SheetRow): Promise<{ success: true }> {
    const next: SheetRow = {
      ...row,
      status: 'Published',
      publishedAt: new Date().toISOString(),
    };
    await this.upsertFull(spreadsheetId, next);
    return { success: true };
  }

  async bulkImportCampaign(
    sheets: SheetsGateway,
    spreadsheetId: string,
    posts: BulkCampaignSheetPostInput[],
  ): Promise<{ success: true; imported: number }> {
    if (posts.length === 0) {
      throw new Error('At least one post is required.');
    }

    await sheets.ensurePipelineSheets(spreadsheetId);
    const merged = await this.getMergedRows(sheets, spreadsheetId);
    const existingTopicIds = new Set(merged.map((r) => String(r.topicId || '').trim()).filter(Boolean));
    const existingTopicDate = new Set(merged.map((r) => buildTopicKey(r.topic, r.date)));

    const conflicts: string[] = [];
    const seenImportIds = new Set<string>();
    for (const p of posts) {
      const tid = String(p.topicId || '').trim();
      if (seenImportIds.has(tid)) {
        conflicts.push(`duplicate topicId in import: ${tid}`);
      }
      seenImportIds.add(tid);
      if (existingTopicIds.has(tid)) {
        conflicts.push(`topicId ${tid}`);
      }
      const k = buildTopicKey(p.topic, p.date);
      if (existingTopicDate.has(k)) {
        conflicts.push(`${p.topic} (${p.date})`);
      }
    }
    if (conflicts.length > 0) {
      const sample = [...new Set(conflicts)].slice(0, 8).join('; ');
      const more = conflicts.length > 8 ? ` …and ${conflicts.length - 8} more` : '';
      throw new Error(`Import conflicts: ${sample}${more}.`);
    }

    const topicsValues = posts.map((p) => [p.topic, p.date, p.topicId]);
    await sheets.appendTopicRows(spreadsheetId, topicsValues);

    await this.ensureWorkspace(spreadsheetId);
    const stmts: D1PreparedStatement[] = [];
    for (const p of posts) {
      const row: SheetRow = {
        rowIndex: 0,
        sourceSheet: 'Draft',
        topicId: p.topicId,
        topic: p.topic,
        date: p.date,
        status: p.status || 'Drafted',
        variant1: p.variant1,
        variant2: p.variant2,
        variant3: p.variant3,
        variant4: p.variant4,
        imageLink1: '',
        imageLink2: '',
        imageLink3: '',
        imageLink4: '',
        selectedText: p.selectedText,
        selectedImageId: p.selectedImageId,
        selectedImageUrlsJson: p.selectedImageUrlsJson,
        postTime: p.postTime,
        emailTo: '',
        emailCc: '',
        emailBcc: '',
        emailSubject: '',
        topicGenerationRules: p.topicGenerationRules,
        generationTemplateId: p.generationTemplateId,
        topicDeliveryChannel: '',
        topicGenerationModel: '',
      };
      stmts.push(pipelineUpsertStatement(this.db, spreadsheetId, row));
    }

    for (let i = 0; i < stmts.length; i += 100) {
      await this.db.batch(stmts.slice(i, i + 100));
    }

    return { success: true, imported: posts.length };
  }

  async updateContentReview(
    spreadsheetId: string,
    topicId: string,
    fingerprint: string,
    reviewedAt: string,
    json: string,
  ): Promise<void> {
    const tid = String(topicId || '').trim();
    if (!tid) return;
    await this.db
      .prepare(
        `UPDATE pipeline_state
         SET content_review_fingerprint = ?1, content_review_at = ?2, content_review_json = ?3, updated_at = datetime('now')
         WHERE spreadsheet_id = ?4 AND topic_id = ?5`,
      )
      .bind(fingerprint, reviewedAt, json, spreadsheetId, tid)
      .run();
  }
}
