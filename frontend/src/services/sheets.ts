import axios from 'axios';

export interface SheetRow {
  rowIndex: number;
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

  async getRows(): Promise<SheetRow[]> {
    try {
      const response = await axios.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Sheet1!A2:N`,
        { headers: this.headers }
      );

      const rows = response.data.values || [];
      
      return rows.map((row: string[], index: number) => {
        // Pad array if it's short
        const paddedRow = [...row];
        while (paddedRow.length < 14) paddedRow.push('');

        return {
          rowIndex: index + 2, // +2 because 0-indexed and A2 start
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
        };
      });
    } catch (error) {
      console.error('Error fetching sheet rows:', error);
      throw error;
    }
  }

  async addTopic(topic: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Sheet1!A:C:append?valueInputOption=USER_ENTERED`,
        {
          values: [[topic, today, 'Pending']]
        },
        { headers: this.headers }
      );
    } catch (error) {
      console.error('Error adding topic:', error);
      throw error;
    }
  }

  async updateRowStatus(rowIndex: number, status: string, selectedText: string = '', selectedImageId: string = '', postTime: string = ''): Promise<void> {
    try {
      // First update the status (column C)
      await axios.put(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Sheet1!C${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          values: [[status]]
        },
        { headers: this.headers }
      );

      // If we're approving, also update L, M, N
      if (status === 'Approved' && (selectedText || selectedImageId || postTime)) {
        await axios.put(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Sheet1!L${rowIndex}:N${rowIndex}?valueInputOption=USER_ENTERED`,
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
}