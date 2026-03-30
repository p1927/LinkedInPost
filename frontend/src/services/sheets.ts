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
  /** Column T — JSON array of image URLs when multiple; omit or empty for a single image. */
  selectedImageUrlsJson?: string;
  postTime: string;        // N
  emailTo?: string;        // O
  emailCc?: string;        // P
  emailBcc?: string;       // Q
  emailSubject?: string;   // R
  /** Column S — non-empty replaces workspace global rules for LLM on this topic. */
  topicGenerationRules?: string;
}