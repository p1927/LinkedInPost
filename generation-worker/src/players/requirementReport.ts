import type { GenerateRequest, RequirementReport, SuggestPatternRequest } from '../types';

export function buildRequirementReport(req: GenerateRequest): RequirementReport {
  return {
    channel: req.channel || 'linkedin',
    audience: req.audience || '',
    tone: req.tone || '',
    jtbd: req.jtbd || '',
    factual: req.factual ?? false,
    mustInclude: req.mustInclude ?? [],
    mustAvoid: req.mustAvoid ?? [],
    cta: req.cta || '',
    topic: req.topic,
    contentSummary: '',
    optionalUrl: req.optionalUrl,
    constraints: req.constraints || '',
  };
}

export function buildRequirementReportFromSuggest(req: SuggestPatternRequest): RequirementReport {
  return {
    channel: req.channel || 'linkedin',
    audience: req.audience || '',
    tone: req.tone || '',
    jtbd: req.jtbd || '',
    factual: req.factual ?? false,
    mustInclude: [],
    mustAvoid: [],
    cta: '',
    topic: req.topic,
    contentSummary: req.contentSummary || '',
    constraints: '',
  };
}
