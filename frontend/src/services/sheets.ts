export interface SheetRow {
  rowIndex: number;
  sourceSheet: 'Topics' | 'Draft' | 'Post';
  topicRowIndex?: number;
  draftRowIndex?: number;
  postRowIndex?: number;
  /** Stable UUID (Topics column C / D1). Required for routes, images, and pipeline identity. */
  topicId: string;
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
  /** Column U — optional id of a row in the PostTemplates sheet. */
  generationTemplateId?: string;
  /** When the row was marked published (worker / D1). */
  publishedAt?: string;
}