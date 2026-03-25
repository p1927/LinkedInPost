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