import { motion } from 'framer-motion';
import { containerVariants, cardItemVariants } from '@/lib/motion';
import { TrendingWordsWidget } from './TrendingWordsWidget';
import { RecommendationsPanel } from './RecommendationsPanel';
import { PanelToggle, type PanelConfig } from './PanelToggle';

interface TrendingSidebarProps {
  trendingWords: Array<{ word: string; tier: 'high' | 'mid' | 'low' }>;
  recommendedTopics: string[];
  panels: PanelConfig[];
  enabledPanels: string[];
  enabledPlatforms: { youtube: boolean; instagram: boolean; linkedin: boolean; news: boolean };
  onSelectWord: (word: string) => void;
  onSelectTopic: (topic: string) => void;
  onTogglePanel: (id: string, enabled: boolean) => void;
}

export function TrendingSidebar({
  trendingWords,
  recommendedTopics,
  panels,
  enabledPanels,
  enabledPlatforms,
  onSelectWord,
  onSelectTopic,
  onTogglePanel,
}: TrendingSidebarProps) {
  return (
    <motion.aside
      className="flex flex-col gap-4 w-72 xl:w-80 shrink-0"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Trending Words */}
      {trendingWords.length > 0 && (
        <motion.div variants={cardItemVariants}>
          <TrendingWordsWidget words={trendingWords} onSelectWord={onSelectWord} />
        </motion.div>
      )}

      {/* Recommended Topics */}
      {recommendedTopics.length > 0 && (
        <motion.div variants={cardItemVariants}>
          <RecommendationsPanel topics={recommendedTopics} onSelectTopic={onSelectTopic} />
        </motion.div>
      )}

      {/* Platform Toggles */}
      <motion.div variants={cardItemVariants} className="glass-panel rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Platforms</p>
        <PanelToggle panels={panels} enabled={enabledPanels} onToggle={onTogglePanel} />
        {/* Connection status dots */}
        <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-1.5">
          {(Object.entries(enabledPlatforms) as [string, boolean][]).map(([platform, connected]) => (
            <div key={platform} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-gray-300'}`} />
              <span className="text-[11px] text-muted capitalize">{platform}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.aside>
  );
}
