// frontend/src/features/review/GenerationJustificationPanel.tsx

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { NodeRunItem } from '../../services/backendApi';

interface JustificationData {
  audienceDescription: string | null;
  dominantEmotion: string | null;
  triggers: string[];
  arcType: string | null;
  hookType: string | null;
  ctaType: string | null;
  powerWords: string[];
  avoidWords: string[];
  wordCount: number | null;
  withinRange: boolean | null;
}

function extractJustification(nodeRuns: NodeRunItem[]): JustificationData {
  const getOutput = (nodeId: string) => {
    const run = nodeRuns.find(r => r.node_id === nodeId);
    if (!run) return null;
    try { return JSON.parse(run.output_json) as Record<string, unknown>; } catch { return null; }
  };

  const psych = getOutput('psychology-analyzer');
  const vocab = getOutput('vocabulary-selector');
  const arc = getOutput('narrative-arc');
  const validator = getOutput('constraint-validator');

  return {
    audienceDescription: psych?.audienceDescription as string | null ?? null,
    dominantEmotion: psych?.dominantEmotion as string | null ?? null,
    triggers: ((psych?.triggers as Array<{ type: string }> | undefined) ?? []).slice(0, 3).map(t => t.type),
    arcType: arc?.arc as string | null ?? null,
    hookType: (arc as { selectedHook?: { type: string } } | null)?.selectedHook?.type ?? null,
    ctaType: arc?.ctaType as string | null ?? null,
    powerWords: ((vocab?.powerWords as string[] | undefined) ?? []).slice(0, 5),
    avoidWords: ((vocab?.avoidWords as string[] | undefined) ?? []).slice(0, 3),
    wordCount: (validator as { variants?: Array<{ wordCount: number }> } | null)?.variants?.[0]?.wordCount ?? null,
    withinRange: (validator as { allPassed?: boolean } | null)?.allPassed ?? null,
  };
}

interface Section {
  title: string;
  lines: string[];
}

function buildSections(data: JustificationData): Section[] {
  const sections: Section[] = [];

  const audienceLines: string[] = [];
  if (data.audienceDescription) audienceLines.push(data.audienceDescription);
  if (data.dominantEmotion) audienceLines.push(`Dominant emotion: ${data.dominantEmotion}`);
  if (data.triggers.length) audienceLines.push(`Key triggers: ${data.triggers.join(', ')}`);
  if (audienceLines.length) sections.push({ title: 'Audience insight', lines: audienceLines });

  const structureLines: string[] = [];
  if (data.arcType) structureLines.push(`Arc: ${data.arcType.replace(/_/g, ' ')}`);
  if (data.hookType) structureLines.push(`Hook: ${data.hookType.replace(/_/g, ' ')}`);
  if (data.ctaType) structureLines.push(`CTA style: ${data.ctaType.replace(/_/g, ' ')}`);
  if (structureLines.length) sections.push({ title: 'Structure', lines: structureLines });

  const vocabLines: string[] = [];
  if (data.powerWords.length) vocabLines.push(`Power words: ${data.powerWords.join(', ')}`);
  if (data.avoidWords.length) vocabLines.push(`Avoided: ${data.avoidWords.join(', ')}`);
  if (vocabLines.length) sections.push({ title: 'Vocabulary', lines: vocabLines });

  const channelLines: string[] = [];
  if (data.wordCount != null) {
    const status = data.withinRange === false ? ' ⚠ outside target' : '';
    channelLines.push(`Word count: ${data.wordCount}${status}`);
  }
  if (channelLines.length) sections.push({ title: 'Constraints', lines: channelLines });

  return sections;
}

interface GenerationJustificationPanelProps {
  nodeRuns: NodeRunItem[];
  isLoading?: boolean;
}

export function GenerationJustificationPanel({
  nodeRuns,
  isLoading = false,
}: GenerationJustificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) return null;
  if (!nodeRuns.length) return null;

  const data = extractJustification(nodeRuns);
  const sections = buildSections(data);
  if (!sections.length) return null;

  return (
    <div className="rounded-xl border border-indigo-200/60 bg-indigo-50/30">
      <button
        type="button"
        onClick={() => setIsOpen(p => !p)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-xs font-bold text-indigo-700">Why this post was built this way</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-indigo-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 border-t border-indigo-200/60 pt-3">
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-indigo-500 mb-1">
                {section.title}
              </p>
              {section.lines.map(line => (
                <p key={line} className="text-xs text-slate-700 leading-relaxed">{line}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
