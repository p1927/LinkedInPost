import type { Env } from '../index';
import { mintGoogleAccessToken } from '../index';
import type { ManagedSheetName, PostTemplate, SheetRow } from '../generation/types';
import { parseRowImageUrls } from '../media/selectedImageUrls';

const TOPICS_SHEET = 'Topics';
const DRAFT_SHEET = 'Draft';
const POST_SHEET = 'Post';
const POST_TEMPLATES_SHEET = 'PostTemplates';
const NEWS_RESEARCH_SHEET = 'NewsResearch';
const TOPICS_HEADERS = ['Topic', 'Date', 'Topic Id'];
const POST_TEMPLATES_HEADERS = ['Template id', 'Name', 'Rules'];
const NEWS_RESEARCH_HEADERS = [
  'TopicKey',
  'FetchedAt',
  'WindowStart',
  'WindowEnd',
  'CustomQuery',
  'ProvidersSummary',
  'ArticlesJson',
  'DedupeRemoved',
];
const PIPELINE_HEADERS = [
  'Topic',
  'Date',
  'Status',
  'Variant 1',
  'Variant 2',
  'Variant 3',
  'Variant 4',
  'Image Link 1',
  'Image Link 2',
  'Image Link 3',
  'Image Link 4',
  'Selected Text',
  'Selected Image ID',
  'Post Time',
  'Email To',
  'Email Cc',
  'Email Bcc',
  'Email Subject',
  'Topic rules',
  'Image URLs JSON',
  'Generation template id',
  'Topic Id',
];

const PIPELINE_COLS = 22;

interface SpreadsheetMetadataResponse {
  sheets?: SpreadsheetSheetMetadata[];
}

interface SpreadsheetSheetMetadata {
  properties?: {
    sheetId?: number;
    title?: string;
  };
}

export function buildTopicKey(topic: string, date: string): string {
  return `${topic.trim()}::${date.trim()}`;
}

