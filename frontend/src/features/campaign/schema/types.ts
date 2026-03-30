import type { ChannelId } from '@/integrations/channels';
import type { BulkImportCampaignPostPayload } from '@/services/backendApi';

/** Shape we expect from Claude / user paste (UI-only fields allowed). */
export interface CampaignPostV1 {
  topic: string;
  date: string;
  status?: string;
  variants?: string[];
  variant1?: string;
  variant2?: string;
  variant3?: string;
  variant4?: string;
  body?: string;
  postTime?: string;
  topicGenerationRules?: string;
  generationTemplateId?: string;
  selectedText?: string;
  selectedImageId?: string;
  selectedImageUrlsJson?: string;
  /** Shown in calendar/list only; not sent to the worker. */
  channels?: ChannelId[];
}

export interface CampaignDocV1 {
  version: number;
  posts: CampaignPostV1[];
}

export interface CampaignDiagnostic {
  line: number;
  column: number;
  message: string;
}

export type ParseCampaignResult =
  | {
      ok: true;
      doc: CampaignDocV1;
      /** Stripped of `channels`; ready for `bulkImportCampaign`. */
      payloadPosts: BulkImportCampaignPostPayload[];
    }
  | { ok: false; diagnostics: CampaignDiagnostic[] };
