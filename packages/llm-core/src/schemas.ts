import { z } from 'zod';
import { LLM_PROVIDER_IDS } from './providers';

export const llmProviderIdSchema = z.enum(LLM_PROVIDER_IDS);

export const llmRefSchema = z.object({
  provider: llmProviderIdSchema,
  model: z.string(),
});

export const llmModelOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  provider: llmProviderIdSchema,
  displayName: z.string().optional(),
});
