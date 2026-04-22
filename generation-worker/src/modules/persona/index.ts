import { generateLlmParsedJson, hasAnyLlmProvider } from '../../llmFromWorker';
import { buildKnowledgeContext } from '../_shared/knowledgeLoader';
import type { EnrichmentModule, ModuleContext, PersonaSignal } from '../_shared/types';
import frameworkMd from './knowledge/persona-framework.md';
import startupFounderMd from './knowledge/personas/startup-founder.md';
import engineeringManagerMd from './knowledge/personas/engineering-manager.md';
import productManagerMd from './knowledge/personas/product-manager.md';
import seniorDeveloperMd from './knowledge/personas/senior-developer.md';

// ---------------------------------------------------------------------------
// Persona Library
// ---------------------------------------------------------------------------

interface PersonaEntry {
  id: string;
  name: string;
  content: string;
}

const PERSONA_LIBRARY: PersonaEntry[] = [
  { id: 'startup-founder', name: 'Startup Founder', content: startupFounderMd },
  { id: 'engineering-manager', name: 'Engineering Manager', content: engineeringManagerMd },
  { id: 'product-manager', name: 'Product Manager', content: productManagerMd },
  { id: 'senior-developer', name: 'Senior Developer', content: seniorDeveloperMd },
];

// ---------------------------------------------------------------------------
// Fuzzy Match
// ---------------------------------------------------------------------------

