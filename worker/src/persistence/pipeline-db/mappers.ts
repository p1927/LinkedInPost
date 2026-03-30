import type { SheetRow } from '../../generation/types';
import type { PipelineStateDbRow } from './types';

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

export function pipelineDbRowToFields(row: PipelineStateDbRow): Omit<SheetRow, 'rowIndex' | 'sourceSheet' | 'topicRowIndex' | 'draftRowIndex' | 'postRowIndex'> {
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
  };
}

export function mergeTopicWithPipeline(
  topic: TopicSheetEntry,
  pipeline: PipelineStateDbRow | undefined,
  legacy: { draftRowIndex?: number; postRowIndex?: number } | undefined,
): SheetRow {
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
      };

  const statusNorm = String(baseFields.status || '').trim().toLowerCase();
  const sourceSheet: SheetRow['sourceSheet'] =
    statusNorm === 'published' ? 'Post' : pipeline ? 'Draft' : 'Topics';

  return {
    rowIndex: topic.rowIndex,
    sourceSheet,
    topicRowIndex: topic.rowIndex,
    draftRowIndex: legacy?.draftRowIndex,
    postRowIndex: legacy?.postRowIndex,
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
  };
}
