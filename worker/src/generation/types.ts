export type ManagedSheetName = 'Topics' | 'Draft' | 'Post';

export interface SheetRow {
  rowIndex: number;
  sourceSheet: ManagedSheetName;
  topicRowIndex?: number;
  draftRowIndex?: number;
  postRowIndex?: number;
  topic: string;
  date: string;
  status: string;
  variant1: string;
  variant2: string;
  variant3: string;
  variant4: string;
  imageLink1: string;
  imageLink2: string;
  imageLink3: string;
  imageLink4: string;
  selectedText: string;
  selectedImageId: string;
  /** Column T — JSON array of all selected image URLs when more than one; empty when single image (legacy: column M only). */
  selectedImageUrlsJson?: string;
  postTime: string;
  emailTo?: string;
  emailCc?: string;
  emailBcc?: string;
  emailSubject?: string;
  /** Column S — when non-empty, replaces workspace global generation rules for this topic. */
  topicGenerationRules?: string;
  /** Column U — optional PostTemplates sheet row id; used when column S is empty. */
  generationTemplateId?: string;
}

export interface PostTemplate {
  id: string;
  name: string;
  rules: string;
}

export type GenerationScope = 'selection' | 'whole-post';

export interface TextSelectionRange {
  start: number;
  end: number;
  text: string;
}

export interface ResearchArticleRef {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  snippet: string;
}

export interface GenerationRequestPayload {
  row: SheetRow;
  editorText: string;
  scope?: GenerationScope;
  selection?: TextSelectionRange | null;
  instruction?: string;
  googleModel?: string;
  /** Optional news context from researcher (snippets + URLs). */
  researchArticles?: ResearchArticleRef[];
}

export interface QuickChangePreviewResult {
  scope: GenerationScope;
  model: string;
  selection: TextSelectionRange | null;
  replacementText: string;
  fullText: string;
}

export interface VariantPreviewResult {
  id: string;
  label: string;
  replacementText: string;
  fullText: string;
}

export interface VariantsPreviewResponse {
  scope: GenerationScope;
  model: string;
  selection: TextSelectionRange | null;
  variants: VariantPreviewResult[];
}

export interface GeminiModelsResponse {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
}

export interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}
