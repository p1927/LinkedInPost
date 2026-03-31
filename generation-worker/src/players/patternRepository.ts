import { PatternPackSchema } from '../types';
import type { Pattern, PatternTags } from '../types';
import defaultPack from '../../patterns/default.json';

export class PatternRepository {
  private readonly patterns: Map<string, Pattern>;

  constructor(patterns: Pattern[]) {
    this.patterns = new Map(patterns.map((p) => [p.id, p]));
  }

  getAll(): Pattern[] {
    return [...this.patterns.values()];
  }

  getById(id: string): Pattern | undefined {
    return this.patterns.get(id);
  }

  filter(tags: Partial<PatternTags>): Pattern[] {
    return this.getAll().filter((p) => {
      if (tags.channels?.length) {
        const match = tags.channels.some(
          (c: string) => p.tags.channels.includes(c) || p.tags.channels.length === 0,
        );
        if (!match) return false;
      }
      if (tags.tone?.length) {
        const match = tags.tone.some(
          (t: string) => p.tags.tone.includes(t) || p.tags.tone.length === 0,
        );
        if (!match) return false;
      }
      if (tags.jtbd?.length) {
        const match = tags.jtbd.some(
          (j: string) => p.tags.jtbd.includes(j) || p.tags.jtbd.length === 0,
        );
        if (!match) return false;
      }
      if (typeof tags.factual === 'boolean') {
        // factual patterns are always valid for factual requests; non-factual patterns ok for any
        if (tags.factual && !p.tags.factual) {
          // allow — non-factual pattern can still handle factual request
        }
      }
      return true;
    });
  }

  compactSummaries(): Array<{ id: string; name: string; whenToUse: string; tags: PatternTags }> {
    return this.getAll().map((p) => ({
      id: p.id,
      name: p.name,
      whenToUse: p.whenToUse,
      tags: p.tags,
    }));
  }
}

let _repo: PatternRepository | null = null;

export function loadBundledRepository(): PatternRepository {
  if (_repo) return _repo;
  const parsed = PatternPackSchema.parse(defaultPack);
  _repo = new PatternRepository(parsed.patterns);
  return _repo;
}