/** Normalized row shape for `bulkImportCampaign` (sheet-ready). */
export interface BulkCampaignSheetPostInput {
  topicId: string;
  topic: string;
  date: string;
  status: string;
  variant1: string;
  variant2: string;
  variant3: string;
  variant4: string;
  postTime: string;
  topicGenerationRules: string;
  generationTemplateId: string;
  selectedText: string;
  selectedImageId: string;
  selectedImageUrlsJson: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Keeps variant text (D–G) and per-variant image links (H–K) aligned with the saved post body and
 * selected image URLs (L / M / T). Without this, createDraftFromPublished and approve copy stale
 * image links while JSON/ID hold the real selection.
 */
function mergePipelineVariantsWithSelection(
  variant1: string,
  variant2: string,
  variant3: string,
  variant4: string,
  imageLink1: string,
  imageLink2: string,
  imageLink3: string,
  imageLink4: string,
  selectedText: string,
  selectedImageId: string,
  selectedImageUrlsJson: string,
): {
  variant1: string;
  variant2: string;
  variant3: string;
  variant4: string;
  imageLink1: string;
  imageLink2: string;
  imageLink3: string;
  imageLink4: string;
} {
  const urls = parseRowImageUrls({ selectedImageId, selectedImageUrlsJson });
  const st = selectedText.trim();
  const vRaw = [variant1, variant2, variant3, variant4];
  const vTrim = vRaw.map((s) => (s || '').trim());
  const outV = [...vRaw] as [string, string, string, string];
  const outI = [imageLink1, imageLink2, imageLink3, imageLink4] as [string, string, string, string];

  const nonEmptySlots = vTrim.map((vt, i) => (vt.length > 0 ? i : -1)).filter((i) => i >= 0);

  let slot = -1;
  if (st) {
    slot = vTrim.findIndex((vt) => vt.length > 0 && vt === st);
    if (slot < 0) {
      slot = vTrim.findIndex((vt) => vt.length > 0 && (st.startsWith(vt) || vt.startsWith(st)));
    }
  }

  if (slot >= 0) {
    outV[slot] = selectedText;
    outI[slot] = urls.length > 0 ? urls[0]! : '';
    return {
      variant1: outV[0] ?? '',
      variant2: outV[1] ?? '',
      variant3: outV[2] ?? '',
      variant4: outV[3] ?? '',
      imageLink1: outI[0] ?? '',
      imageLink2: outI[1] ?? '',
      imageLink3: outI[2] ?? '',
      imageLink4: outI[3] ?? '',
    };
  }

  if (st && nonEmptySlots.length === 1) {
    const i = nonEmptySlots[0]!;
    outV[i] = selectedText;
    outI[i] = urls.length > 0 ? urls[0]! : '';
  } else if (urls.length > 0) {
    const fi = vTrim.findIndex((vt) => vt.length > 0);
    if (fi >= 0) {
      outI[fi] = urls[0]!;
    }
  }

  return {
    variant1: outV[0] ?? '',
    variant2: outV[1] ?? '',
    variant3: outV[2] ?? '',
    variant4: outV[3] ?? '',
    imageLink1: outI[0] ?? '',
    imageLink2: outI[1] ?? '',
    imageLink3: outI[2] ?? '',
    imageLink4: outI[3] ?? '',
  };
}

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Validates and normalizes `payload.posts` from the client.
 * Supports `variants: string[]` (up to 4) or `variant1`…`variant4`.
 */
export function coerceBulkCampaignPostsFromPayload(payload: Record<string, unknown>): BulkCampaignSheetPostInput[] {
  const raw = payload.posts;
  if (!Array.isArray(raw)) {
    throw new Error('payload.posts must be an array.');
  }
  if (raw.length === 0) {
    throw new Error('At least one post is required.');
  }
  if (raw.length > 500) {
    throw new Error('A maximum of 500 posts per import is allowed.');
  }

  const out: BulkCampaignSheetPostInput[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`posts[${i}] must be an object.`);
    }
    const o = item as Record<string, unknown>;
    const topic = trimStr(o.topic);
    if (!topic) {
      throw new Error(`posts[${i}].topic is required.`);
    }
    const date = trimStr(o.date);
    if (!ISO_DATE_RE.test(date)) {
      throw new Error(`posts[${i}].date must be YYYY-MM-DD.`);
    }

    const key = buildTopicKey(topic, date);
    if (seenKeys.has(key)) {
      throw new Error(`Duplicate topic+date in import: "${topic}" on ${date}.`);
    }
    seenKeys.add(key);

    let v1 = trimStr(o.variant1);
    let v2 = trimStr(o.variant2);
    let v3 = trimStr(o.variant3);
    let v4 = trimStr(o.variant4);
    const variants = o.variants;
    if (Array.isArray(variants)) {
      for (let j = 0; j < 4; j++) {
        const t = trimStr(variants[j]);
        if (j === 0) v1 = t;
        else if (j === 1) v2 = t;
        else if (j === 2) v3 = t;
        else if (j === 3) v4 = t;
      }
    }
    const body = trimStr(o.body);
    if (body && !v1) {
      v1 = body;
    }

    const status = trimStr(o.status) || 'Drafted';
    const postTime = trimStr(o.postTime);
    const topicGenerationRules = trimStr(o.topicGenerationRules);
    const generationTemplateId = trimStr(o.generationTemplateId);
    let selectedText = trimStr(o.selectedText);
    if (!selectedText) {
      selectedText = v1 || v2 || v3 || v4 || '';
    }

    out.push({
      topicId: trimStr(o.topicId) || crypto.randomUUID(),
      topic,
      date,
      status,
      variant1: v1,
      variant2: v2,
      variant3: v3,
      variant4: v4,
      postTime,
      topicGenerationRules,
      generationTemplateId,
      selectedText,
      selectedImageId: trimStr(o.selectedImageId),
      selectedImageUrlsJson: trimStr(o.selectedImageUrlsJson),
    });
  }

  return out;
}

