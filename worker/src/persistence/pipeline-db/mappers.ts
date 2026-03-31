import type { SheetRow } from '../../generation/types';
import type { PipelineStateDbRow } from './types';

/** Must match `GOOGLE_PIPELINE_SHEET_WIDTH` / PIPELINE_HEADERS width (A–X) in `drafts.ts`. */
const GOOGLE_PIPELINE_ROW_COL_COUNT = 24;

function padGooglePipelineRow(row: unknown[], width: number): string[] {
  const padded = row.map((c) => (typeof c === 'string' ? c : String(c ?? '')));
  while (padded.length < width) {
    padded.push('');
  }
  return padded;
}

/**
 * Parses a Google Draft/Post row (PIPELINE_HEADERS, A–X) into pipeline fields.
 * `topicId` always comes from the Topics sheet (column C), not column V on the row.
 */
export function pipelineFieldsFromGooglePipelineRow(
  values: string[],
  topicId: string,
  topicFallback: string,
  dateFallback: string,
): Omit<SheetRow, 'rowIndex' | 'sourceSheet' | 'topicRowIndex'> | null {
  const p = padGooglePipelineRow(values, GOOGLE_PIPELINE_ROW_COL_COUNT);
  const topicCol = String(p[0] || '').trim();
  if (!topicCol) {
    return null;
  }
  const status = String(p[2] || '').trim();
  const variants = [p[3], p[4], p[5], p[6]].map((s) => String(s || '').trim());
  const hasContent =
    Boolean(status) ||
    variants.some(Boolean) ||
    String(p[11] || '').trim().length > 0;
  if (!hasContent) {
    return null;
  }

  const id = String(topicId || '').trim();
  if (!id) {
    return null;
  }

  return {
    topicId: id,
    topic: topicCol || topicFallback,
    date: String(p[1] || '').trim() || dateFallback,
    status: status || 'Pending',
    variant1: p[3] ?? '',
    variant2: p[4] ?? '',
    variant3: p[5] ?? '',
    variant4: p[6] ?? '',
    imageLink1: p[7] ?? '',
    imageLink2: p[8] ?? '',
    imageLink3: p[9] ?? '',
    imageLink4: p[10] ?? '',
    selectedText: p[11] ?? '',
    selectedImageId: p[12] ?? '',
    postTime: p[13] ?? '',
    emailTo: p[14] ?? '',
    emailCc: p[15] ?? '',
    emailBcc: p[16] ?? '',
    emailSubject: p[17] ?? '',
    topicGenerationRules: p[18] ?? '',
    selectedImageUrlsJson: p[19] ?? '',
    generationTemplateId: p[20] ?? '',
    publishedAt: undefined,
    topicDeliveryChannel: p[22] ?? '',
    topicGenerationModel: p[23] ?? '',
  };
}

export interface TopicSheetEntry {
  rowIndex: number;
  topic: string;
  date: string;
  topicId: string;
}

export function requireTopicId(row: SheetRow): string {
  const id = String(row.topicId || '').trim();
  if (!id) {
    throw new Error('topicId is required. Each Topics row must have a Topic Id (column C).');
  }
  return id;
}

export function pipelineDbRowToFields(row: PipelineStateDbRow): Omit<SheetRow, 'rowIndex' | 'sourceSheet' | 'topicRowIndex'> {
  return {
    topicId: row.topic_id,
    topic: row.topic,
    date: row.date,
    status: row.status || 'Pending',
    variant1: row.variant1 ?? '',
    variant2: row.variant2 ?? '',
    variant3: row.variant3 ?? '',
    variant4: row.variant4 ?? '',
    imageLink1: row.image_link1 ?? '',
    imageLink2: row.image_link2 ?? '',
    imageLink3: row.image_link3 ?? '',
    imageLink4: row.image_link4 ?? '',
    selectedText: row.selected_text ?? '',
    selectedImageId: row.selected_image_id ?? '',
    selectedImageUrlsJson: row.selected_image_urls_json ?? '',
    postTime: row.post_time ?? '',
    emailTo: row.email_to ?? '',
    emailCc: row.email_cc ?? '',
    emailBcc: row.email_bcc ?? '',
    emailSubject: row.email_subject ?? '',
    topicGenerationRules: row.topic_generation_rules ?? '',
    generationTemplateId: row.generation_template_id ?? '',
    publishedAt: row.published_at || undefined,
    topicDeliveryChannel: row.topic_delivery_channel ?? '',
    topicGenerationModel: row.topic_generation_model ?? '',
  };
}

