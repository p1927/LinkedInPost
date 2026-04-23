import { nodeRegistry } from '../registry/NodeRegistry';
import { psychologyAnalyzerNode } from './definitions/psychology-analyzer';
import { researchContextNode } from './definitions/research-context';
import { vocabularySelectorNode } from './definitions/vocabulary-selector';
import { hookDesignerNode } from './definitions/hook-designer';
import { narrativeArcNode } from './definitions/narrative-arc';
import { draftGeneratorNode } from './definitions/draft-generator';
import { toneCalibratorNode } from './definitions/tone-calibrator';
import { constraintValidatorNode } from './definitions/constraint-validator';

export function setupBuiltinNodes(): void {
  const definitions = [
    psychologyAnalyzerNode,
    researchContextNode,
    vocabularySelectorNode,
    hookDesignerNode,
    narrativeArcNode,
    draftGeneratorNode,
    toneCalibratorNode,
    constraintValidatorNode,
  ];

  for (const definition of definitions) {
    try {
      nodeRegistry.register(definition);
    } catch {
      // Node already registered — idempotent, skip silently
    }
  }
}
