import type { SheetRow } from '../../generation/types';
import {
  buildTopicKey,
  mergePipelineVariantsWithSelection,
  type BulkCampaignSheetPostInput,
} from '../drafts';
import type { SheetsGateway } from '../drafts';
import { mergeTopicWithPipeline, sheetRowToPipelineColumns, type TopicSheetEntry } from './mappers';
import type { PipelineStateDbRow } from './types';

const UPSERT_SQL = `
INSERT INTO pipeline_state (
  spreadsheet_id, topic_key, topic, date, topic_id, status,
  variant1, variant2, variant3, variant4,
  image_link1, image_link2, image_link3, image_link4,
  selected_text, selected_image_id, selected_image_urls_json,
  post_time, email_to, email_cc, email_bcc, email_subject,
  topic_generation_rules, generation_template_id, published_at
) VALUES (
  ?1, ?2, ?3, ?4, ?5, ?6,
  ?7, ?8, ?9, ?10,
  ?11, ?12, ?13, ?14,
  ?15, ?16, ?17,
  ?18, ?19, ?20, ?21, ?22,
  ?23, ?24, ?25
)
ON CONFLICT(spreadsheet_id, topic_key) DO UPDATE SET
  topic = excluded.topic,
  date = excluded.date,
  topic_id = excluded.topic_id,
  status = excluded.status,
  variant1 = excluded.variant1,
  variant2 = excluded.variant2,
  variant3 = excluded.variant3,
  variant4 = excluded.variant4,
  image_link1 = excluded.image_link1,
  image_link2 = excluded.image_link2,
  image_link3 = excluded.image_link3,
  image_link4 = excluded.image_link4,
  selected_text = excluded.selected_text,
  selected_image_id = excluded.selected_image_id,
  selected_image_urls_json = excluded.selected_image_urls_json,
  post_time = excluded.post_time,
  email_to = excluded.email_to,
  email_cc = excluded.email_cc,
  email_bcc = excluded.email_bcc,
  email_subject = excluded.email_subject,
  topic_generation_rules = excluded.topic_generation_rules,
  generation_template_id = excluded.generation_template_id,
  published_at = excluded.published_at,
  updated_at = datetime('now')
`;

function bindUpsert(stmt: D1PreparedStatement, spreadsheetId: string, topicKey: string, row: SheetRow): D1PreparedStatement {
  const c = sheetRowToPipelineColumns(spreadsheetId, topicKey, row);
  return stmt.bind(
    c.spreadsheet_id,
    c.topic_key,
    c.topic,
    c.date,
    c.topic_id,
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
  );
}

export class PipelineStore {
  constructor(private readonly db: D1Database) {}

  async ensureWorkspace(spreadsheetId: string): Promise<void> {
    await this.db
      .prepare(`INSERT OR IGNORE INTO workspaces (spreadsheet_id) VALUES (?)`)
      .bind(spreadsheetId)
      .run();
  }

