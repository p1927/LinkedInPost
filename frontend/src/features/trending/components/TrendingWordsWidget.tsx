import { useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tagVariants, containerVariants } from '@/lib/motion';
import type { TrendingWord } from '../types';

interface TrendingWordsWidgetProps {
  words: TrendingWord[];
  onSelectWord: (word: string) => void;
}

const TIER_STYLES = {
  high: 'text-sm font-semibold text-ink bg-primary/8 border-primary/20 hover:bg-primary/15 hover:border-primary/40 hover:text-primary',
  mid:  'text-xs font-medium text-ink/80 bg-secondary/60 border-border/60 hover:bg-primary/8 hover:border-primary/30 hover:text-primary',
  low:  'text-xs text-muted bg-secondary/40 border-border/40 hover:bg-secondary/80 hover:text-ink border-transparent',
};

export function TrendingWordsWidget({ words, onSelectWord }: TrendingWordsWidgetProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (words.length === 0) return null;

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/10">
          <TrendingUp className="h-3 w-3 text-primary" />
        </div>
        <span className="flex-1 text-xs font-semibold text-ink">Trending Words</span>
        <span className="text-[10px] text-muted mr-1">{words.length}</span>
        <motion.span animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </motion.span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="px-3 pb-3 pt-1 flex flex-wrap gap-1.5 border-t border-border/30"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
          >
            {words.map(({ word, tier }) => (
              <motion.button
                key={word}
                type="button"
                onClick={() => onSelectWord(word)}
                variants={tagVariants}
                whileHover={{ scale: 1.06, y: -1 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                className={[
                  'rounded-full border px-2.5 py-1 capitalize transition-all duration-150 cursor-pointer',
                  TIER_STYLES[tier],
                ].join(' ')}
              >
                {word}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
