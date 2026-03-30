import {
  findNodeAtLocation,
  type JSONPath,
  parse,
  parseTree,
  type ParseError,
  printParseErrorCode,
  type Node,
} from 'jsonc-parser';
import { CHANNEL_OPTIONS, type ChannelId } from '@/integrations/channels';
import type { BulkImportCampaignPostPayload } from '@/services/backendApi';
import type { CampaignDiagnostic, CampaignDocV1, CampaignPostV1, ParseCampaignResult } from '../schema/types';

const VALID_CHANNEL = new Set<ChannelId>(CHANNEL_OPTIONS.map((c) => c.value));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function offsetToLineCol(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  const end = Math.min(offset, source.length);
  for (let i = 0; i < end; i++) {
    if (source.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: Math.max(0, offset - lineStart) };
}

function diagFromOffset(source: string, offset: number, message: string): CampaignDiagnostic {
  const { line, column } = offsetToLineCol(source, offset);
  return { line, column, message };
}

function diagFromParseErrors(source: string, errors: ParseError[]): CampaignDiagnostic[] {
  return errors.map((e) =>
    diagFromOffset(source, e.offset, printParseErrorCode(e.error)),
  );
}

function diagFromPath(
  source: string,
  root: Node | undefined,
  path: JSONPath,
  message: string,
): CampaignDiagnostic {
  const node = root ? findNodeAtLocation(root, path) : undefined;
  if (node) {
    return diagFromOffset(source, node.offset, message);
  }
  return { line: 1, column: 0, message };
}

function coerceChannels(raw: unknown, path: JSONPath, source: string, root: Node | undefined): CampaignDiagnostic[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    return [diagFromPath(source, root, path, '"channels" must be an array of channel ids when present.')];
  }
  const out: CampaignDiagnostic[] = [];
  raw.forEach((c, i) => {
    if (typeof c !== 'string' || !VALID_CHANNEL.has(c as ChannelId)) {
      out.push(
        diagFromPath(
          source,
          root,
          [...path, i],
          `Invalid channel "${String(c)}". Use: instagram, linkedin, telegram, whatsapp, gmail.`,
        ),
      );
    }
  });
  return out;
}

function postToPayload(p: CampaignPostV1): BulkImportCampaignPostPayload {
  return {
    topicId: crypto.randomUUID(),
    topic: p.topic,
    date: p.date,
    status: p.status,
    variants: p.variants,
    variant1: p.variant1,
    variant2: p.variant2,
    variant3: p.variant3,
    variant4: p.variant4,
    body: p.body,
    postTime: p.postTime,
    topicGenerationRules: p.topicGenerationRules,
    generationTemplateId: p.generationTemplateId,
    selectedText: p.selectedText,
    selectedImageId: p.selectedImageId,
    selectedImageUrlsJson: p.selectedImageUrlsJson,
  };
}

function buildPostFromRaw(o: Record<string, unknown>, channels?: ChannelId[]): CampaignPostV1 {
  return {
    topic: typeof o.topic === 'string' ? o.topic.trim() : '',
    date: typeof o.date === 'string' ? o.date.trim() : '',
    status: typeof o.status === 'string' ? o.status.trim() : undefined,
    variants: Array.isArray(o.variants) ? o.variants.map((v) => (typeof v === 'string' ? v : '')) : undefined,
    variant1: typeof o.variant1 === 'string' ? o.variant1 : undefined,
    variant2: typeof o.variant2 === 'string' ? o.variant2 : undefined,
    variant3: typeof o.variant3 === 'string' ? o.variant3 : undefined,
    variant4: typeof o.variant4 === 'string' ? o.variant4 : undefined,
    body: typeof o.body === 'string' ? o.body : undefined,
    postTime: typeof o.postTime === 'string' ? o.postTime.trim() : undefined,
    topicGenerationRules: typeof o.topicGenerationRules === 'string' ? o.topicGenerationRules : undefined,
    generationTemplateId: typeof o.generationTemplateId === 'string' ? o.generationTemplateId.trim() : undefined,
    selectedText: typeof o.selectedText === 'string' ? o.selectedText : undefined,
    selectedImageId: typeof o.selectedImageId === 'string' ? o.selectedImageId.trim() : undefined,
    selectedImageUrlsJson: typeof o.selectedImageUrlsJson === 'string' ? o.selectedImageUrlsJson.trim() : undefined,
    channels: channels?.length ? channels : undefined,
  };
}

