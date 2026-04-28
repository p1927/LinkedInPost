import { useState } from 'react';
import { ChevronDown, ChevronUp, LoaderCircle, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAlert } from './useAlert';

interface Props {
  onGenerateImageFromText: (prompt: string) => Promise<void>;
  aiGenerationPrompt?: string;
}

export function ImageGenTextPanel({ onGenerateImageFromText, aiGenerationPrompt }: Props) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Enter a prompt to generate an image.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      await onGenerateImageFromText(trimmed);
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed.';
      setError(msg);
      void showAlert({ title: 'Generation failed', description: msg });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-canvas">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => {
          if (!open && !prompt && aiGenerationPrompt) {
            setPrompt(aiGenerationPrompt);
          }
          setOpen((v) => !v);
        }}
      >
        <Wand2 className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="flex-1 text-xs font-semibold text-ink">Generate from prompt</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-muted" />}
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-border px-3 pb-3 pt-2">
          <Textarea
            placeholder="Describe the image you want to generate…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[72px] resize-none text-xs"
            disabled={generating}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button
            size="sm"
            className="self-end"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
          >
            {generating ? (
              <>
                <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Generate
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
