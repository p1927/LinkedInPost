import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import type { TrendingWord } from '../types';

interface TrendingWordsWidgetProps {
  words: TrendingWord[];
  onSelectWord: (word: string) => void;
}

export function TrendingWordsWidget({ words, onSelectWord }: TrendingWordsWidgetProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (words.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/40 bg-white/30 backdrop-blur-sm p-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setCollapsed((c) => !c)}
      >
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted/60">
          Trending Words
        </span>
        {collapsed
          ? <ChevronDown className="h-3.5 w-3.5 text-muted" />
          : <ChevronUp className="h-3.5 w-3.5 text-muted" />
        }
      </button>

      {!collapsed && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {words.map(({ word, tier }) => (
            <button
              key={word}
              type="button"
              onClick={() => onSelectWord(word)}
              className={[
                'rounded-full border border-white/50 bg-white/40 px-2.5 py-1 capitalize backdrop-blur-sm transition-colors hover:bg-primary/10 hover:border-primary/40 hover:text-primary',
                tier === 'high' ? 'text-sm font-semibold text-ink' :
                tier === 'mid'  ? 'text-xs font-medium text-ink/80' :
                                  'text-xs text-muted',
              ].join(' ')}
            >
              {word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