export function sheetRowToPipelineColumns(spreadsheetId: string, row: SheetRow): Record<string, string | null> {
  const topicId = requireTopicId(row);
  return {
    spreadsheet_id: spreadsheetId,
    topic_id: topicId,
    topic: row.topic,
    date: row.date,
    status: row.status || 'Pending',
    variant1: row.variant1 ?? '',
    variant2: row.variant2 ?? '',
    variant3: row.variant3 ?? '',
    variant4: row.variant4 ?? '',
    image_link1: row.imageLink1 ?? '',
    image_link2: row.imageLink2 ?? '',
    image_link3: row.imageLink3 ?? '',
    image_link4: row.imageLink4 ?? '',
    selected_text: row.selectedText ?? '',
    selected_image_id: row.selectedImageId ?? '',
    selected_image_urls_json: row.selectedImageUrlsJson ?? '',
    post_time: row.postTime ?? '',
    email_to: row.emailTo ?? '',
    email_cc: row.emailCc ?? '',
    email_bcc: row.emailBcc ?? '',
    email_subject: row.emailSubject ?? '',
    topic_generation_rules: row.topicGenerationRules ?? '',
    generation_template_id: row.generationTemplateId ?? '',
    published_at: row.publishedAt ?? null,
    topic_delivery_channel: row.topicDeliveryChannel ?? '',
    topic_generation_model: row.topicGenerationModel ?? '',
  };
}

export function mergeTopicWithPipeline(topic: TopicSheetEntry, pipeline: PipelineStateDbRow | undefined): SheetRow {
  const sheetTopicId = String(topic.topicId || '').trim();
  if (!sheetTopicId) {
    throw new Error('Topics sheet row is missing Topic Id (column C).');
  }

  const baseFields = pipeline
    ? pipelineDbRowToFields(pipeline)
    : {
        topicId: sheetTopicId,
        topic: topic.topic,
        date: topic.date,
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
        selectedImageUrlsJson: '',
        postTime: '',
        emailTo: '',
        emailCc: '',
        emailBcc: '',
        emailSubject: '',
        topicGenerationRules: '',
        generationTemplateId: '',
        publishedAt: undefined as string | undefined,
        topicDeliveryChannel: '',
        topicGenerationModel: '',
      };

  const statusNorm = String(baseFields.status || '').trim().toLowerCase();
  const sourceSheet: SheetRow['sourceSheet'] =
    statusNorm === 'published' ? 'Post' : pipeline ? 'Draft' : 'Topics';

  return {
    rowIndex: topic.rowIndex,
    sourceSheet,
    topicRowIndex: topic.rowIndex,
    topicId: baseFields.topicId,
    topic: baseFields.topic,
    date: baseFields.date,
    status: baseFields.status,
    variant1: baseFields.variant1,
    variant2: baseFields.variant2,
    variant3: baseFields.variant3,
    variant4: baseFields.variant4,
    imageLink1: baseFields.imageLink1,
    imageLink2: baseFields.imageLink2,
    imageLink3: baseFields.imageLink3,
    imageLink4: baseFields.imageLink4,
    selectedText: baseFields.selectedText,
    selectedImageId: baseFields.selectedImageId,
    selectedImageUrlsJson: baseFields.selectedImageUrlsJson,
    postTime: baseFields.postTime,
    emailTo: baseFields.emailTo,
    emailCc: baseFields.emailCc,
    emailBcc: baseFields.emailBcc,
    emailSubject: baseFields.emailSubject,
    topicGenerationRules: baseFields.topicGenerationRules,
    generationTemplateId: baseFields.generationTemplateId,
    publishedAt: baseFields.publishedAt,
    topicDeliveryChannel: baseFields.topicDeliveryChannel,
    topicGenerationModel: baseFields.topicGenerationModel,
  };
}
