import type { Env } from '../index';
import { mintGoogleAccessToken } from '../index';
import type { ManagedSheetName, PostTemplate, SheetRow } from '../generation/types';
import { parseRowImageUrls } from '../media/selectedImageUrls';
import type { TopicSheetEntry } from './pipeline-db/mappers';

const TOPICS_SHEET = 'Topics';
const DRAFT_SHEET = 'Draft';
const POST_SHEET = 'Post';
const POST_TEMPLATES_SHEET = 'PostTemplates';
const TOPICS_HEADERS = ['Topic', 'Date', 'Topic Id'];
const POST_TEMPLATES_HEADERS = ['Template id', 'Name', 'Rules'];
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
export function mergePipelineVariantsWithSelection(
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
  const seenTopicIds = new Set<string>();

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

    const topicId = trimStr(o.topicId);
    if (!topicId) {
      throw new Error(`posts[${i}].topicId is required.`);
    }
    if (seenTopicIds.has(topicId)) {
      throw new Error(`Duplicate topicId in import: ${topicId}.`);
    }
    seenTopicIds.add(topicId);

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
      topicId,
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

  /** Ensures Topics, Draft, Post, PostTemplates exist (headers only for pipeline tabs). */
  async ensurePipelineSheets(spreadsheetId: string): Promise<SpreadsheetSheetMetadata[]> {
    return this.ensureRequiredSheets(spreadsheetId);
  }

  async getTopicsInOrder(spreadsheetId: string): Promise<TopicSheetEntry[]> {
    await this.ensureRequiredSheets(spreadsheetId);
    const [topicRows] = await this.batchGetValues(spreadsheetId, [`${TOPICS_SHEET}!A2:C`]);
    const entries = (topicRows || [])
      .map((row, index) => {
        const padded = padRow(row, 3);
        return { rowIndex: index + 2, topic: padded[0], date: padded[1], topicId: padded[2] || '' };
      })
      .filter((row) => row.topic.trim());

    // Backfill any rows that are missing a Topic Id in column C.
    const missing = entries.filter((e) => !e.topicId.trim());
    if (missing.length > 0) {
      await Promise.all(
        missing.map((e) => {
          e.topicId = crypto.randomUUID();
          return this.updateValues(spreadsheetId, `${TOPICS_SHEET}!C${e.rowIndex}`, [[e.topicId]]);
        }),
      );
    }

    return entries;
  }

  /**
   * Legacy Draft/Post rows (topic+date in A:B) so deleteRow can still remove old sheet lines
   * after pipeline data moved to D1.
   */
  async getLegacyDraftPostRowIndices(
    spreadsheetId: string,
  ): Promise<Map<string, { draftRowIndex?: number; postRowIndex?: number }>> {
    await this.ensureRequiredSheets(spreadsheetId);
    const [draftPairs, postPairs] = await this.batchGetValues(spreadsheetId, [
      `${DRAFT_SHEET}!A2:B`,
      `${POST_SHEET}!A2:B`,
    ]);
    const map = new Map<string, { draftRowIndex?: number; postRowIndex?: number }>();

    (draftPairs || []).forEach((row, index) => {
      const padded = padRow(row, 2);
      const topic = String(padded[0] || '').trim();
      const date = String(padded[1] || '').trim();
      if (!topic) return;
      const key = buildTopicKey(topic, date);
      const cur = map.get(key) || {};
      cur.draftRowIndex = index + 2;
      map.set(key, cur);
    });

    (postPairs || []).forEach((row, index) => {
      const padded = padRow(row, 2);
      const topic = String(padded[0] || '').trim();
      const date = String(padded[1] || '').trim();
      if (!topic) return;
      const key = buildTopicKey(topic, date);
      const cur = map.get(key) || {};
      cur.postRowIndex = index + 2;
      map.set(key, cur);
    });

    return map;
  }

  async appendTopicRows(spreadsheetId: string, values: string[][]): Promise<void> {
    if (values.length === 0) {
      return;
    }
    await this.ensureRequiredSheets(spreadsheetId);
    await this.appendValues(spreadsheetId, `${TOPICS_SHEET}!A:C`, values);
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

  /** Ensures Topics, Draft, Post, and PostTemplates tabs exist (pipeline columns unused — data is in D1). */
  private async ensureRequiredSheets(spreadsheetId: string): Promise<SpreadsheetSheetMetadata[]> {
    const managedSheets = [TOPICS_SHEET, DRAFT_SHEET, POST_SHEET, POST_TEMPLATES_SHEET] as const;
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
    ];
    const headerRows = await this.batchGetValues(spreadsheetId, headerRanges);

    const headerSpecs: Array<{ sheet: string; headers: string[] }> = [
      { sheet: TOPICS_SHEET, headers: TOPICS_HEADERS },
      { sheet: DRAFT_SHEET, headers: PIPELINE_HEADERS },
      { sheet: POST_SHEET, headers: PIPELINE_HEADERS },
      { sheet: POST_TEMPLATES_SHEET, headers: POST_TEMPLATES_HEADERS },
    ];

    for (let i = 0; i < headerSpecs.length; i++) {
      const rows = headerRows[i];
      if (!rows?.length) {
        await this.updateValues(spreadsheetId, `${headerSpecs[i].sheet}!A1`, [headerSpecs[i].headers]);
      }
    }

    // One read for Draft/Post T–V row-1 headers and Topics C1 (was 7 sequential batchGets).
    const [draftTuv, postTuv, topicsIdCell] = await this.batchGetValues(spreadsheetId, [
      `${DRAFT_SHEET}!T1:V1`,
      `${POST_SHEET}!T1:V1`,
      `${TOPICS_SHEET}!C1:C1`,
    ]);
    const ensurePipelineExtraHeaders = async (sheet: string, row: string[][] | undefined) => {
      const t = String(row?.[0]?.[0] || '').trim();
      const u = String(row?.[0]?.[1] || '').trim();
      const v = String(row?.[0]?.[2] || '').trim();
      if (!t) await this.updateValues(spreadsheetId, `${sheet}!T1`, [['Image URLs JSON']]);
      if (!u) await this.updateValues(spreadsheetId, `${sheet}!U1`, [['Generation template id']]);
      if (!v) await this.updateValues(spreadsheetId, `${sheet}!V1`, [['Topic Id']]);
    };
    await ensurePipelineExtraHeaders(DRAFT_SHEET, draftTuv);
    await ensurePipelineExtraHeaders(POST_SHEET, postTuv);
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
