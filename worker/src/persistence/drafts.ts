import type { Env } from '../index';
import { mintGoogleAccessToken } from '../index';
import type { ManagedSheetName, SheetRow } from '../generation/types';

const TOPICS_SHEET = 'Topics';
const DRAFT_SHEET = 'Draft';
const POST_SHEET = 'Post';
const TOPICS_HEADERS = ['Topic', 'Date'];
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
];

const PIPELINE_COLS = 19;

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

    const dataRanges = [`${TOPICS_SHEET}!A2:B`, `${DRAFT_SHEET}!A2:S`, `${POST_SHEET}!A2:S`];
    const [topicRows, draftRows, postRows] = await this.batchGetValues(spreadsheetId, dataRanges);

    const topics = topicRows
      .map((row, index) => {
        const [topic = '', date = ''] = padRow(row, 2);
        return { rowIndex: index + 2, topic, date };
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
    await this.appendValues(spreadsheetId, `${TOPICS_SHEET}!A:B`, [[topic, new Date().toISOString().slice(0, 10)]]);
    return { success: true };
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
  ): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);

    const draftRowIndex = row.draftRowIndex ?? row.rowIndex;
    if (!draftRowIndex) {
      throw new Error('Draft row not found for this topic.');
    }

    await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!C${draftRowIndex}`, [[status || 'Pending']]);
    if (status === 'Approved') {
      await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!L${draftRowIndex}:R${draftRowIndex}`, [[selectedText, selectedImageId, postTime, emailTo, emailCc, emailBcc, emailSubject]]);
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
  ): Promise<{ success: true }> {
    await this.ensureRequiredSheets(spreadsheetId);

    const today = new Date().toISOString().slice(0, 10);

    await this.appendValues(spreadsheetId, `${TOPICS_SHEET}!A:B`, [[sourceRow.topic, today]]);

    await this.appendValues(spreadsheetId, `${DRAFT_SHEET}!A:S`, [[
      sourceRow.topic,
      today,
      'Drafted',
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
      postTime,
      emailTo,
      emailCc,
      emailBcc,
      emailSubject,
      sourceRow.topicGenerationRules || '',
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
      await this.updateValues(spreadsheetId, `${DRAFT_SHEET}!A${draftRowIndex}:S${draftRowIndex}`, [[
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
    ]];

    if (row.postRowIndex) {
      await this.updateValues(spreadsheetId, `${POST_SHEET}!A${row.postRowIndex}:S${row.postRowIndex}`, postValues);
    } else {
      await this.appendValues(spreadsheetId, `${POST_SHEET}!A:S`, postValues);
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
      draftRowIndex: sourceSheet === 'Draft' ? index + 2 : undefined,
      postRowIndex: sourceSheet === 'Post' ? index + 2 : undefined,
    };
  }

  private mergeRows(
    topics: Array<{ rowIndex: number; topic: string; date: string }>,
    drafts: SheetRow[],
    posts: SheetRow[],
  ): SheetRow[] {
    const merged = new Map<string, SheetRow>();

    for (const topicRow of topics) {
      merged.set(buildTopicKey(topicRow.topic, topicRow.date), {
        rowIndex: topicRow.rowIndex,
        sourceSheet: 'Topics',
        topicRowIndex: topicRow.rowIndex,
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
      });
    }

    for (const draftRow of drafts) {
      const key = buildTopicKey(draftRow.topic, draftRow.date);
      const existing = merged.get(key);
      merged.set(key, {
        ...(existing ?? ({} as SheetRow)),
        ...draftRow,
        sourceSheet: 'Draft',
        rowIndex: draftRow.draftRowIndex ?? draftRow.rowIndex,
        topicRowIndex: existing?.topicRowIndex,
        draftRowIndex: draftRow.draftRowIndex ?? draftRow.rowIndex,
      });
    }

    for (const postRow of posts) {
      const key = buildTopicKey(postRow.topic, postRow.date);
      const existing = merged.get(key);
      merged.set(key, {
        ...(existing ?? ({} as SheetRow)),
        ...postRow,
        sourceSheet: 'Post',
        rowIndex: postRow.postRowIndex ?? postRow.rowIndex,
        topicRowIndex: existing?.topicRowIndex,
        draftRowIndex: existing?.draftRowIndex,
        postRowIndex: postRow.postRowIndex ?? postRow.rowIndex,
      });
    }

    return Array.from(merged.values());
  }

  /** Ensures Topics, Draft, and Post tabs exist with headers; returns sheet metadata for callers that need sheetId. */
  private async ensureRequiredSheets(spreadsheetId: string): Promise<SpreadsheetSheetMetadata[]> {
    const managed: ManagedSheetName[] = [TOPICS_SHEET, DRAFT_SHEET, POST_SHEET];
    let metadata = await this.getSpreadsheetMetadata(spreadsheetId);
    const titles = new Set(metadata.map((sheet) => sheet.properties?.title).filter(Boolean));

    const toAdd = managed.filter((name) => !titles.has(name));
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

    const headerRanges = [`${TOPICS_SHEET}!A1`, `${DRAFT_SHEET}!A1`, `${POST_SHEET}!A1`];
    const headerRows = await this.batchGetValues(spreadsheetId, headerRanges);

    const headerSpecs: Array<{ sheet: ManagedSheetName; headers: string[] }> = [
      { sheet: TOPICS_SHEET, headers: TOPICS_HEADERS },
      { sheet: DRAFT_SHEET, headers: PIPELINE_HEADERS },
      { sheet: POST_SHEET, headers: PIPELINE_HEADERS },
    ];

    for (let i = 0; i < headerSpecs.length; i++) {
      const rows = headerRows[i];
      if (!rows?.length) {
        await this.updateValues(spreadsheetId, `${headerSpecs[i].sheet}!A1`, [headerSpecs[i].headers]);
      }
    }

    return metadata;
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
