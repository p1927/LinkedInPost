import type { Env, StoredConfig } from '../index';
import { coerceSheetRow } from '../index';
import { formatAuthorProfileForPrompt } from './author-profile/format-for-prompt';
import { buildQuickChangePrompt, buildVariantsPrompt } from './prompts';
import { resolveEffectiveGenerationRulesWithTemplate } from './rules';
import type { SheetRow } from './types';
import {
  applyReplacement,
  coerceSelectionRange,
  normalizePlainTextValue,
  normalizeVariantList,
  resolveGenerationTarget,
  tryParseJson,
} from './normalize';
import type {
  GenerationRequestPayload,
  QuickChangePreviewResult,
  ResearchArticleRef,
  VariantsPreviewResponse,
} from './types';
import { FEATURE_NEWS_RESEARCH, FEATURE_MULTI_PROVIDER_LLM } from '../generated/features';
import { trimForPrompt } from '../researcher/trim';
import type { ResearchArticle } from '../researcher/types';
import {
  generateTextJsonWithFallback,
  resolveFallbackForGeneration,
  resolveGenerationRef,
  workspaceConfigFromStored,
} from '../llm';

function coerceResearchArticles(raw: unknown): ResearchArticleRef[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const asArticles: ResearchArticle[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as Record<string, unknown>;
    const title = String(o.title || '').trim();
    const url = String(o.url || '').trim();
    const source = String(o.source || '').trim() || 'Unknown';
    let snippet = String(o.snippet || '').trim();
    if (!snippet) {
      snippet = '(No description or summary was provided for this source.)';
    }
    if (!title || !url) continue;
    asArticles.push({
      title,
      url,
      source,
      publishedAt: String(o.publishedAt || '').trim() || new Date().toISOString(),
      snippet,
      provider: 'rss',
    });
  }
  if (asArticles.length === 0) {
    return undefined;
  }
  return trimForPrompt(asArticles);
}

async function resolveTemplateRulesForRow(
  row: SheetRow,
  getPostTemplateRulesById: (templateId: string) => Promise<string | null>,
): Promise<string | undefined> {
  if ((row.topicGenerationRules || '').trim()) {
    return undefined;
  }
  const tid = String(row.generationTemplateId || '').trim();
  if (!tid) {
    return undefined;
  }
  const rules = await getPostTemplateRulesById(tid);
  return rules === null ? undefined : rules;
}

function llmWorkspace(storedConfig: StoredConfig) {
  return workspaceConfigFromStored(storedConfig.googleModel, storedConfig.allowedGoogleModels, storedConfig.llm);
}

export async function generateQuickChangePreview(
  env: Env,
  storedConfig: StoredConfig,
  payload: Record<string, unknown>,
  getPostTemplateRulesById: (templateId: string) => Promise<string | null>,
): Promise<QuickChangePreviewResult> {
  const request = payload as unknown as GenerationRequestPayload;
  const row = coerceSheetRow(request.row);
  const editorText = String(request.editorText || '');
  if (!editorText.trim()) {
    throw new Error('Draft text is required before running Quick Change.');
  }

  const instruction = String(request.instruction || '').trim();
  if (!instruction) {
    throw new Error('Quick Change needs a per-run instruction.');
  }

  const { scope, selection } = resolveGenerationTarget(editorText, request.scope, coerceSelectionRange(request.selection));
  const ws = llmWorkspace(storedConfig);
  const primary = resolveGenerationRef(ws, request, FEATURE_MULTI_PROVIDER_LLM);
  const fallback = resolveFallbackForGeneration(ws, primary, FEATURE_MULTI_PROVIDER_LLM);
  const templateRules = await resolveTemplateRulesForRow(row, getPostTemplateRulesById);
  const effectiveRules = resolveEffectiveGenerationRulesWithTemplate(
    row.topicGenerationRules,
    templateRules,
    storedConfig.generationRules || '',
  );
  const researchRefs = FEATURE_NEWS_RESEARCH ? coerceResearchArticles(request.researchArticles) : undefined;
  const authorBlock = formatAuthorProfileForPrompt(storedConfig.authorProfile || '');
  const prompt = buildQuickChangePrompt(row, editorText, scope, selection, instruction, effectiveRules, authorBlock, researchRefs);
  const { text, used } = await generateTextJsonWithFallback(env, primary, fallback, prompt);
  const replacementText = normalizePlainTextValue(tryParseJson(text));

  if (!replacementText) {
    throw new Error('Quick Change returned empty preview text.');
  }

  return {
    scope,
    model: used.model,
    llmProvider: used.provider,
    selection,
    replacementText,
    fullText: applyReplacement(editorText, scope, selection, replacementText),
  };
}

export async function generateVariantsPreview(
  env: Env,
  storedConfig: StoredConfig,
  payload: Record<string, unknown>,
  getPostTemplateRulesById: (templateId: string) => Promise<string | null>,
): Promise<VariantsPreviewResponse> {
  const request = payload as unknown as GenerationRequestPayload;
  const row = coerceSheetRow(request.row);
  const editorText = String(request.editorText || '');
  if (!editorText.trim()) {
    throw new Error('Draft text is required before generating preview variants.');
  }

  const { scope, selection } = resolveGenerationTarget(editorText, request.scope, coerceSelectionRange(request.selection));
  const ws = llmWorkspace(storedConfig);
  const primary = resolveGenerationRef(ws, request, FEATURE_MULTI_PROVIDER_LLM);
  const fallback = resolveFallbackForGeneration(ws, primary, FEATURE_MULTI_PROVIDER_LLM);
  const templateRules = await resolveTemplateRulesForRow(row, getPostTemplateRulesById);
  const effectiveRules = resolveEffectiveGenerationRulesWithTemplate(
    row.topicGenerationRules,
    templateRules,
    storedConfig.generationRules || '',
  );
  const researchRefs = FEATURE_NEWS_RESEARCH ? coerceResearchArticles(request.researchArticles) : undefined;
  const authorBlock = formatAuthorProfileForPrompt(storedConfig.authorProfile || '');
  const prompt = buildVariantsPrompt(
    row,
    editorText,
    scope,
    selection,
    String(request.instruction || '').trim(),
    effectiveRules,
    authorBlock,
    researchRefs,
  );
  const { text, used } = await generateTextJsonWithFallback(env, primary, fallback, prompt);
  const variants = normalizeVariantList(tryParseJson(text));

  if (variants.length !== 4) {
    throw new Error('The model did not return four valid preview variants.');
  }

  return {
    scope,
    model: used.model,
    llmProvider: used.provider,
    selection,
    variants: variants.map((replacementText, index) => ({
      id: `preview-${index + 1}`,
      label: `Preview ${index + 1}`,
      replacementText,
      fullText: applyReplacement(editorText, scope, selection, replacementText),
    })),
  };
}