  async deletePipelineRow(spreadsheetId: string, topicKey: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM pipeline_state WHERE spreadsheet_id = ? AND topic_key = ?`)
      .bind(spreadsheetId, topicKey)
      .run();
  }

  private async fetchPipelineMap(spreadsheetId: string, topicKeys: string[]): Promise<Map<string, PipelineStateDbRow>> {
    const map = new Map<string, PipelineStateDbRow>();
    if (topicKeys.length === 0) {
      return map;
    }
    const chunkSize = 80;
    for (let i = 0; i < topicKeys.length; i += chunkSize) {
      const chunk = topicKeys.slice(i, i + chunkSize);
      const ph = chunk.map(() => '?').join(',');
      const stmt = this.db.prepare(
        `SELECT * FROM pipeline_state WHERE spreadsheet_id = ? AND topic_key IN (${ph})`,
      );
      const bound = stmt.bind(spreadsheetId, ...chunk);
      const res = await bound.all<PipelineStateDbRow>();
      for (const r of res.results ?? []) {
        map.set(r.topic_key, r);
      }
    }
    return map;
  }

  async getMergedRows(sheets: SheetsGateway, spreadsheetId: string): Promise<SheetRow[]> {
    await sheets.ensurePipelineSheets(spreadsheetId);
    await this.ensureWorkspace(spreadsheetId);

    const topics = await sheets.getTopicsInOrder(spreadsheetId);
    const keys = topics.map((t) => buildTopicKey(t.topic, t.date));
    const pipelineMap = await this.fetchPipelineMap(spreadsheetId, keys);
    const legacy = await sheets.getLegacyDraftPostRowIndices(spreadsheetId);

    return topics.map((t) => {
      const key = buildTopicKey(t.topic, t.date);
      const p = pipelineMap.get(key);
      const leg = legacy.get(key);
      return mergeTopicWithPipeline(t, p, leg);
    });
  }

  async getRowByTopicDate(
    sheets: SheetsGateway,
    spreadsheetId: string,
    topic: string,
    date: string,
  ): Promise<SheetRow | null> {
    const rows = await this.getMergedRows(sheets, spreadsheetId);
    const key = buildTopicKey(topic, date);
    return rows.find((r) => buildTopicKey(r.topic, r.date) === key) ?? null;
  }

  async upsertFull(spreadsheetId: string, row: SheetRow): Promise<void> {
    await this.ensureWorkspace(spreadsheetId);
    const topicKey = buildTopicKey(row.topic, row.date);
    const stmt = this.db.prepare(UPSERT_SQL);
    await bindUpsert(stmt, spreadsheetId, topicKey, row).run();
  }

  async saveDraftVariants(
    spreadsheetId: string,
    row: SheetRow,
    variants: string[],
  ): Promise<SheetRow> {
    const next: SheetRow = {
      ...row,
      variant1: variants[0] ?? '',
      variant2: variants[1] ?? '',
      variant3: variants[2] ?? '',
      variant4: variants[3] ?? '',
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
    await this.upsertFull(spreadsheetId, {
      ...row,
      emailTo,
      emailCc,
      emailBcc,
      emailSubject,
    });
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
  ): Promise<{ success: true }> {
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
    };

    await this.ensureWorkspace(spreadsheetId);
    await this.upsertFull(spreadsheetId, newRow);
    return { success: true };
  }

  async markRowPublished(spreadsheetId: string, row: SheetRow): Promise<{ success: true }> {
    const next: SheetRow = {
      ...row,
      status: row.status || 'Published',
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
    const existingKeys = new Set(merged.map((r) => buildTopicKey(r.topic, r.date)));

    const conflicts: string[] = [];
    for (const p of posts) {
      const k = buildTopicKey(p.topic, p.date);
      if (existingKeys.has(k)) {
        conflicts.push(`${p.topic} (${p.date})`);
      }
    }
    if (conflicts.length > 0) {
      const sample = conflicts.slice(0, 8).join('; ');
      const more = conflicts.length > 8 ? ` …and ${conflicts.length - 8} more` : '';
      throw new Error(
        `These topic+date rows already exist in the spreadsheet: ${sample}${more}. Remove or change them before importing.`,
      );
    }

    const topicsValues = posts.map((p) => [p.topic, p.date, p.topicId]);
    await sheets.appendTopicRows(spreadsheetId, topicsValues);

    await this.ensureWorkspace(spreadsheetId);
    const stmt = this.db.prepare(UPSERT_SQL);
    const batchStmts: D1PreparedStatement[] = posts.map((p) => {
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
      };
      return bindUpsert(stmt, spreadsheetId, buildTopicKey(p.topic, p.date), row);
    });

    for (let i = 0; i < batchStmts.length; i += 128) {
      await this.db.batch(batchStmts.slice(i, i + 128));
    }

    return { success: true, imported: posts.length };
  }
}