export function parseCampaignPaste(source: string): ParseCampaignResult {
  const trimmed = source.trim();
  if (!trimmed) {
    return { ok: false, diagnostics: [{ line: 1, column: 0, message: 'Paste your campaign JSON here.' }] };
  }

  const parseErrors: ParseError[] = [];
  const options = { allowTrailingComma: true, allowEmptyContent: false };
  parse(trimmed, parseErrors, options);

  if (parseErrors.length > 0) {
    return { ok: false, diagnostics: diagFromParseErrors(trimmed, parseErrors) };
  }

  const tree = parseTree(trimmed, [], options);
  const data = parse(trimmed, [], options) as unknown;

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      ok: false,
      diagnostics: [diagFromPath(trimmed, tree, [], 'Document must be a JSON object.')],
    };
  }

  const obj = data as Record<string, unknown>;
  const version = obj.version;
  if (version !== undefined && version !== 1) {
    return {
      ok: false,
      diagnostics: [diagFromPath(trimmed, tree, ['version'], 'Only version: 1 is supported.')],
    };
  }

  const postsRaw = obj.posts;
  if (!Array.isArray(postsRaw)) {
    return {
      ok: false,
      diagnostics: [diagFromPath(trimmed, tree, ['posts'], 'Missing or invalid "posts" array.')],
    };
  }

  if (postsRaw.length === 0) {
    return {
      ok: false,
      diagnostics: [diagFromPath(trimmed, tree, ['posts'], 'Add at least one post.')],
    };
  }

  if (postsRaw.length > 500) {
    return {
      ok: false,
      diagnostics: [{ line: 1, column: 0, message: 'A maximum of 500 posts per import is allowed.' }],
    };
  }

  const diagnostics: CampaignDiagnostic[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < postsRaw.length; i++) {
    const pr = postsRaw[i];
    const path: JSONPath = ['posts', i];
    if (!pr || typeof pr !== 'object' || Array.isArray(pr)) {
      diagnostics.push(diagFromPath(trimmed, tree, path, `posts[${i}] must be an object.`));
      continue;
    }
    const o = pr as Record<string, unknown>;

    const topic = typeof o.topic === 'string' ? o.topic.trim() : '';
    if (!topic) {
      diagnostics.push(diagFromPath(trimmed, tree, [...path, 'topic'], `posts[${i}].topic is required.`));
    }

    const date = typeof o.date === 'string' ? o.date.trim() : '';
    if (!ISO_DATE.test(date)) {
      diagnostics.push(
        diagFromPath(trimmed, tree, [...path, 'date'], `posts[${i}].date must be YYYY-MM-DD.`),
      );
    }

    if (topic && date) {
      const key = `${topic}::${date}`;
      if (seenKeys.has(key)) {
        diagnostics.push(
          diagFromPath(trimmed, tree, path, `Duplicate topic+date: "${topic}" on ${date}.`),
        );
      }
      seenKeys.add(key);
    }

    diagnostics.push(...coerceChannels(o.channels, [...path, 'channels'], trimmed, tree));
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  const posts: CampaignPostV1[] = postsRaw.map((pr) => {
    const o = pr as Record<string, unknown>;
    const ch: ChannelId[] | undefined = Array.isArray(o.channels)
      ? o.channels.filter((c): c is ChannelId => typeof c === 'string' && VALID_CHANNEL.has(c as ChannelId))
      : undefined;
    return buildPostFromRaw(o, ch);
  });

  const doc: CampaignDocV1 = { version: 1, posts };
  const payloadPosts = posts.map(postToPayload);

  return { ok: true, doc, payloadPosts };
}
