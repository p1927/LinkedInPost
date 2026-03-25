import axios from 'axios';

export interface SheetRow {
  rowIndex: number;
  sourceSheet: 'Topics' | 'Draft' | 'Post';
  topicRowIndex?: number;
  draftRowIndex?: number;
  postRowIndex?: number;
  topic: string;           // A
  date: string;            // B
  status: string;          // C
  variant1: string;        // D
  variant2: string;        // E
  variant3: string;        // F
  variant4: string;        // G
  imageLink1: string;      // H
  imageLink2: string;      // I
  imageLink3: string;      // J
  imageLink4: string;      // K
  selectedText: string;    // L
  selectedImageId: string; // M
  postTime: string;        // N
}

const TOPICS_SHEET = 'Topics';
const DRAFT_SHEET = 'Draft';
const POST_SHEET = 'Post';
type ManagedSheetName = typeof TOPICS_SHEET | typeof DRAFT_SHEET | typeof POST_SHEET;
const TOPICS_HEADERS = ['Topic', 'Date'];
const PIPELINE_HEADERS = [
  'Topic', 'Date', 'Status',
  'Variant 1', 'Variant 2', 'Variant 3', 'Variant 4',
  'Image Link 1', 'Image Link 2', 'Image Link 3', 'Image Link 4',
  'Selected Text', 'Selected Image ID', 'Post Time',
];

interface TopicSheetRow {
  rowIndex: number;
  topic: string;
  date: string;
}

export class SheetsService {
  private token: string;
  private spreadsheetId: string;