function fuzzyMatch(audience: string): PersonaEntry | null {
  const normalized = audience.toLowerCase().trim();
  if (!normalized) return null;

  // 1. Exact id match
  for (const entry of PERSONA_LIBRARY) {
    if (normalized === entry.id) return entry;
  }

  // 2. Name substring match (case-insensitive)
  for (const entry of PERSONA_LIBRARY) {
    if (normalized.includes(entry.name.toLowerCase())) return entry;
  }

  // 3. Keyword overlap — score by shared tokens
  const audienceTokens = new Set(normalized.split(/[\s\-_,/]+/).filter((t) => t.length > 2));
  let bestScore = 0;
  let bestEntry: PersonaEntry | null = null;

  for (const entry of PERSONA_LIBRARY) {
    const entryTokens = new Set(
      `${entry.id} ${entry.name}`.toLowerCase().split(/[\s\-_,/]+/).filter((t) => t.length > 2),
    );
    let score = 0;
    for (const token of audienceTokens) {
      if (entryTokens.has(token)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Require at least one overlapping keyword
  return bestScore >= 1 ? bestEntry : null;
}

// ---------------------------------------------------------------------------
// Markdown Parser
// ---------------------------------------------------------------------------

function extractBullets(section: string): string[] {
  const lines = section.split('\n');
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      bullets.push(trimmed.slice(2).trim());
    }
  }
  return bullets;
}

function extractSection(content: string, heading: string): string {
  const pattern = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

function parsePersonaFromMarkdown(content: string, id: string): PersonaSignal {
  const nameMatch = content.match(/^# (.+)/m);
  const name = nameMatch ? nameMatch[1].trim() : id;

  const currentFocusSection = extractSection(content, 'Current Focus');
  const languageSection = extractSection(content, 'Language');

  // Language section is prose — take first sentence
  const language = languageSection.split(/\.\s+/)[0]?.trim() ?? '';

  return {
    id,
    name,
    concerns: extractBullets(extractSection(content, 'Concerns')),
    ambitions: extractBullets(extractSection(content, 'Ambitions')),
    currentFocus: currentFocusSection.split('\n')[0]?.trim() ?? '',
    habits: extractBullets(extractSection(content, 'Habits')),
    language,
    decisionDrivers: extractBullets(extractSection(content, 'Decision Drivers')),
    painPoints: extractBullets(extractSection(content, 'Pain Points')),
  };
}

// ---------------------------------------------------------------------------
// LLM Generation
// ---------------------------------------------------------------------------

interface LlmPersonaResponse {
  id: string;
  name: string;
  concerns: string[];
  ambitions: string[];
  currentFocus: string;
  habits: string[];
  language: string;
  decisionDrivers: string[];
  painPoints: string[];
}

async function generatePersona(ctx: ModuleContext): Promise<PersonaSignal> {
  const audience = ctx.report.audience ?? ctx.topic;

  if (!hasAnyLlmProvider(ctx.env)) {
    return {
      id: 'custom',
      name: audience,
      concerns: [],
      ambitions: [],
      currentFocus: '',
      habits: [],
      language: '',
      decisionDrivers: [],
      painPoints: [],
    };
  }

  const knowledgeContext = buildKnowledgeContext({
    'Persona Framework': frameworkMd,
  });

  const prompt = `You are an expert content strategist. Using the persona framework below, generate a detailed persona signal for the described audience.

${knowledgeContext}

---

AUDIENCE DESCRIPTION: ${audience}
TOPIC: ${ctx.topic}
CHANNEL: ${ctx.channel}

Generate a PersonaSignal JSON object with this exact shape:
{
  "id": "<slugified-id, lowercase, hyphens>",
  "name": "<Human Readable Name>",
  "concerns": ["<concern 1>", "<concern 2>", "<concern 3>", "<concern 4>", "<concern 5>"],
  "ambitions": ["<ambition 1>", "<ambition 2>", "<ambition 3>", "<ambition 4>", "<ambition 5>"],
  "currentFocus": "<one sentence describing their primary current focus>",
  "habits": ["<habit 1>", "<habit 2>", "<habit 3>", "<habit 4>", "<habit 5>"],
  "language": "<one sentence describing their vocabulary, tone, and communication register>",
  "decisionDrivers": ["<driver 1>", "<driver 2>", "<driver 3>", "<driver 4>", "<driver 5>"],
  "painPoints": ["<pain point 1>", "<pain point 2>", "<pain point 3>", "<pain point 4>", "<pain point 5>"]
}

Make each field specific to the audience description. Return valid JSON only.`;

  try {
    const result = await generateLlmParsedJson<LlmPersonaResponse>(ctx.env, ctx.llmRef, prompt, {
      temperature: 0.5,
      maxOutputTokens: 2000,
    });

    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) && v.every((x) => typeof x === 'string');

    return {
      id: typeof result.id === 'string' && result.id.trim() ? result.id.trim() : 'custom',
      name: typeof result.name === 'string' && result.name.trim() ? result.name.trim() : audience,
      concerns: isStringArray(result.concerns) ? result.concerns : [],
      ambitions: isStringArray(result.ambitions) ? result.ambitions : [],
      currentFocus: typeof result.currentFocus === 'string' ? result.currentFocus.trim() : '',
      habits: isStringArray(result.habits) ? result.habits : [],
      language: typeof result.language === 'string' ? result.language.trim() : '',
      decisionDrivers: isStringArray(result.decisionDrivers) ? result.decisionDrivers : [],
      painPoints: isStringArray(result.painPoints) ? result.painPoints : [],
    };
  } catch {
    return {
      id: 'custom',
      name: audience,
      concerns: [],
      ambitions: [],
      currentFocus: '',
      habits: [],
      language: '',
      decisionDrivers: [],
      painPoints: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Module Export
// ---------------------------------------------------------------------------

export const personaModule: EnrichmentModule<PersonaSignal> = {
  name: 'persona',

  async enrich(ctx: ModuleContext): Promise<PersonaSignal> {
    const audience = ctx.report.audience ?? '';

    // 1. Fuzzy match against pre-built library
    const matched = fuzzyMatch(audience);
    if (matched) {
      return parsePersonaFromMarkdown(matched.content, matched.id);
    }

    // 2. LLM generation for unrecognized audience
    return generatePersona(ctx);
  },
};
