// frontend/src/features/workflows/WorkflowBuilderModal.tsx

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUILT_IN_WORKFLOW_CARDS } from '../generation/builtInWorkflowCards';
import type { CustomWorkflowSummary } from '../generation/WorkflowCardPicker';
import type { CreateWorkflowFormValues } from './useCustomWorkflows';

const DIMENSIONS = [
  { key: 'emotions',     label: 'Emotions',     tooltip: 'Drives the emotional register of the hook and body' },
  { key: 'psychology',   label: 'Psychology',   tooltip: 'Maps audience pain points and cognitive triggers' },
  { key: 'persuasion',   label: 'Persuasion',   tooltip: 'Selects a persuasion framework (AIDA, PAS, etc.)' },
  { key: 'copywriting',  label: 'Copywriting',  tooltip: 'Controls hook aggression, power words, and CTA style' },
  { key: 'storytelling', label: 'Storytelling', tooltip: 'Determines how much narrative arc is applied' },
  { key: 'typography',   label: 'Typography',   tooltip: 'Sets line breaks, whitespace, and emoji usage' },
  { key: 'vocabulary',   label: 'Vocabulary',   tooltip: 'Injects domain-specific terms and tone markers' },
] as const;

function getLevelName(v: number) {
  if (v <= 10) return 'Off';
  if (v <= 30) return 'Light';
  if (v <= 50) return 'Moderate';
  if (v <= 80) return 'Strong';
  return 'Max';
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  emotions: 50, psychology: 50, persuasion: 50,
  copywriting: 50, storytelling: 50, typography: 50, vocabulary: 50,
};

interface WorkflowBuilderModalProps {
  isOpen: boolean;
  workflowToEdit?: CustomWorkflowSummary;
  onClose: () => void;
  onSave: (values: CreateWorkflowFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isSaving?: boolean;
}

export function WorkflowBuilderModal({
  isOpen,
  workflowToEdit,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
}: WorkflowBuilderModalProps) {
  const isEditing = !!workflowToEdit;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [optimizationTarget, setOptimizationTarget] = useState('');
  const [generationInstruction, setGenerationInstruction] = useState('');
  const [extendsWorkflowId, setExtendsWorkflowId] = useState('base');
  const [weights, setWeights] = useState<Record<string, number>>(DEFAULT_WEIGHTS);
  const [nameError, setNameError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [instructionError, setInstructionError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (workflowToEdit) {
      setName(workflowToEdit.name);
      setDescription(workflowToEdit.description);
      setOptimizationTarget(workflowToEdit.optimizationTarget);
      setExtendsWorkflowId((workflowToEdit as CustomWorkflowSummary & { extendsWorkflowId?: string }).extendsWorkflowId ?? 'base');
      setGenerationInstruction('');
      setWeights(DEFAULT_WEIGHTS);
    } else {
      setName(''); setDescription(''); setOptimizationTarget('');
      setGenerationInstruction(''); setExtendsWorkflowId('base');
      setWeights(DEFAULT_WEIGHTS);
    }
    setNameError(''); setDescriptionError(''); setInstructionError(''); setSaveError('');
  }, [workflowToEdit, isOpen]);

  if (!isOpen) return null;

  function handleWeightChange(key: string, value: number) {
    setWeights(w => ({ ...w, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;
    if (!name.trim()) { setNameError('Name is required'); valid = false; } else if (name.trim().length > 40) { setNameError('Max 40 characters'); valid = false; } else { setNameError(''); }
    if (!description.trim()) { setDescriptionError('Description is required'); valid = false; } else { setDescriptionError(''); }
    if (!generationInstruction.trim()) { setInstructionError('Generation instruction is required'); valid = false; } else { setInstructionError(''); }
    if (!valid) return;
    setSaveError('');
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        optimizationTarget,
        generationInstruction: generationInstruction.trim(),
        extendsWorkflowId,
        dimensionWeights: weights,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading text-base font-bold text-ink">
            {isEditing ? 'Edit Workflow' : 'Create Your Workflow'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-border/30">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-1">Name <span className="text-red-500">*</span></label>
            <input
              data-testid="workflow-builder-name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. My Founder Voice"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            />
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
            <p className="text-[10px] text-muted mt-0.5">{name.length}/40</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">Description <span className="text-red-500">*</span></label>
            <input
              data-testid="workflow-builder-description"
              value={description}
              onChange={e => { setDescription(e.target.value); if (descriptionError) setDescriptionError(''); }}
              placeholder="One sentence — what does this workflow produce?"
              className={`w-full rounded-xl border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none ${descriptionError ? 'border-red-400' : 'border-border'}`}
            />
            {descriptionError && <p className="text-xs text-red-600 mt-1">{descriptionError}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">Extends (base workflow)</label>
            <select
              data-testid="workflow-builder-base"
              value={extendsWorkflowId}
              onChange={e => setExtendsWorkflowId(e.target.value)}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
            >
              {BUILT_IN_WORKFLOW_CARDS.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">Generation instruction <span className="text-red-500">*</span></label>
            <textarea
              data-testid="workflow-builder-instruction"
              value={generationInstruction}
              onChange={e => { setGenerationInstruction(e.target.value); if (instructionError) setInstructionError(''); }}
              rows={3}
              placeholder="e.g. Always open with a personal story. Never use lists. End with a vulnerable question."
              className={`w-full resize-y rounded-xl border px-3 py-2 text-sm text-ink focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none ${instructionError ? 'border-red-400' : 'border-border'}`}
            />
            {instructionError && <p className="text-xs text-red-600 mt-1">{instructionError}</p>}
          </div>

          <div>
            <p className="text-xs font-bold text-ink mb-3">Dimension weights</p>
            <div className="grid grid-cols-1 gap-3">
              {DIMENSIONS.map(({ key, label, tooltip }) => {
                const val = weights[key] ?? 50;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-ink" title={tooltip}>{label}</span>
                      <span className="text-xs font-bold text-primary">{getLevelName(val)}</span>
                    </div>
                    <p className="text-[10px] text-muted mb-1">{tooltip}</p>
                    <input
                      type="range" min="0" max="100" step="1" value={val}
                      onChange={e => handleWeightChange(key, Number(e.target.value))}
                      className="w-full accent-primary"
                      data-testid={`workflow-builder-slider-${key}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {saveError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{saveError}</p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => workflowToEdit && onDelete(workflowToEdit.id)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                variant="ink"
                size="sm"
                disabled={isSaving}
                data-testid="workflow-builder-save"
              >
                {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create workflow'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