  constructor(token: string, spreadsheetId: string) {
    this.token = token;
    this.spreadsheetId = spreadsheetId;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private buildTopicKey(topic: string, date: string): string {
    return `${topic.trim()}::${date.trim()}`;
  }

  private padRow(row: string[], width: number): string[] {
    const padded = [...row];
    while (padded.length < width) padded.push('');
    return padded;
  }

  private async getSpreadsheetMetadata() {
    const response = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}`,
      {
        params: { fields: 'sheets.properties(sheetId,title)' },
        headers: this.headers,
      }
    );

    return response.data.sheets as Array<{ properties?: { sheetId?: number; title?: string } }>;
  }

  private async ensureSheetExists(sheetTitle: string, headers: string[]): Promise<void> {
    const sheets = await this.getSpreadsheetMetadata();
    const existingTitles = new Set(sheets.map(sheet => sheet.properties?.title).filter(Boolean));

    if (!existingTitles.has(sheetTitle)) {
      await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate`,
        {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                },
              },
            },
          ],
        },
        { headers: this.headers }
      );
    }

    const headerResponse = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(`${sheetTitle}!A1`)}`,
      { headers: this.headers }
    );

    if (!(headerResponse.data.values || []).length) {
      await axios.put(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(`${sheetTitle}!A1`)}?valueInputOption=RAW`,
        {
          values: [headers],
        },
        { headers: this.headers }
      );
    }
  }

  private async ensureRequiredSheets(): Promise<void> {
    await this.ensureSheetExists(TOPICS_SHEET, TOPICS_HEADERS);
    await this.ensureSheetExists(DRAFT_SHEET, PIPELINE_HEADERS);
    await this.ensureSheetExists(POST_SHEET, PIPELINE_HEADERS);
  }

  private async getValues(range: string): Promise<string[][]> {
    const response = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}`,
      { headers: this.headers }
    );

    return response.data.values || [];
  }

  private mapDraftOrPostRow(row: string[], index: number, sourceSheet: 'Draft' | 'Post'): SheetRow {
    const paddedRow = this.padRow(row, 14);

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
      draftRowIndex: sourceSheet === 'Draft' ? index + 2 : undefined,
      postRowIndex: sourceSheet === 'Post' ? index + 2 : undefined,
    };
  }

  private mergeRows(topics: TopicSheetRow[], drafts: SheetRow[], posts: SheetRow[]): SheetRow[] {
    const merged = new Map<string, SheetRow>();

    for (const topicRow of topics) {
      merged.set(this.buildTopicKey(topicRow.topic, topicRow.date), {
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
      });
    }

    for (const draftRow of drafts) {
      const key = this.buildTopicKey(draftRow.topic, draftRow.date);
      const existing = merged.get(key);
      merged.set(key, {
        ...(existing ?? {} as SheetRow),
        ...draftRow,
        sourceSheet: 'Draft',
        rowIndex: draftRow.draftRowIndex ?? draftRow.rowIndex,
        topicRowIndex: existing?.topicRowIndex,
        draftRowIndex: draftRow.draftRowIndex ?? draftRow.rowIndex,
      });
    }

    for (const postRow of posts) {
      const key = this.buildTopicKey(postRow.topic, postRow.date);
      const existing = merged.get(key);
      merged.set(key, {
        ...(existing ?? {} as SheetRow),
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

  private async getSheetNumericId(sheetTitle: ManagedSheetName): Promise<number> {
    const sheets = await this.getSpreadsheetMetadata();
    const matchingSheet = sheets.find(sheet => sheet.properties?.title === sheetTitle) ?? sheets[0];
    const sheetId = matchingSheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error('Unable to resolve Google Sheet tab ID.');
    }

    return sheetId;
  }

  async getRows(): Promise<SheetRow[]> {
    try {
      await this.ensureRequiredSheets();

      const [topicRows, draftRows, postRows] = await Promise.all([
        this.getValues(`${TOPICS_SHEET}!A2:B`),
        this.getValues(`${DRAFT_SHEET}!A2:N`),
        this.getValues(`${POST_SHEET}!A2:N`),
      ]);

      const topics = topicRows
        .map((row: string[], index: number) => {
          const [topic = '', date = ''] = this.padRow(row, 2);
          return {
            rowIndex: index + 2,
            topic,
            date,
          };
        })
        .filter(row => row.topic.trim());

      const drafts = draftRows
        .map((row: string[], index: number) => this.mapDraftOrPostRow(row, index, 'Draft'))
        .filter(row => row.topic.trim());

      const posts = postRows
        .map((row: string[], index: number) => this.mapDraftOrPostRow(row, index, 'Post'))
        .filter(row => row.topic.trim());

      return this.mergeRows(topics, drafts, posts);
    } catch (error) {
      console.error('Error fetching sheet rows:', error);
      throw error;
    }
  }

  async addTopic(topic: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await this.ensureRequiredSheets();
      await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(`${TOPICS_SHEET}!A:B:append`)}?valueInputOption=USER_ENTERED`,
        {
          values: [[topic, today]]
        },
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Error adding topic:', error);
      throw error;
    }
  }

  async updateRowStatus(row: SheetRow, status: string, selectedText: string = '', selectedImageId: string = '', postTime: string = ''): Promise<void> {
    try {
      await this.ensureRequiredSheets();
      const draftRowIndex = row.draftRowIndex ?? row.rowIndex;

      if (!draftRowIndex) {
        throw new Error('Draft row not found for this topic.');
      }

      // First update the status (column C)
      await axios.put(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(`${DRAFT_SHEET}!C${draftRowIndex}`)}?valueInputOption=USER_ENTERED`,
        {
          values: [[status]]
        },
        { headers: this.headers }
      );

      // If we're approving, also update L, M, N
      if (status === 'Approved' && (selectedText || selectedImageId || postTime)) {
        await axios.put(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(`${DRAFT_SHEET}!L${draftRowIndex}:N${draftRowIndex}`)}?valueInputOption=USER_ENTERED`,
          {
            values: [[selectedText, selectedImageId, postTime]]
          },
          { headers: this.headers }
        );
      }
    } catch (error) {
      console.error('Error updating row status:', error);
      throw error;
    }
  }

  async deleteRow(row: SheetRow): Promise<void> {
    try {
      await this.ensureRequiredSheets();

      const deletions = [
        { sheetTitle: TOPICS_SHEET as ManagedSheetName, rowIndex: row.topicRowIndex },
        { sheetTitle: DRAFT_SHEET as ManagedSheetName, rowIndex: row.draftRowIndex },
        { sheetTitle: POST_SHEET as ManagedSheetName, rowIndex: row.postRowIndex },
      ].filter((entry): entry is { sheetTitle: ManagedSheetName; rowIndex: number } => entry.rowIndex !== undefined);

      for (const deletion of deletions) {
        const sheetId = await this.getSheetNumericId(deletion.sheetTitle);
        await axios.post(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate`,
          {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex: (deletion.rowIndex as number) - 1,
                    endIndex: deletion.rowIndex,
                  },
                },
              },
            ],
          },
          { headers: this.headers }
        );
      }
    } catch (error) {
      console.error('Error deleting row:', error);
      throw error;
    }
  }
}