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

/** Atomic upsert — INSERT OR REPLACE leverages PRIMARY KEY (user_id, topic_id) to replace in one statement. */
const INSERT_PIPELINE_ROW_SQL = `
INSERT OR REPLACE INTO pipeline_state (
  user_id, spreadsheet_id, topic_id, topic_key, topic, date, status,
  variant1, variant2, variant3, variant4,
  image_link1, image_link2, image_link3, image_link4,
  selected_text, selected_image_id, selected_image_urls_json,
  post_time, email_to, email_cc, email_bcc, email_subject,
  topic_generation_rules, generation_template_id, published_at,
  topic_delivery_channel, topic_generation_model,
  content_review_fingerprint, content_review_at, content_review_json,
  generation_run_id, pattern_id, pattern_name, pattern_rationale
) VALUES (
  ?1, ?2, ?3, ?4, ?5, ?6, ?7,
  ?8, ?9, ?10, ?11,
  ?12, ?13, ?14, ?15,
  ?16, ?17, ?18,
  ?19, ?20, ?21, ?22, ?23,
  ?24, ?25, ?26,
  ?27, ?28,
  ?29, ?30, ?31,
  ?32, ?33, ?34, ?35
)
`;

const UPDATE_EMAIL_FIELDS_SQL = `
UPDATE pipeline_state
SET email_to = ?1, email_cc = ?2, email_bcc = ?3, email_subject = ?4, updated_at = datetime('now')
WHERE user_id = ?5 AND topic_id = ?6
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

function bindPipelineInsert(stmt: D1PreparedStatement, userId: string, spreadsheetId: string, row: SheetRow): D1PreparedStatement {
  const c = sheetRowToPipelineColumns(spreadsheetId, row);
  const topicKey = buildTopicKey(row.topic, row.date);
  return stmt.bind(
    userId,           // ?1 user_id
    c.spreadsheet_id, // ?2 spreadsheet_id
    c.topic_id,       // ?3 topic_id
    topicKey,         // ?4 topic_key
    c.topic,          // ?5 topic
    c.date,           // ?6 date
    c.status,         // ?7 status
    c.variant1,       // ?8
    c.variant2,       // ?9
    c.variant3,       // ?10
    c.variant4,       // ?11
    c.image_link1,    // ?12
    c.image_link2,    // ?13
    c.image_link3,    // ?14
    c.image_link4,    // ?15
    c.selected_text,  // ?16
    c.selected_image_id, // ?17
    c.selected_image_urls_json, // ?18
    c.post_time,      // ?19
    c.email_to,       // ?20
    c.email_cc,       // ?21
    c.email_bcc,      // ?22
    c.email_subject,  // ?23
    c.topic_generation_rules, // ?24
    c.generation_template_id, // ?25
    c.published_at,   // ?26
    c.topic_delivery_channel, // ?27
    c.topic_generation_model, // ?28
    c.content_review_fingerprint, // ?29
    c.content_review_at, // ?30
    c.content_review_json, // ?31
    c.generation_run_id, // ?32
    c.pattern_id,     // ?33
    c.pattern_name,   // ?34
    c.pattern_rationale, // ?35
  );
}

function pipelineUpsertStatement(db: D1Database, userId: string, spreadsheetId: string, row: SheetRow): D1PreparedStatement {
  return bindPipelineInsert(db.prepare(INSERT_PIPELINE_ROW_SQL), userId, spreadsheetId, row);
}

export class PipelineStore {
  constructor(private readonly db: D1Database, private readonly userId: string = '') {}

  async ensureWorkspace(spreadsheetId: string): Promise<void> {
    await this.db
      .prepare(`INSERT OR IGNORE INTO workspaces (spreadsheet_id) VALUES (?)`)
      .bind(spreadsheetId)
      .run();
  }

  async deletePipelineRow(_spreadsheetId: string, topicId: string): Promise<void> {
    const id = String(topicId || '').trim();
    if (!id) return;
    await this.db
      .prepare(`DELETE FROM pipeline_state WHERE user_id = ? AND topic_id = ?`)
      .bind(this.userId, id)
      .run();
  }

  private async fetchPipelineMapByTopicIds(
    _spreadsheetId: string,
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
        `SELECT * FROM pipeline_state WHERE user_id = ? AND topic_id IN (${ph})`,
      );
      const bound = stmt.bind(this.userId, ...chunk);
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
    if (spreadsheetId) await this.ensureWorkspace(spreadsheetId);
    await pipelineUpsertStatement(this.db, this.userId, spreadsheetId, row).run();
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
    const v1 = variants[0] ?? '';
    const v2 = variants[1] ?? '';
    const v3 = variants[2] ?? '';
    const v4 = variants[3] ?? '';
    const next: SheetRow = {
      ...row,
      status: 'Drafted',
      variant1: v1,
      variant2: v2,
      variant3: v3,
      variant4: v4,
    };
    if (previewSelection) {
      next.selectedText = previewSelection.selectedText;
      next.selectedImageId = previewSelection.selectedImageId;
      next.selectedImageUrlsJson = previewSelection.selectedImageUrlsJson;
    } else if (!String(row.selectedText || '').trim() && String(v1).trim()) {
      next.selectedText = v1;
    }
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
    _spreadsheetId: string,
    row: SheetRow,
    emailTo: string,
    emailCc: string,
    emailBcc: string,
    emailSubject: string,
  ): Promise<{ success: true }> {
    const topicId = String(row.topicId || '').trim();
    await this.db
      .prepare(UPDATE_EMAIL_FIELDS_SQL)
      .bind(emailTo, emailCc, emailBcc, emailSubject, this.userId, topicId)
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
        imageLink1: p.selectedImageId || '',
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
      stmts.push(pipelineUpsertStatement(this.db, this.userId, spreadsheetId, row));
    }

    for (let i = 0; i < stmts.length; i += 100) {
      await this.db.batch(stmts.slice(i, i + 100));
    }

    return { success: true, imported: posts.length };
  }

  async updateContentReview(
    _spreadsheetId: string,
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
         WHERE user_id = ?4 AND topic_id = ?5`,
      )
      .bind(fingerprint, reviewedAt, json, this.userId, tid)
      .run();
  }

  async getRowsByUserId(userId?: string): Promise<SheetRow[]> {
    const uid = userId ?? this.userId;
    const { results } = await this.db
      .prepare(`SELECT * FROM pipeline_state WHERE user_id = ?1 ORDER BY date ASC, topic ASC`)
      .bind(uid)
      .all<PipelineStateDbRow>();
    return (results ?? []).map((row) => ({
      rowIndex: 0,
      sourceSheet: (row.status?.toLowerCase() === 'published' ? 'Post' : 'Draft') as SheetRow['sourceSheet'],
      topicId: row.topic_id,
      topic: row.topic,
      date: row.date,
      status: row.status || 'Pending',
      variant1: row.variant1 ?? '',
      variant2: row.variant2 ?? '',
      variant3: row.variant3 ?? '',
      variant4: row.variant4 ?? '',
      imageLink1: row.image_link1 ?? '',
      imageLink2: row.image_link2 ?? '',
      imageLink3: row.image_link3 ?? '',
      imageLink4: row.image_link4 ?? '',
      selectedText: row.selected_text ?? '',
      selectedImageId: row.selected_image_id ?? '',
      selectedImageUrlsJson: row.selected_image_urls_json ?? '',
      postTime: row.post_time ?? '',
      emailTo: row.email_to ?? '',
      emailCc: row.email_cc ?? '',
      emailBcc: row.email_bcc ?? '',
      emailSubject: row.email_subject ?? '',
      topicGenerationRules: row.topic_generation_rules ?? '',
      generationTemplateId: row.generation_template_id ?? '',
      publishedAt: row.published_at ?? undefined,
      topicDeliveryChannel: row.topic_delivery_channel ?? '',
      topicGenerationModel: row.topic_generation_model ?? '',
      contentReviewFingerprint: row.content_review_fingerprint ?? '',
      contentReviewAt: row.content_review_at ?? undefined,
      contentReviewJson: row.content_review_json ?? '',
      generationRunId: row.generation_run_id ?? '',
      patternId: row.pattern_id ?? '',
      patternName: row.pattern_name ?? '',
      patternRationale: row.pattern_rationale ?? '',
    }));
  }

  async addTopicToD1(topic: string, date: string, topicId: string, spreadsheetIdForRow = '', topicGenerationRules = '', status = 'Pending'): Promise<SheetRow> {
    const topicKey = buildTopicKey(topic, date);
    const sid = String(spreadsheetIdForRow || '').trim();
    await this.db
      .prepare(INSERT_PIPELINE_ROW_SQL)
      .bind(
        this.userId, sid, topicId, topicKey, topic, date, status,
        '', '', '', '',
        '', '', '', '',
        '', '', '',
        '', '', '', '', '',
        topicGenerationRules, '', null,
        '', '',
        '', null, '',
        '', '', '', '',
      )
      .run();
    return {
      rowIndex: 0,
      sourceSheet: 'Topics' as SheetRow['sourceSheet'],
      topicId,
      topic,
      date,
      status,
      variant1: '', variant2: '', variant3: '', variant4: '',
      imageLink1: '', imageLink2: '', imageLink3: '', imageLink4: '',
      selectedText: '', selectedImageId: '', selectedImageUrlsJson: '',
      postTime: '',
      emailTo: '', emailCc: '', emailBcc: '', emailSubject: '',
      topicGenerationRules, generationTemplateId: '',
      topicDeliveryChannel: '', topicGenerationModel: '',
    };
  }

  async listCustomPersonas(userId: string) {
    interface CustomPersonaRow {
      id: string;
      name: string;
      concerns: string;
      ambitions: string;
      current_focus: string;
      habits: string;
      language: string;
      decision_drivers: string;
      pain_points: string;
    }
    const rows = await this.db
      .prepare('SELECT * FROM custom_personas WHERE user_id = ? ORDER BY name ASC')
      .bind(userId)
      .all<CustomPersonaRow>();
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      concerns: JSON.parse(r.concerns),
      ambitions: JSON.parse(r.ambitions),
      currentFocus: r.current_focus,
      habits: JSON.parse(r.habits),
      language: r.language,
      decisionDrivers: JSON.parse(r.decision_drivers),
      painPoints: JSON.parse(r.pain_points),
    }));
  }

  async createCustomPersona(
    userId: string,
    p: {
      id: string;
      name: string;
      concerns: string[];
      ambitions: string[];
      currentFocus: string;
      habits: string[];
      language: string;
      decisionDrivers: string[];
      painPoints: string[];
    },
  ) {
    await this.db
      .prepare(
        `INSERT INTO custom_personas
           (id, user_id, name, concerns, ambitions, current_focus, habits, language, decision_drivers, pain_points)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
      .bind(
        p.id,
        userId,
        p.name,
        JSON.stringify(p.concerns),
        JSON.stringify(p.ambitions),
        p.currentFocus,
        JSON.stringify(p.habits),
        p.language,
        JSON.stringify(p.decisionDrivers),
        JSON.stringify(p.painPoints),
      )
      .run();
  }

  async deleteCustomPersona(userId: string, personaId: string) {
    await this.db
      .prepare('DELETE FROM custom_personas WHERE user_id = ? AND id = ?')
      .bind(userId, personaId)
      .run();
  }
}
