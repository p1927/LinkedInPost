// frontend/src/features/generation/WorkflowCardPicker.tsx

import { cn } from '@/lib/cn';
import { Plus, Pencil } from 'lucide-react';
import { BUILT_IN_WORKFLOW_CARDS, FEATURED_WORKFLOW_IDS, type BuiltInWorkflowCard } from './builtInWorkflowCards';

export interface CustomWorkflowSummary {
  id: string;
  name: string;
  description: string;
  optimizationTarget: string;
}

interface WorkflowCardPickerProps {
  selectedWorkflowId: string;
  customWorkflows: CustomWorkflowSummary[];
  onSelect: (workflowId: string) => void;
  onOpenBuilder: (workflowToEdit?: CustomWorkflowSummary) => void;
  isLoadingCustom?: boolean;
}

const COLOR_CLASSES: Record<BuiltInWorkflowCard['colorKey'], string> = {
  violet: 'border-violet-200 bg-violet-50/60 hover:border-violet-300',
  amber:  'border-amber-200  bg-amber-50/60  hover:border-amber-300',
  emerald:'border-emerald-200 bg-emerald-50/60 hover:border-emerald-300',
  blue:   'border-blue-200   bg-blue-50/60   hover:border-blue-300',
  rose:   'border-rose-200   bg-rose-50/60   hover:border-rose-300',
  slate:  'border-slate-200  bg-slate-50/60  hover:border-slate-300',
};

const SELECTED_RING: Record<BuiltInWorkflowCard['colorKey'], string> = {
  violet: 'ring-violet-400',
  amber:  'ring-amber-400',
  emerald:'ring-emerald-400',
  blue:   'ring-blue-400',
  rose:   'ring-rose-400',
  slate:  'ring-slate-400',
};

/** Reorder so featured cards appear first */
function orderedBuiltIns(): BuiltInWorkflowCard[] {
  const featured = FEATURED_WORKFLOW_IDS
    .map(id => BUILT_IN_WORKFLOW_CARDS.find(c => c.id === id))
    .filter((c): c is BuiltInWorkflowCard => c !== undefined);
  const rest = BUILT_IN_WORKFLOW_CARDS.filter(c => !FEATURED_WORKFLOW_IDS.includes(c.id));
  return [...featured, ...rest];
}

const ORDERED_BUILT_INS = orderedBuiltIns();

export function WorkflowCardPicker({
  selectedWorkflowId,
  customWorkflows,
  onSelect,
  onOpenBuilder,
  isLoadingCustom = false,
}: WorkflowCardPickerProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      {ORDERED_BUILT_INS.map(card => {
        const isSelected = selectedWorkflowId === card.id;
        return (
          <button
            key={card.id}
            type="button"
            data-testid={`workflow-card-${card.id}`}
            onClick={() => onSelect(card.id)}
            className={cn(
              'flex shrink-0 w-44 flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all duration-150 hover:shadow-md',
              COLOR_CLASSES[card.colorKey],
              isSelected && `ring-2 ring-offset-1 shadow-md ${SELECTED_RING[card.colorKey]}`,
            )}
          >
            <p className="text-xs font-bold text-ink leading-snug">{card.name}</p>
            <p className="text-[0.65rem] leading-relaxed text-slate-600 line-clamp-2">{card.description}</p>
            <div className="flex flex-wrap gap-1 mt-auto">
              {card.traits.map(trait => (
                <span key={trait} className="rounded-full bg-white/70 px-1.5 py-0.5 text-[0.55rem] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                  {trait}
                </span>
              ))}
            </div>
          </button>
        );
      })}

      {/* Custom workflow cards */}
      {!isLoadingCustom && customWorkflows.map(cw => {
        const isSelected = selectedWorkflowId === cw.id;
        return (
          <div
            key={cw.id}
            data-testid={`workflow-card-custom-${cw.id}`}
            role="group"
            aria-label={`Custom workflow: ${cw.name}`}
            className={cn(
              'group relative flex shrink-0 w-44 flex-col gap-2 rounded-xl border-2 p-3 transition-all duration-150',
              'border-indigo-200 bg-indigo-50/60 hover:border-indigo-300 hover:shadow-md',
              isSelected && 'ring-2 ring-offset-1 ring-indigo-400 shadow-md',
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(cw.id)}
              className="flex flex-col gap-2 text-left w-full"
            >
              <p className="text-xs font-bold text-ink leading-snug pr-5">{cw.name}</p>
              <p className="text-[0.65rem] leading-relaxed text-slate-600 line-clamp-2">{cw.description}</p>
              <span className="mt-auto rounded-full bg-indigo-100 px-1.5 py-0.5 text-[0.55rem] font-semibold text-indigo-700 self-start">
                Custom
              </span>
            </button>
            <button
              type="button"
              aria-label={`Edit ${cw.name}`}
              onClick={() => onOpenBuilder(cw)}
              className="absolute top-2 right-2 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-100"
            >
              <Pencil className="h-3 w-3 text-indigo-600" />
            </button>
          </div>
        );
      })}

      {/* Create your own card */}
      <button
        type="button"
        data-testid="workflow-card-create"
        onClick={() => onOpenBuilder()}
        className="flex shrink-0 w-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white/60 p-3 text-center transition-all duration-150 hover:border-primary hover:bg-primary/5 hover:shadow-md"
      >
        <Plus className="h-5 w-5 text-slate-400" />
        <p className="text-xs font-semibold text-slate-500">Create your own</p>
        <p className="text-[0.6rem] text-slate-400 leading-relaxed">Name it, set weights, save it</p>
      </button>
    </div>
  );
}