export function padRow(row: string[], width: number): string[] {
  const padded = [...row];
  while (padded.length < width) {
    padded.push('');
  }
  return padded;
}

export class SheetsGateway {
  private env: Env;
  private accessTokenPromise: Promise<string> | null = null;

  constructor(env: Env) {
    this.env = env;
  }

  async getRows(spreadsheetId: string): Promise<SheetRow[]> {
    await this.ensureRequiredSheets(spreadsheetId);

    const dataRanges = [`${TOPICS_SHEET}!A2:C`, `${DRAFT_SHEET}!A2:V`, `${POST_SHEET}!A2:V`];
    const [topicRows, draftRows, postRows] = await this.batchGetValues(spreadsheetId, dataRanges);

    const topics = topicRows
      .map((row, index) => {
        const padded = padRow(row, 3);
        return { rowIndex: index + 2, topic: padded[0], date: padded[1], topicId: padded[2] || '' };
      })
      .filter((row) => row.topic.trim());

    const drafts = draftRows
      .map((row, index) => this.mapDraftOrPostRow(row, index, 'Draft'))
      .filter((row) => row.topic.trim());

    const posts = postRows
      .map((row, index) => this.mapDraftOrPostRow(row, index, 'Post'))
      .filter((row) => row.topic.trim());

    return this.mergeRows(topics, drafts, posts);
  }

  async getRowByTopicDate(spreadsheetId: string, topic: string, date: string): Promise<SheetRow | null> {
    const rows = await this.getRows(spreadsheetId);
    const targetKey = buildTopicKey(topic, date);
    return rows.find((row) => buildTopicKey(row.topic, row.date) === targetKey) || null;
  }

  async addTopic(spreadsheetId: string, topic: string): Promise<{ success: true }> {
    if (!topic) {
      throw new Error('Topic is required.');
    }

    await this.ensureRequiredSheets(spreadsheetId);
    const topicId = crypto.randomUUID();
    await this.appendValues(spreadsheetId, `${TOPICS_SHEET}!A:C`, [[topic, new Date().toISOString().slice(0, 10), topicId]]);
    return { success: true };
  }

  async bulkImportCampaign(
    spreadsheetId: string,
    posts: BulkCampaignSheetPostInput[],
  ): Promise<{ success: true; imported: number }> {
    if (posts.length === 0) {
      throw new Error('At least one post is required.');
    }

    await this.ensureRequiredSheets(spreadsheetId);

    const existing = await this.getRows(spreadsheetId);
    const existingKeys = new Set(existing.map((r) => buildTopicKey(r.topic, r.date)));

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
    const draftValues = posts.map((p) => [
      p.topic,
      p.date,
      p.status || 'Drafted',
      p.variant1,
      p.variant2,
      p.variant3,
      p.variant4,
      '',
      '',
      '',
      '',
      p.selectedText,
      p.selectedImageId,
      p.postTime,
      '',
      '',
      '',
      '',
      p.topicGenerationRules,
      p.selectedImageUrlsJson,
      p.generationTemplateId,
      p.topicId,
    ]);

    await this.appendValues(spreadsheetId, `${TOPICS_SHEET}!A:C`, topicsValues);
    await this.appendValues(spreadsheetId, `${DRAFT_SHEET}!A:V`, draftValues);

    return { success: true, imported: posts.length };
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
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (!draftRowIndex) {
      throw new Error('Draft row not found for this topic.');
    }

    await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!C${draftRowIndex}`, [[status || 'Pending']]);
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
      await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!D${draftRowIndex}:K${draftRowIndex}`, [[
        merged.variant1,
        merged.variant2,
        merged.variant3,
        merged.variant4,
        merged.imageLink1,
        merged.imageLink2,
        merged.imageLink3,
        merged.imageLink4,
      ]]);
      await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!L${draftRowIndex}:R${draftRowIndex}`, [[selectedText, selectedImageId, postTime, emailTo, emailCc, emailBcc, emailSubject]]);
      await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!T${draftRowIndex}`, [[selectedImageUrlsJson]]);
    }

    return { success: true };
  }

  async saveDraftVariants(spreadsheetId: string, row: SheetRow, variants: string[]): Promise<SheetRow> {
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (!draftRowIndex) {
      throw new Error('Draft row not found for this topic.');
    }

    await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!D${draftRowIndex}:G${draftRowIndex}`, [[
      variants[0],
      variants[1],
      variants[2],
      variants[3],
    ]]);

    return {
      ...row,
      variant1: variants[0] ?? '',
      variant2: variants[1] ?? '',
      variant3: variants[2] ?? '',
      variant4: variants[3] ?? '',
    };
  }

  async saveTopicGenerationRules(spreadsheetId: string, row: SheetRow, topicRules: string): Promise<SheetRow> {
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (!draftRowIndex) {
      throw new Error('Draft row not found for this topic.');
    }

    await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!S${draftRowIndex}`, [[topicRules]]);

    return {
      ...row,
      topicGenerationRules: topicRules,
    };
  }

  async saveEmailFields(
    spreadsheetId: string,
    row: SheetRow,
    emailTo: string,
    emailCc: string,
    emailBcc: string,
    emailSubject: string,
  ): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (!draftRowIndex) {
      throw new Error('Draft row not found for this topic.');
    }

    await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!O${draftRowIndex}:R${draftRowIndex}`, [[emailTo, emailCc, emailBcc, emailSubject]]);
    return { success: true };
  }

  async createDraftFromPublished(
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
    await this.ensureRequiredSheets(spreadsheetId);

    const today = new Date().toISOString().slice(0, 10);
    // Generate a new topicId for the re-draft so it gets its own image storage folder.
    const topicId = crypto.randomUUID();

    await this.appendValues(spreadsheetId, `${TOPICS_SHEET}!A:C`, [[sourceRow.topic, today, topicId]]);

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

    await this.appendValues(spreadsheetId, `${DRAFT_SHEET}!A:V`, [[
      sourceRow.topic,
      today,
      'Drafted',
      merged.variant1,
      merged.variant2,
      merged.variant3,
      merged.variant4,
      merged.imageLink1,
      merged.imageLink2,
      merged.imageLink3,
      merged.imageLink4,
      selectedText,
      selectedImageId,
      postTime,
      emailTo,
      emailCc,
      emailBcc,
      emailSubject,
      sourceRow.topicGenerationRules || '',
      selectedImageUrlsJson,
      sourceRow.generationTemplateId || '',
      topicId,
    ]]);

    return { success: true };
  }

  async updatePostSchedule(spreadsheetId: string, row: SheetRow, postTime: string): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (!draftRowIndex) {
      throw new Error('Draft row not found for this topic.');
    }

    await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!N${draftRowIndex}`, [[postTime]]);

    if (row.postRowIndex) {
      await this.updateValues(spreadsheetId, `${POST_SHEET}!N${row.postRowIndex}`, [[postTime]]);
    }

    return { success: true };
  }

  async markRowPublished(spreadsheetId: string, row: SheetRow): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (draftRowIndex) {
      await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!A${draftRowIndex}:V${draftRowIndex}`, [[
        row.topic,
        row.date,
        row.status || 'Published',
        row.variant1,
        row.variant2,
        row.variant3,
        row.variant4,
        row.imageLink1,
        row.imageLink2,
        row.imageLink3,
        row.imageLink4,
        row.selectedText,
        row.selectedImageId,
        row.postTime,
        row.emailTo || '',
        row.emailCc || '',
        row.emailBcc || '',
        row.emailSubject || '',
        row.topicGenerationRules || '',
        row.selectedImageUrlsJson || '',
        row.generationTemplateId || '',
        row.topicId || '',
      ]]);
    }

    const postValues = [[
      row.topic,
      row.date,
      row.status || 'Published',
      row.variant1,
      row.variant2,
      row.variant3,
      row.variant4,
      row.imageLink1,
      row.imageLink2,
      row.imageLink3,
      row.imageLink4,
      row.selectedText,
      row.selectedImageId,
      row.postTime,
      row.emailTo || '',
      row.emailCc || '',
      row.emailBcc || '',
      row.emailSubject || '',
      row.topicGenerationRules || '',
      row.selectedImageUrlsJson || '',
      row.generationTemplateId || '',
      row.topicId || '',
    ]];

    if (row.postRowIndex) {
      await this.updateValues(spreadsheetId, `${POST_SHEET}!A${row.postRowIndex}:V${row.postRowIndex}`, postValues);
    } else {
      await this.appendValues(spreadsheetId, `${POST_SHEET}!A:V`, postValues);
    }

    return { success: true };
  }

  async deleteRow(spreadsheetId: string, row: SheetRow): Promise<{ success: true }> {
    const metadata = await this.ensureRequiredSheets(spreadsheetId);

    const deletions: Array<{ sheetTitle: ManagedSheetName; rowIndex?: number }> = [
      { sheetTitle: POST_SHEET, rowIndex: row.postRowIndex },
      { sheetTitle: DRAFT_SHEET, rowIndex: row.draftRowIndex },
      { sheetTitle: TOPICS_SHEET, rowIndex: row.topicRowIndex },
    ];

    const requests: Array<Record<string, unknown>> = [];
    for (const deletion of deletions) {
      if (!deletion.rowIndex) {
        continue;
      }

      const sheetId = metadata.find((sheet) => sheet.properties?.title === deletion.sheetTitle)?.properties?.sheetId;
      if (sheetId === undefined) {
        continue;
      }

      requests.push({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: deletion.rowIndex - 1,
            endIndex: deletion.rowIndex,
          },
        },
      });
    }

    if (requests.length > 0) {
      await this.batchUpdate(spreadsheetId, { requests });
    }

    return { success: true };
  }

  private mapDraftOrPostRow(row: string[], index: number, sourceSheet: 'Draft' | 'Post'): SheetRow {
    const paddedRow = padRow(row, PIPELINE_COLS);
    return {
      rowIndex: index + 2,
      sourceSheet,
      topicId: paddedRow[21] || undefined,
      topic: paddedRow[0],
      date: paddedRow[1],
      status: paddedRow[2] || 'Pending',
      variant1: paddedRow[3],
      variant2: paddedRow[4],
      variant3: paddedRow[5],
      variant4: paddedRow[6],
      imageLink1: paddedRow[7],
      imageLink2: paddedRow[8],
      imageLink3: paddedRow[9],
      imageLink4: paddedRow[10],
      selectedText: paddedRow[11],
      selectedImageId: paddedRow[12],
      postTime: paddedRow[13],
      emailTo: paddedRow[14],
      emailCc: paddedRow[15],
      emailBcc: paddedRow[16],
      emailSubject: paddedRow[17],
      topicGenerationRules: paddedRow[18],
      selectedImageUrlsJson: paddedRow[19],
      generationTemplateId: paddedRow[20],
      draftRowIndex: sourceSheet === 'Draft' ? index + 2 : undefined,
      postRowIndex: sourceSheet === 'Post' ? index + 2 : undefined,
    };
  }

  private mergeRows(
    topics: Array<{ rowIndex: number; topic: string; date: string; topicId: string }>,
    drafts: SheetRow[],
    posts: SheetRow[],
  ): SheetRow[] {
    const merged = new Map<string, SheetRow>();

    for (const topicRow of topics) {
      merged.set(buildTopicKey(topicRow.topic, topicRow.date), {
        rowIndex: topicRow.rowIndex,
        sourceSheet: 'Topics',
        topicRowIndex: topicRow.rowIndex,
        topicId: topicRow.topicId || undefined,
        topic: topicRow.topic,
        date: topicRow.date,
        status: 'Pending',
        variant1: '',
        variant2: '',
        variant3: '',
        variant4: '',
        imageLink1: '',
        imageLink2: '',
        imageLink3: '',
        imageLink4: '',
        selectedText: '',
        selectedImageId: '',
        postTime: '',
        emailTo: '',
        emailCc: '',
        emailBcc: '',
        emailSubject: '',
        topicGenerationRules: '',
        selectedImageUrlsJson: '',
        generationTemplateId: '',
      });
    }

    for (const draftRow of drafts) {
      const key = buildTopicKey(draftRow.topic, draftRow.date);
      const existing = merged.get(key);
      const topicId = draftRow.topicId || existing?.topicId;
      merged.set(key, {
        ...(existing ?? ({} as SheetRow)),
        ...draftRow,
        topicId,
        sourceSheet: 'Draft',
        rowIndex: draftRow.draftRowIndex ?? draftRow.rowIndex,
        topicRowIndex: existing?.topicRowIndex,
        draftRowIndex: draftRow.draftRowIndex ?? draftRow.rowIndex,
      });
    }

    for (const postRow of posts) {
      const key = buildTopicKey(postRow.topic, postRow.date);
      const existing = merged.get(key);
      // Column S is written on the Draft sheet; Post rows often keep an older copy. Prefer Draft rules
      // whenever a draft exists so clears/edits to topic rules are not overwritten by stale Post data.
      const topicRulesFromDraft =
        existing?.sourceSheet === 'Draft' ? (existing.topicGenerationRules ?? '') : undefined;
      const templateIdFromDraft =
        existing?.sourceSheet === 'Draft' ? (existing.generationTemplateId ?? '') : undefined;
      const topicId = postRow.topicId || existing?.topicId;
      merged.set(key, {
        ...(existing ?? ({} as SheetRow)),
        ...postRow,
        topicId,
        sourceSheet: 'Post',
        rowIndex: postRow.postRowIndex ?? postRow.rowIndex,
        topicRowIndex: existing?.topicRowIndex,
        draftRowIndex: existing?.draftRowIndex,
        postRowIndex: postRow.postRowIndex ?? postRow.rowIndex,
        topicGenerationRules:
          topicRulesFromDraft !== undefined ? topicRulesFromDraft : (postRow.topicGenerationRules ?? ''),
        generationTemplateId:
          templateIdFromDraft !== undefined ? templateIdFromDraft : (postRow.generationTemplateId ?? ''),
      });
    }

    return Array.from(merged.values());
  }

  /** Ensures Topics, Draft, Post, and PostTemplates tabs exist with headers; returns sheet metadata for callers that need sheetId. */
  private async ensureRequiredSheets(spreadsheetId: string): Promise<SpreadsheetSheetMetadata[]> {
    const managedSheets = [TOPICS_SHEET, DRAFT_SHEET, POST_SHEET, POST_TEMPLATES_SHEET, NEWS_RESEARCH_SHEET] as const;
    let metadata = await this.getSpreadsheetMetadata(spreadsheetId);
    const titles = new Set(metadata.map((sheet) => sheet.properties?.title).filter(Boolean));

    const toAdd = managedSheets.filter((name) => !titles.has(name));
    if (toAdd.length > 0) {
      await this.batchUpdate(spreadsheetId, {
        requests: toAdd.map((title) => ({
          addSheet: {
            properties: { title },
          },
        })),
      });
      metadata = await this.getSpreadsheetMetadata(spreadsheetId);
    }

    const headerRanges = [
      `${TOPICS_SHEET}!A1`,
      `${DRAFT_SHEET}!A1`,
      `${POST_SHEET}!A1`,
      `${POST_TEMPLATES_SHEET}!A1`,
      `${NEWS_RESEARCH_SHEET}!A1`,
    ];
    const headerRows = await this.batchGetValues(spreadsheetId, headerRanges);

    const headerSpecs: Array<{ sheet: string; headers: string[] }> = [
      { sheet: TOPICS_SHEET, headers: TOPICS_HEADERS },
      { sheet: DRAFT_SHEET, headers: PIPELINE_HEADERS },
      { sheet: POST_SHEET, headers: PIPELINE_HEADERS },
      { sheet: POST_TEMPLATES_SHEET, headers: POST_TEMPLATES_HEADERS },
      { sheet: NEWS_RESEARCH_SHEET, headers: NEWS_RESEARCH_HEADERS },
    ];

    for (let i = 0; i < headerSpecs.length; i++) {
      const rows = headerRows[i];
      if (!rows?.length) {
        await this.updateValues(spreadsheetId, `${headerSpecs[i].sheet}!A1`, [headerSpecs[i].headers]);
      }
    }

    for (const sheet of [DRAFT_SHEET, POST_SHEET] as const) {
      const [tCell] = await this.batchGetValues(spreadsheetId, [`${sheet}!T1:T1`]);
      if (!String(tCell?.[0]?.[0] || '').trim()) {
        await this.updateValues(spreadsheetId, `${sheet}!T1`, [['Image URLs JSON']]);
      }
      const [uCell] = await this.batchGetValues(spreadsheetId, [`${sheet}!U1:U1`]);
      if (!String(uCell?.[0]?.[0] || '').trim()) {
        await this.updateValues(spreadsheetId, `${sheet}!U1`, [['Generation template id']]);
      }
      const [vCell] = await this.batchGetValues(spreadsheetId, [`${sheet}!V1:V1`]);
      if (!String(vCell?.[0]?.[0] || '').trim()) {
        await this.updateValues(spreadsheetId, `${sheet}!V1`, [['Topic Id']]);
      }
    }
    // Ensure Topics sheet has the Topic Id column (column C).
    const [topicsIdCell] = await this.batchGetValues(spreadsheetId, [`${TOPICS_SHEET}!C1:C1`]);
    if (!String(topicsIdCell?.[0]?.[0] || '').trim()) {
      await this.updateValues(spreadsheetId, `${TOPICS_SHEET}!C1`, [['Topic Id']]);
    }

    return metadata;
  }

  async listPostTemplates(spreadsheetId: string): Promise<PostTemplate[]> {
    await this.ensureRequiredSheets(spreadsheetId);
    const [rows] = await this.batchGetValues(spreadsheetId, [`${POST_TEMPLATES_SHEET}!A2:C`]);
    const out: PostTemplate[] = [];
    for (const row of rows || []) {
      const padded = padRow(row, 3);
      const id = String(padded[0] || '').trim();
      if (!id) continue;
      out.push({
        id,
        name: String(padded[1] || '').trim(),
        rules: String(padded[2] || ''),
      });
    }
    return out;
  }

  async getPostTemplateRulesById(spreadsheetId: string, templateId: string): Promise<string | null> {
    const id = String(templateId || '').trim();
    if (!id) return null;
    const templates = await this.listPostTemplates(spreadsheetId);
    const found = templates.find((t) => t.id === id);
    return found ? found.rules : null;
  }

  async createPostTemplate(spreadsheetId: string, name: string, rules: string): Promise<PostTemplate> {
    await this.ensureRequiredSheets(spreadsheetId);
    const id = crypto.randomUUID();
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      throw new Error('Template name is required.');
    }
    await this.appendValues(spreadsheetId, `${POST_TEMPLATES_SHEET}!A:C`, [[id, trimmedName, String(rules || '')]]);
    return { id, name: trimmedName, rules: String(rules || '') };
  }

  async updatePostTemplate(spreadsheetId: string, templateId: string, name: string, rules: string): Promise<PostTemplate> {
    await this.ensureRequiredSheets(spreadsheetId);
    const id = String(templateId || '').trim();
    if (!id) {
      throw new Error('Template id is required.');
    }
    const rowIndex = await this.findPostTemplateSheetRowIndex(spreadsheetId, id);
    if (rowIndex === null) {
      throw new Error('Template not found.');
    }
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      throw new Error('Template name is required.');
    }
    const body = String(rules || '');
    await this.updateValues(spreadsheetId, `${POST_TEMPLATES_SHEET}!A${rowIndex}:C${rowIndex}`, [[id, trimmedName, body]]);
    return { id, name: trimmedName, rules: body };
  }

  async deletePostTemplate(spreadsheetId: string, templateId: string): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);
    const id = String(templateId || '').trim();
    if (!id) {
      throw new Error('Template id is required.');
    }
    const rowIndex = await this.findPostTemplateSheetRowIndex(spreadsheetId, id);
    if (rowIndex === null) {
      throw new Error('Template not found.');
    }
    const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
    const sheetId = metadata.find((s) => s.properties?.title === POST_TEMPLATES_SHEET)?.properties?.sheetId;
    if (sheetId === undefined) {
      throw new Error('PostTemplates sheet not found.');
    }
    await this.batchUpdate(spreadsheetId, {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    });
    return { success: true };
  }

  async saveGenerationTemplateId(spreadsheetId: string, row: SheetRow, generationTemplateId: string): Promise<SheetRow> {
    await this.ensureRequiredSheets(spreadsheetId);
    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (!draftRowIndex) {
      throw new Error('Draft row not found for this topic.');
    }
    const value = String(generationTemplateId || '').trim();
    await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!U${draftRowIndex}`, [[value]]);
    return {
      ...row,
      generationTemplateId: value,
    };
  }

  private async findPostTemplateSheetRowIndex(spreadsheetId: string, templateId: string): Promise<number | null> {
    const [rows] = await this.batchGetValues(spreadsheetId, [`${POST_TEMPLATES_SHEET}!A2:A`]);
    if (!rows?.length) return null;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i]?.[0] || '').trim() === templateId) {
        return i + 2;
      }
    }
    return null;
  }


  async appendNewsResearchSnapshot(
    spreadsheetId: string,
    row: {
      topicKey: string;
      fetchedAt: string;
      windowStart: string;
      windowEnd: string;
      customQuery: string;
      providersSummary: string;
      articlesJson: string;
      dedupeRemoved: string;
    },
  ): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);
    await this.appendValues(spreadsheetId, `${NEWS_RESEARCH_SHEET}!A:H`, [[
      row.topicKey,
      row.fetchedAt,
      row.windowStart,
      row.windowEnd,
      row.customQuery,
      row.providersSummary,
      row.articlesJson,
      row.dedupeRemoved,
    ]]);
    return { success: true };
  }

  private async getSpreadsheetMetadata(spreadsheetId: string): Promise<SpreadsheetSheetMetadata[]> {
    const response = await this.fetchGoogleJson<SpreadsheetMetadataResponse>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
    );

    return response.sheets || [];
  }

  private async batchGetValues(spreadsheetId: string, ranges: string[]): Promise<string[][][]> {
    const params = new URLSearchParams();
    for (const range of ranges) {
      params.append('ranges', range);
    }
    const response = await this.fetchGoogleJson<{ valueRanges?: Array<{ values?: string[][] }> }>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params.toString()}`,
    );
    const valueRanges = response.valueRanges || [];
    return ranges.map((_, i) => valueRanges[i]?.values ?? []);
  }

  private async updateValues(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    await this.fetchGoogleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values }),
      },
    );
  }

  private async appendValues(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    await this.fetchGoogleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({ values }),
      },
    );
  }

  private async batchUpdate(spreadsheetId: string, body: Record<string, unknown>): Promise<void> {
    await this.fetchGoogleJson(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async fetchGoogleJson<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Google Sheets request failed: ${message || response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json<T>();
  }

  private async getAccessToken(): Promise<string> {
    if (!this.accessTokenPromise) {
      this.accessTokenPromise = mintGoogleAccessToken(this.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    }

    return this.accessTokenPromise;
  }
}
